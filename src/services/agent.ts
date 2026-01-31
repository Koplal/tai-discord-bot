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
  getLinearIssue,
  listLinearIssues,
  updateLinearIssue,
  addLinearComment,
  getLinearStatuses,
  getLinearUsers,
  getLinearLabels,
  getLinearProjects,
  getLinearCycles,
  findLinearUser,
  findLinearLabel,
  findLinearProject,
  formatIssueForDiscord,
  formatIssueDetailedForDiscord,
  formatCycleForDiscord,
  listIssueComments,
  formatCommentsForDiscord,
} from './linear-client.js';

const SYSTEM_PROMPT = `You are TAI Bot, an AI assistant for the Transformational AI team on Discord.

You have the following tools available:
- create_linear_issue: Create new Linear issues
- search_linear_issues: Search for issues by keywords
- get_linear_issue: Get details of a specific issue by identifier (e.g., COD-379), includes recent comments
- list_linear_issues: List recent issues, optionally filtered by status
- update_linear_issue: Update an issue's status, priority, assignee, labels, project, title, or description
- add_linear_comment: Add a comment to an issue
- list_issue_comments: Read comments/discussion on an issue
- list_linear_users: List team members who can be assigned to issues
- list_linear_labels: List available labels
- list_linear_projects: List available projects
- list_linear_cycles: List current and upcoming sprint cycles

IMPORTANT: You CAN update issues. Use the update_linear_issue tool to change:
- status: backlog, todo, in_progress, done, canceled
- priority: urgent, high, normal, low
- assignee: Use team member names like "Justin", "Rod"
- labels: Array of label names like ["Bug", "Feature"] - these are ADDED to existing labels
- project: Project name like "TAI v1"
- title/description: Update text content
- estimate: T-shirt size (XS=1, S=2, M=3, L=5, XL=8)

Estimates use T-SHIRT SIZES:
- XS (1 point): < 2 hours, trivial changes
- S (2 points): Half day, simple fixes
- M (3 points): 1 day, new endpoint or component
- L (5 points): 2-3 days, multi-file feature
- XL (8 points): ~1 week, break down before sprint

Note: Labels are ADDITIVE - new labels are added without removing existing ones.
When assigning users or setting labels/projects, use the list_ tools first if you need to see available options.
Use full names when possible to avoid ambiguous matches.

Discord context awareness:
- You can read message history from the current channel or thread
- In threads, you receive both the thread messages and parent channel context
- When someone replies to a message, you see the full reply chain (up to 5 levels)
- You can be invoked via @TAIBot mention or /tai slash command
- Users interact in channels, threads, and DMs — adapt your responses to the context

Guidelines:
- Be concise - Discord has a 2000 character limit
- Use markdown formatting (bold, code blocks, lists)
- When creating issues, extract a clear title and detailed description
- For issue lookups, use the identifier format (e.g., COD-379)
- When updating issues, confirm what was changed
- Always try to use your tools when the user asks for Linear operations
- If a user asks about a conversation or discussion, you already have channel/thread context — reference it directly
- When users discuss a Linear ticket in a thread, proactively use get_linear_issue or list_issue_comments to provide relevant details

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
      description: 'Search for existing Linear issues by keywords. Use to find related issues or check for duplicates.',
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
    {
      name: 'get_linear_issue',
      description: 'Get detailed information about a specific Linear issue by its identifier (e.g., COD-379).',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Issue identifier like COD-379',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'list_linear_issues',
      description: 'List recent Linear issues, optionally filtered by status. Use to see what the team is working on.',
      input_schema: {
        type: 'object' as const,
        properties: {
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done', 'canceled'],
            description: 'Filter by status (optional)',
          },
          limit: {
            type: 'number',
            description: 'Maximum results (default 10, max 25)',
          },
        },
        required: [],
      },
    },
    {
      name: 'update_linear_issue',
      description: 'Update an existing Linear issue. Can change status, priority, assignee, labels, project, title, or description.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Issue identifier like COD-379',
          },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done', 'canceled'],
            description: 'New status for the issue',
          },
          priority: {
            type: 'string',
            enum: ['urgent', 'high', 'normal', 'low'],
            description: 'New priority for the issue',
          },
          assignee: {
            type: 'string',
            description: 'Name of the user to assign (e.g., "Justin", "Rod")',
          },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Label names to ADD to the issue (additive, does not remove existing labels)',
          },
          project: {
            type: 'string',
            description: 'Project name to add the issue to (e.g., "TAI v1")',
          },
          title: {
            type: 'string',
            description: 'New title for the issue',
          },
          description: {
            type: 'string',
            description: 'New description for the issue',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'add_linear_comment',
      description: 'Add a comment to a Linear issue. Use to provide updates or feedback on an issue.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Issue identifier like COD-379',
          },
          comment: {
            type: 'string',
            description: 'Comment text in markdown',
          },
        },
        required: ['identifier', 'comment'],
      },
    },
    {
      name: 'list_issue_comments',
      description: 'List comments and discussion on a Linear issue. Use to read what people have discussed on a ticket.',
      input_schema: {
        type: 'object' as const,
        properties: {
          identifier: {
            type: 'string',
            description: 'Issue identifier like COD-379',
          },
          limit: {
            type: 'number',
            description: 'Maximum comments to return (default 25)',
          },
        },
        required: ['identifier'],
      },
    },
    {
      name: 'list_linear_users',
      description: 'List team members who can be assigned to issues.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'list_linear_labels',
      description: 'List available labels that can be applied to issues.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'list_linear_projects',
      description: 'List projects that issues can be added to.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'list_linear_cycles',
      description: 'List sprint cycles. Shows current and upcoming cycles with dates.',
      input_schema: {
        type: 'object' as const,
        properties: {
          filter: {
            type: 'string',
            enum: ['current', 'future', 'all'],
            description: 'Filter cycles: current (active now), future (upcoming), or all',
          },
        },
        required: [],
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

    case 'get_linear_issue': {
      const { identifier } = toolInput as { identifier: string };

      const result = await getLinearIssue(config.linearApiKey, config.linearTeamId, identifier);

      if (result.success && result.issue) {
        return {
          result: formatIssueDetailedForDiscord(result.issue),
          success: true,
        };
      }

      return {
        result: `❌ Issue not found: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'list_linear_issues': {
      const { status, limit } = toolInput as {
        status?: string;
        limit?: number;
      };

      const result = await listLinearIssues(config.linearApiKey, config.linearTeamId, {
        status,
        limit: Math.min(limit ?? 10, 25),
      });

      if (result.success && result.issues) {
        if (result.issues.length === 0) {
          return {
            result: status ? `No ${status} issues found` : 'No issues found',
            success: true,
          };
        }

        const issueList = result.issues.map(formatIssueForDiscord).join('\n\n');
        const header = status ? `${status.replace('_', ' ')} issues` : 'Recent issues';
        return {
          result: `**${header}** (${result.issues.length}):\n\n${issueList}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to list issues: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'update_linear_issue': {
      const { identifier, status, priority, assignee, labels, project, title, description } = toolInput as {
        identifier: string;
        status?: string;
        priority?: 'urgent' | 'high' | 'normal' | 'low';
        assignee?: string;
        labels?: string[];
        project?: string;
        title?: string;
        description?: string;
      };

      // First get the issue to get its ID and existing labels
      const issueResult = await getLinearIssue(config.linearApiKey, config.linearTeamId, identifier);
      if (!issueResult.success || !issueResult.issue) {
        return {
          result: `❌ Issue not found: ${identifier}`,
          success: false,
        };
      }

      // Collect all resolution errors before failing
      const resolutionErrors: string[] = [];

      // If status is being changed, get the status ID
      let stateId: string | undefined;
      if (status) {
        const statusesResult = await getLinearStatuses(config.linearApiKey, config.linearTeamId);
        if (statusesResult.success && statusesResult.statuses) {
          const statusMap: Record<string, string> = {
            backlog: 'Backlog',
            todo: 'Todo',
            in_progress: 'In Progress',
            done: 'Done',
            canceled: 'Canceled',
          };
          const targetStatus = statusMap[status] ?? status;
          const foundStatus = statusesResult.statuses.find(
            (s) => s.name.toLowerCase() === targetStatus.toLowerCase()
          );
          if (foundStatus) {
            stateId = foundStatus.id;
          } else {
            resolutionErrors.push(`Status not found: ${status}`);
          }
        }
      }

      // Resolve assignee name to ID
      let assigneeId: string | undefined;
      if (assignee) {
        const userResult = await findLinearUser(config.linearApiKey, config.linearTeamId, assignee);
        if (userResult.success && userResult.user) {
          assigneeId = userResult.user.id;
        } else {
          resolutionErrors.push(userResult.error ?? `User not found: ${assignee}`);
        }
      }

      // Resolve label names to IDs (ADDITIVE - merge with existing labels)
      let labelIds: string[] | undefined;
      if (labels && labels.length > 0) {
        // Start with existing label IDs from the issue (now included in query)
        const existingLabelIds = new Set<string>(
          issueResult.issue.labels.nodes.map((l) => l.id)
        );

        // Add new labels
        const labelErrors: string[] = [];
        for (const labelName of labels) {
          const labelResult = await findLinearLabel(config.linearApiKey, config.linearTeamId, labelName);
          if (labelResult.success && labelResult.label) {
            existingLabelIds.add(labelResult.label.id);
          } else {
            labelErrors.push(labelResult.error ?? `Label not found: ${labelName}`);
          }
        }

        if (labelErrors.length > 0) {
          resolutionErrors.push(...labelErrors);
        }

        labelIds = Array.from(existingLabelIds);
      }

      // Resolve project name to ID
      let projectId: string | undefined;
      if (project) {
        const projectResult = await findLinearProject(config.linearApiKey, config.linearTeamId, project);
        if (projectResult.success && projectResult.project) {
          projectId = projectResult.project.id;
        } else {
          resolutionErrors.push(projectResult.error ?? `Project not found: ${project}`);
        }
      }

      // If any resolution errors, return them all
      if (resolutionErrors.length > 0) {
        return {
          result: `❌ Resolution errors:\n${resolutionErrors.map((e) => `• ${e}`).join('\n')}`,
          success: false,
        };
      }

      const result = await updateLinearIssue(config.linearApiKey, issueResult.issue.id, {
        stateId,
        priority,
        assigneeId,
        labelIds,
        projectId,
        title,
        description,
      });

      if (result.success && result.issue) {
        const changes: string[] = [];
        if (status) changes.push(`status → ${status}`);
        if (priority) changes.push(`priority → ${priority}`);
        if (assignee) changes.push(`assignee → ${assignee}`);
        if (labels) changes.push(`labels added: ${labels.join(', ')}`);
        if (project) changes.push(`project → ${project}`);
        if (title) changes.push(`title updated`);
        if (description) changes.push(`description updated`);

        return {
          result: `✅ Updated **${identifier}**:\n${changes.join(', ')}\n\n${formatIssueForDiscord(result.issue)}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to update issue: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'add_linear_comment': {
      const { identifier, comment } = toolInput as {
        identifier: string;
        comment: string;
      };

      // First get the issue to get its ID
      const issueResult = await getLinearIssue(config.linearApiKey, config.linearTeamId, identifier);
      if (!issueResult.success || !issueResult.issue) {
        return {
          result: `❌ Issue not found: ${identifier}`,
          success: false,
        };
      }

      const result = await addLinearComment(config.linearApiKey, issueResult.issue.id, comment);

      if (result.success && result.comment) {
        return {
          result: `✅ Comment added to **${identifier}** by ${result.comment.user.name}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to add comment: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'list_issue_comments': {
      const { identifier, limit } = toolInput as { identifier: string; limit?: number };

      const result = await listIssueComments(
        config.linearApiKey,
        config.linearTeamId,
        identifier,
        Math.min(limit ?? 25, 50)
      );

      if (result.success && result.comments) {
        if (result.comments.length === 0) {
          return { result: `No comments on **${identifier}**`, success: true };
        }

        const formatted = formatCommentsForDiscord(result.comments);
        return {
          result: `**Comments on ${identifier}** (${result.comments.length}):\n\n${formatted}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to get comments: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'list_linear_users': {
      const result = await getLinearUsers(config.linearApiKey, config.linearTeamId);

      if (result.success && result.users) {
        if (result.users.length === 0) {
          return {
            result: 'No team members found',
            success: true,
          };
        }

        const userList = result.users
          .map((u) => `• **${u.name}** (${u.displayName || u.email})`)
          .join('\n');
        return {
          result: `**Team Members** (${result.users.length}):\n\n${userList}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to list users: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'list_linear_labels': {
      const result = await getLinearLabels(config.linearApiKey, config.linearTeamId);

      if (result.success && result.labels) {
        if (result.labels.length === 0) {
          return {
            result: 'No labels found',
            success: true,
          };
        }

        const labelList = result.labels.map((l) => `• **${l.name}**`).join('\n');
        return {
          result: `**Available Labels** (${result.labels.length}):\n\n${labelList}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to list labels: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'list_linear_projects': {
      const result = await getLinearProjects(config.linearApiKey, config.linearTeamId);

      if (result.success && result.projects) {
        if (result.projects.length === 0) {
          return {
            result: 'No projects found',
            success: true,
          };
        }

        const projectList = result.projects
          .map((p) => `• **${p.name}** (${p.state})`)
          .join('\n');
        return {
          result: `**Projects** (${result.projects.length}):\n\n${projectList}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to list projects: ${result.error ?? 'Unknown error'}`,
        success: false,
      };
    }

    case 'list_linear_cycles': {
      const { filter } = toolInput as { filter?: 'current' | 'future' | 'all' };
      const result = await getLinearCycles(config.linearApiKey, config.linearTeamId, filter ?? 'all');

      if (result.success && result.cycles) {
        if (result.cycles.length === 0) {
          return {
            result: filter === 'current' ? 'No active cycle' : 'No cycles found',
            success: true,
          };
        }

        const cycleList = result.cycles.map(formatCycleForDiscord).join('\n\n');
        const header = filter === 'current' ? 'Current Cycle' : filter === 'future' ? 'Upcoming Cycles' : 'Cycles';
        return {
          result: `**${header}** (${result.cycles.length}):\n\n${cycleList}`,
          success: true,
        };
      }

      return {
        result: `❌ Failed to list cycles: ${result.error ?? 'Unknown error'}`,
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

  // Add context (last 10 messages), filtering out empty content
  // (Anthropic API requires all messages to have non-empty content)
  for (const ctx of request.context.slice(-10)) {
    if (!ctx.content || ctx.content.trim() === '') {
      continue;
    }
    messages.push({
      role: ctx.role === 'user' ? 'user' : 'assistant',
      content: ctx.content,
    });
  }

  // Validate request content is not empty
  if (!request.content || request.content.trim() === '') {
    return {
      content: 'Please provide a message.',
      tokensUsed: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Add current message
  messages.push({
    role: 'user',
    content: request.content,
  });

  const tools = getTools(request.tier);
  console.log(`[Agent] User tier: ${request.tier}, Tools available: ${tools.map(t => t.name).join(', ') || 'none'}`);

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
