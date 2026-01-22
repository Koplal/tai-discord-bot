import type { AgentResponse } from '../types.js';

/**
 * Maximum length for a single Discord message
 */
const DISCORD_MAX_LENGTH = 2000;

/**
 * Format agent response for Discord
 *
 * Handles:
 * - Markdown conversion
 * - Message length limits (2000 chars)
 * - Action result formatting
 */
export function formatResponse(response: AgentResponse): string {
  let content = response.content;

  // Add action results if present
  if (response.actions && response.actions.length > 0) {
    const actionSummary = response.actions
      .map((action) => {
        const icon = action.success ? '✅' : '❌';
        return `${icon} **${action.tool}**: ${action.result}`;
      })
      .join('\n');

    content = `${content}\n\n**Actions Taken:**\n${actionSummary}`;
  }

  // Truncate if too long
  if (content.length > DISCORD_MAX_LENGTH) {
    content = truncateMessage(content, DISCORD_MAX_LENGTH);
  }

  return content;
}

/**
 * Truncate a message to fit Discord's limit while preserving formatting
 */
function truncateMessage(content: string, maxLength: number): string {
  const ellipsis = '\n\n*...message truncated*';
  const targetLength = maxLength - ellipsis.length;

  // Try to break at a paragraph
  const paragraphBreak = content.lastIndexOf('\n\n', targetLength);
  if (paragraphBreak > targetLength * 0.7) {
    return content.slice(0, paragraphBreak) + ellipsis;
  }

  // Try to break at a sentence
  const sentenceBreak = content.lastIndexOf('. ', targetLength);
  if (sentenceBreak > targetLength * 0.7) {
    return content.slice(0, sentenceBreak + 1) + ellipsis;
  }

  // Try to break at a word
  const wordBreak = content.lastIndexOf(' ', targetLength);
  if (wordBreak > targetLength * 0.5) {
    return content.slice(0, wordBreak) + ellipsis;
  }

  // Hard truncate as last resort
  return content.slice(0, targetLength) + ellipsis;
}

/**
 * Split a long response into multiple Discord messages
 */
export function splitResponse(content: string, maxLength: number = DISCORD_MAX_LENGTH): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const messages: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining);
      break;
    }

    // Find a good break point
    let breakPoint = remaining.lastIndexOf('\n\n', maxLength);
    if (breakPoint < maxLength * 0.5) {
      breakPoint = remaining.lastIndexOf('\n', maxLength);
    }
    if (breakPoint < maxLength * 0.5) {
      breakPoint = remaining.lastIndexOf(' ', maxLength);
    }
    if (breakPoint < maxLength * 0.5) {
      breakPoint = maxLength;
    }

    messages.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return messages;
}

/**
 * Format a Linear issue creation result
 */
export function formatIssueCreated(
  identifier: string,
  title: string,
  url: string,
  priority?: string,
  labels?: string[]
): string {
  let message = `✅ Created **${identifier}**: "${title}"`;

  const metadata: string[] = [];
  if (priority) metadata.push(`Priority: ${priority}`);
  if (labels && labels.length > 0) metadata.push(`Labels: ${labels.join(', ')}`);

  if (metadata.length > 0) {
    message += `\n${metadata.join(' | ')}`;
  }

  message += `\n🔗 ${url}`;

  return message;
}

/**
 * Format a data query result
 */
export function formatQueryResult(
  description: string,
  data: Record<string, unknown>[] | Record<string, unknown>,
  rowCount?: number
): string {
  let message = `📊 **${description}**\n`;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      message += '\n*No results found*';
    } else {
      // Format as a simple list for small result sets
      if (data.length <= 5) {
        data.forEach((row, i) => {
          const values = Object.entries(row)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(', ');
          message += `\n${i + 1}. ${values}`;
        });
      } else {
        message += `\n*${rowCount ?? data.length} rows returned*`;
      }
    }
  } else {
    // Single object result
    Object.entries(data).forEach(([key, value]) => {
      message += `\n• **${key}**: ${String(value)}`;
    });
  }

  return message;
}
