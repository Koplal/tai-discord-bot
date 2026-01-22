import type { Interaction } from 'discord.js';
import type { BotConfig } from '../types.js';
import { parseTaiCommand, type TaiCommandInteraction } from '../commands/tai.js';
import { collectContext } from '../services/context-collector.js';
import { sendAgentRequest } from '../services/agent-client.js';
import { formatResponse } from '../services/response-formatter.js';
import { checkRateLimit } from '../middleware/rate-limiter.js';
import { checkPermissions } from '../middleware/permissions.js';

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
    // Collect context from channel (if available)
    const context = interaction.channel
      ? await collectContext(interaction.channel, 10)
      : [];

    // Build enhanced prompt with options
    let enhancedPrompt = prompt;
    if (options.priority) {
      enhancedPrompt += ` [Priority: ${options.priority}]`;
    }

    // Send request to TAI backend
    const response = await sendAgentRequest(
      {
        content: enhancedPrompt,
        context: { messages: context },
        user: {
          discordId: interaction.user.id,
          username: interaction.user.username,
          roles: member?.roles.cache.map((r) => r.name) ?? [],
        },
        channel: {
          id: interaction.channelId,
          name: interaction.channel?.isDMBased() ? null : interaction.channel?.name ?? null,
        },
        guild: interaction.guild
          ? {
              id: interaction.guild.id,
              name: interaction.guild.name,
            }
          : undefined,
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
