import type { TextBasedChannel, Message, Collection } from 'discord.js';
import { messageToContext, type ContextMessage } from '../types.js';

/**
 * Collect recent messages from a channel for context
 *
 * @param channel - The Discord channel to collect from
 * @param limit - Maximum number of messages to collect (default: 10)
 * @returns Array of context messages, oldest first
 */
export async function collectContext(
  channel: TextBasedChannel,
  limit: number = 10
): Promise<ContextMessage[]> {
  try {
    // Fetch recent messages
    const messages: Collection<string, Message> = await channel.messages.fetch({ limit });

    // Convert to context format and reverse (oldest first)
    const contextMessages = messages
      .map((msg) => messageToContext(msg))
      .reverse();

    return contextMessages;
  } catch (error) {
    console.error('Failed to collect context:', error);
    return [];
  }
}

/**
 * Collect context from a thread, including parent channel context
 */
export async function collectThreadContext(
  channel: TextBasedChannel,
  limit: number = 10
): Promise<ContextMessage[]> {
  const messages = await collectContext(channel, limit);

  // If this is a thread, try to get parent channel context
  if ('parent' in channel && channel.parent) {
    try {
      const parentMessages = await collectContext(channel.parent as TextBasedChannel, 5);
      return [...parentMessages, ...messages];
    } catch {
      // Parent channel access might be restricted
      return messages;
    }
  }

  return messages;
}

/**
 * Summarize context for large message histories
 * (Future enhancement: use Claude to summarize if context is too long)
 */
export function summarizeContext(messages: ContextMessage[], maxTokens: number = 4000): ContextMessage[] {
  // Simple implementation: just truncate for now
  // TODO: Implement Claude-based summarization for large contexts
  const estimatedTokensPerMessage = 100;
  const maxMessages = Math.floor(maxTokens / estimatedTokensPerMessage);

  if (messages.length <= maxMessages) {
    return messages;
  }

  // Keep most recent messages
  return messages.slice(-maxMessages);
}

/**
 * Collect context from a reply chain, including the referenced message
 */
export async function collectReplyContext(
  message: Message,
  limit: number = 10
): Promise<ContextMessage[]> {
  const replyChain: ContextMessage[] = [];

  try {
    // Walk up the reply chain (max 5 levels)
    let current: Message | null = message;
    let depth = 0;
    while (current?.reference && depth < 5) {
      try {
        const referenced = await current.channel.messages.fetch(current.reference.messageId!);
        replyChain.unshift(messageToContext(referenced));
        current = referenced;
        depth++;
      } catch {
        break;
      }
    }
  } catch {
    // Fall through to channel context
  }

  // Also get recent channel context
  const channelContext = await collectContext(message.channel, limit);

  // Merge: reply chain first (deduped), then channel context
  const seenTimestamps = new Set(replyChain.map((m) => m.timestamp));
  const deduped = channelContext.filter((m) => !seenTimestamps.has(m.timestamp));

  return [...replyChain, ...deduped];
}
