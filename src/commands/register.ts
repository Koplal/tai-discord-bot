import { REST, Routes } from 'discord.js';
import { taiCommand } from './tai.js';
import { loadConfig } from '../types.js';

/**
 * Register slash commands with Discord
 *
 * Run this script once to register commands:
 *   pnpm register
 *
 * Commands are registered to a specific guild for faster updates during development.
 * For production, use Routes.applicationCommands() for global registration.
 */
async function registerCommands() {
  const config = loadConfig();

  const commands = [taiCommand.toJSON()];

  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  try {
    console.log(`Registering ${commands.length} slash command(s)...`);

    // Guild-specific registration (instant, for development)
    const data = await rest.put(
      Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
      { body: commands }
    );

    console.log(`Successfully registered ${(data as unknown[]).length} command(s).`);

    // Uncomment for global registration (takes ~1 hour to propagate)
    // const globalData = await rest.put(
    //   Routes.applicationCommands(config.discordClientId),
    //   { body: commands }
    // );
    // console.log(`Globally registered ${(globalData as unknown[]).length} command(s).`);
  } catch (error) {
    console.error('Failed to register commands:', error);
    process.exit(1);
  }
}

registerCommands();
