import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { loadConfig } from './types.js';
import { handleReady } from './events/ready.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { handleInteractionCreate } from './events/interactionCreate.js';

// Load and validate configuration
const config = loadConfig();

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Privileged intent for @mentions
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,  // Required for DM support
    Partials.Message,  // Receive uncached messages in threads/replies
    Partials.ThreadMember, // Thread membership events
  ],
});

// Register event handlers
client.once(Events.ClientReady, (readyClient) => handleReady(readyClient, config));
client.on('messageCreate', (message) => handleMessageCreate(message, client, config));
client.on('interactionCreate', (interaction) => handleInteractionCreate(interaction, config));

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
console.log('Starting TAI Discord Bot...');
client.login(config.discordToken);
