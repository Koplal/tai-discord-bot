import type { Client } from 'discord.js';
import type { BotConfig } from '../types.js';

/**
 * Handle the 'ready' event when the bot connects to Discord
 */
export function handleReady(client: Client<true>, config: BotConfig): void {
  console.log(`✅ TAI Bot is online as ${client.user.tag}`);
  console.log(`📍 Guild ID: ${config.discordGuildId}`);
  console.log(`🔗 API URL: ${config.taiApiUrl}`);
  console.log(`🤖 Commands: /tai ask, /tai create-issue, /tai query, /tai search`);
  console.log(`💬 Mention: @${client.user.username} for conversational requests`);

  // Set bot activity status
  client.user.setActivity('for @TAIBot mentions', { type: 3 }); // "Watching for @TAIBot mentions"
}
