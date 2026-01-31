import { ChannelType, type Interaction, type TextBasedChannel } from 'discord.js';
import type { BotConfig } from '../types.js';
import { parseTaiCommand, type TaiCommandInteraction } from '../commands/tai.js';
import { collectContext, collectThreadContext } from '../services/context-collector.js';
import { processAgentRequest } from '../services/agent.js';
import { formatResponse } from '../services/response-formatter.js';
import { checkRateLimit } from '../middleware/rate-limiter.js';
import { checkPermissions } from '../middleware/permissions.js';

/**
 * Get channel name safely (returns null for DMs)
 */
function getChannelName(channel: TextBasedChannel | null): string | null {
  if (!channel) return null;
  if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM) {
    return null;
  }
  return 'name' in channel ? channel.name : null;
}

/**
 * Handle slash command interactions
 */
export async function handleInteractionCreate(
  interaction: Interaction,
  config: BotConfig
): Promise<void> {
  // Only handle chat input commands
  if (!interaction.isChatInputCommand()) return;

  // Only handle /tai command
  if (interaction.commandName !== 'tai') return;

  const taiInteraction = interaction as TaiCommandInteraction;
  const { subcommand, prompt, options } = parseTaiCommand(taiInteraction);

  // Determine required feature based on subcommand
  const featureMap: Record<string, string> = {
    ask: 'basic_chat',
    'create-issue': 'linear_access',
    query: 'supabase_query',
    search: 'notion_search',
  };
  const requiredFeature = featureMap[subcommand] ?? 'basic_chat';

  // Check permissions
  const member = interaction.guild
    ? await interaction.guild.members.fetch(interaction.user.id)
    : null;
  const permissionCheck = checkPermissions(member, requiredFeature);
  if (!permissionCheck.allowed) {
    await interaction.reply({
      content: `❌ ${permissionCheck.reason}`,
      ephemeral: true,
    });
    return;
  }

  // Check rate limit
  const rateLimitCheck = await checkRateLimit(interaction.user.id, permissionCheck.tier);
  if (!rateLimitCheck.allowed) {
    await interaction.reply({
      content: `⏳ Rate limit reached. Remaining: ${rateLimitCheck.remaining}. ${rateLimitCheck.resetAt ? `Resets at ${rateLimitCheck.resetAt.toLocaleTimeString()}` : ''}`,
      ephemeral: true,
    });
    return;
  }

  // Defer reply (allows up to 15 minutes for processing)
  await interaction.deferReply();

  try {
    // Collect context: use thread context for threads, otherwise channel context
    let context;
    if (interaction.channel?.isThread()) {
      context = await collectThreadContext(interaction.channel, 10);
    } else if (interaction.channel) {
      context = await collectContext(interaction.channel, 10);
    } else {
      context = [];
    }

    // Build enhanced prompt with options
    let enhancedPrompt = prompt;
    if (options.priority) {
      enhancedPrompt += ` [Priority: ${options.priority}]`;
    }

    // Process request with Claude agent directly
    const response = await processAgentRequest(
      {
        content: enhancedPrompt,
        context,
        username: interaction.user.username,
        channel: getChannelName(interaction.channel) ?? 'DM',
        tier: permissionCheck.tier,
      },
      config
    );

    // Format and send response
    const formattedResponse = formatResponse(response);
    await interaction.editReply(formattedResponse);
  } catch (error) {
    console.error('Error handling interaction:', error);

    // Send user-friendly error message
    await interaction.editReply(
      '❌ Sorry, I encountered an error processing your request. Please try again later.'
    );
  }
}
