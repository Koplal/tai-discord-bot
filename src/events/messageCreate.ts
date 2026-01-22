import { ChannelType, type Client, type Message } from 'discord.js';
import type { BotConfig } from '../types.js';
import { collectContext } from '../services/context-collector.js';
import { sendAgentRequest } from '../services/agent-client.js';
import { formatResponse } from '../services/response-formatter.js';
import { checkRateLimit } from '../middleware/rate-limiter.js';
import { checkPermissions } from '../middleware/permissions.js';

/**
 * Get channel name safely (returns null for DMs)
 */
function getChannelName(channel: Message['channel']): string | null {
  if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM) {
    return null;
  }
  return 'name' in channel ? channel.name : null;
}

/**
 * Handle @TAIBot mentions in messages
 */
export async function handleMessageCreate(
  message: Message,
  client: Client,
  config: BotConfig
): Promise<void> {
  // Ignore messages from bots (including self)
  if (message.author.bot) return;

  // Check if the bot was mentioned
  if (!message.mentions.has(client.user!.id)) return;

  // Remove the mention from the content to get the actual prompt
  const prompt = message.content
    .replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '')
    .trim();

  // Ignore empty mentions
  if (!prompt) {
    await message.reply('👋 Hi! You can ask me anything. Try: `@TAIBot help me create a bug ticket`');
    return;
  }

  // Check permissions
  const member = message.guild ? await message.guild.members.fetch(message.author.id) : null;
  const permissionCheck = checkPermissions(member, 'basic_chat');
  if (!permissionCheck.allowed) {
    await message.reply(`❌ ${permissionCheck.reason}`);
    return;
  }

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(message.author.id, permissionCheck.tier);
  if (!rateLimitCheck.allowed) {
    await message.reply(
      `⏳ Rate limit reached. Please wait ${rateLimitCheck.resetAt ? `until ${rateLimitCheck.resetAt.toLocaleTimeString()}` : 'a moment'} before trying again.`
    );
    return;
  }

  // Show typing indicator (not available on all channel types)
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }

  // Send thinking reaction
  await message.react('🤔');

  try {
    // Collect context from recent messages
    const context = await collectContext(message.channel, 10);

    // Send request to TAI backend
    const response = await sendAgentRequest(
      {
        content: prompt,
        context: { messages: context },
        user: {
          discordId: message.author.id,
          username: message.author.username,
          roles: member?.roles.cache.map((r) => r.name) ?? [],
        },
        channel: {
          id: message.channel.id,
          name: getChannelName(message.channel),
        },
        guild: message.guild
          ? {
              id: message.guild.id,
              name: message.guild.name,
            }
          : undefined,
      },
      config
    );

    // Remove thinking reaction
    await message.reactions.cache.get('🤔')?.users.remove(client.user!.id);

    // Format and send response
    const formattedResponse = formatResponse(response);
    await message.reply(formattedResponse);

    // Add success reaction
    await message.react('✅');
  } catch (error) {
    console.error('Error handling message:', error);

    // Remove thinking reaction
    await message.reactions.cache.get('🤔')?.users.remove(client.user!.id);

    // Add error reaction
    await message.react('❌');

    // Send user-friendly error message
    await message.reply(
      '❌ Sorry, I encountered an error processing your request. Please try again later.'
    );
  }
}
