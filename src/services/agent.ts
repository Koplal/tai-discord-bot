/**
 * Claude Agent Service
 *
 * Processes requests using Claude with Linear tools.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { BotConfig, ContextMessage, UserTier } from '../types.js';
import {
  createLinearIssue,
  searchLinearIssues,
  formatIssueForDiscord,
} from './linear-client.js';

const SYSTEM_PROMPT = `You are TAI Bot, an AI assistant for the Transformational AI team on Discord.

Your capabilities:
- Answer questions about the TAI project
- Create Linear issues from natural language descriptions
- Search existing Linear issues

Guidelines:
- Be concise - Discord has a 2000 character limit
- Use markdown formatting (bold, code blocks, lists)
- When creating Linear issues, extract a clear title and detailed description
- For searches, summarize results clearly
- If you can't help with something, explain why

Current user: {username}
Channel: {channel}`;

export interface AgentRequest {
  content: string;
  context: ContextMessage[];
  username: string;
  channel: string;
  tier: UserTier;
}

export interface AgentResponse {
  content: string;
  tokensUsed: number;
  processingTimeMs: number;
}

/**
 * Get tools based on user tier
 */
function getTools(tier: UserTier): Anthropic.Tool[] {
  // Only premium+ users get Linear tools
  if (tier === 'free') {
    return [];
  }

  return [
    {
      name: 'create_linear_issue',
      description: 'Create a new issue in Linear. Use when user wants to create a ticket, report a bug, or request a feature.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: {
            type: 'string',
            description: 'Issue title - concise and descriptive',
          },
          description: {
            type: 'string',
            description: 'Issue description in markdown',
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'normal', 'low'],
            description: 'Issue priority - only set if user explicitly mentions urgency',
          },
        },
        required: ['title', 'description'],
      },
    },
    {
      name: 'search_linear_issues',
      description: 'Search for existing Linear issues. Use to find related issues or check status.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Search query - keywords to match in title or description',
          },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done', 'canceled'],
            description: 'Filter by status (optional)',
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default 5, max 10)',
          },
        },
        required: ['query'],
      },
    },
  ];
}

/**
 * Execute a tool call
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  config: BotConfig
): Promise<{ result: string; success: boolean }> {
  switch (toolName) {
    case 'create_linear_issue': {
      const { title, description, priority } = toolInput as {
        title: string;
        description: string;
        priority?: 'urgent' | 'high' | 'normal' | 'low';
      };

      const result = await createLinearIssue(config.linearApiKey, config.linearTeamId, {
        title,
        description,
        priority,
      });

      if (result.success && result.issue) {
        return {
          result: `✅ Created issue:\n${formatIssueForDiscord(result.issue)}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to create issue: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'search_linear_issues': {
      const { query, status, limit } = toolInput as {
        query: string;
        status?: string;
        limit?: number;
      };

      const result = await searchLinearIssues(config.linearApiKey, config.linearTeamId, {
        query,
        status,
        limit: Math.min(limit ?? 5, 10),
      });

      if (result.success && result.issues) {
        if (result.issues.length === 0) {
          return {
            result: `No issues found matching "${query}"`,
            success: true,
          };
        }

        const issueList = result.issues.map(formatIssueForDiscord).join('\n\n');
        return {
          result: `Found ${result.issues.length} issue(s):\n\n${issueList}`,
          success: true,
        };
      }

      return {
        result: `❌ Search failed: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    default:
      return {
        result: `Unknown tool: ${toolName}`,
        success: false,
      };
  }
}

/**
 * Process a request with Claude
 */
export async function processAgentRequest(
  request: AgentRequest,
  config: BotConfig
): Promise<AgentResponse> {
  const startTime = Date.now();
  let totalTokens = 0;

  const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey,
  });

  const systemPrompt = SYSTEM_PROMPT
    .replace('{username}', request.username)
    .replace('{channel}', request.channel);

  // Build messages
  const messages: Anthropic.MessageParam[] = [];

  // Add context (last 10 messages)
  for (const ctx of request.context.slice(-10)) {
    messages.push({
      role: ctx.role === 'user' ? 'user' : 'assistant',
      content: ctx.content,
    });
  }

  // Add current message
  messages.push({
    role: 'user',
    content: request.content,
  });

  const tools = getTools(request.tier);

  try {
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    totalTokens += response.usage.input_tokens + response.usage.output_tokens;

    // Handle tool use loop (max 5 iterations)
    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 5) {
      iterations++;

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const { result, success } = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          config
        );

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
          is_error: !success,
        });
      }

      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: toolResults,
      });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });

      totalTokens += response.usage.input_tokens + response.usage.output_tokens;
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    return {
      content: textBlock?.text ?? 'I processed your request but have no response.',
      tokensUsed: totalTokens,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Agent error:', error);

    return {
      content: 'Sorry, I encountered an error processing your request. Please try again.',
      tokensUsed: totalTokens,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
