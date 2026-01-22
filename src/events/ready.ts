import type { Client } from 'discord.js';
import type { BotConfig } from '../types.js';

/**
 * Handle the 'ready' event when the bot connects to Discord
 */
export function handleReady(client: Client<true>, config: BotConfig): void {
  console.log(`✅ TAI Bot is online as ${client.user.tag}`);
  console.log(`📍 Guild ID: ${config.discordGuildId}`);
  console.log(`🔗 Linear Team: ${config.linearTeamId}`);
  console.log(`🤖 Commands: /tai ask, /tai create-issue`);
  console.log(`💬 Mention: @${client.user.username} for conversational requests`);

  // Set bot activity status
  client.user.setActivity('for @TAIBot mentions', { type: 3 }); // "Watching for @TAIBot mentions"
}
