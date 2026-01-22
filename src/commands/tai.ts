import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

/**
 * /tai slash command definition
 *
 * Usage:
 *   /tai ask <prompt>        - Ask TAI a question or request
 *   /tai create-issue <desc> - Create a Linear issue
 *   /tai query <sql>         - Query Supabase data (admin only)
 *   /tai search <query>      - Search Notion documentation
 */
export const taiCommand = new SlashCommandBuilder()
  .setName('tai')
  .setDescription('Interact with TAI - your AI assistant')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('ask')
      .setDescription('Ask TAI a question or make a request')
      .addStringOption((option) =>
        option
          .setName('prompt')
          .setDescription('What would you like TAI to help with?')
          .setRequired(true)
          .setMaxLength(2000)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create-issue')
      .setDescription('Create a Linear issue from your description')
      .addStringOption((option) =>
        option
          .setName('description')
          .setDescription('Describe the issue or feature request')
          .setRequired(true)
          .setMaxLength(2000)
      )
      .addStringOption((option) =>
        option
          .setName('priority')
          .setDescription('Issue priority')
          .setRequired(false)
          .addChoices(
            { name: 'Urgent', value: 'urgent' },
            { name: 'High', value: 'high' },
            { name: 'Normal', value: 'normal' },
            { name: 'Low', value: 'low' }
          )
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('query')
      .setDescription('Query Supabase data (admin only)')
      .addStringOption((option) =>
        option
          .setName('sql')
          .setDescription('SQL query to execute (read-only)')
          .setRequired(true)
          .setMaxLength(1000)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('search')
      .setDescription('Search Notion documentation')
      .addStringOption((option) =>
        option
          .setName('query')
          .setDescription('Search query')
          .setRequired(true)
          .setMaxLength(500)
      )
  );

/**
 * Type for the tai command interaction
 */
export type TaiCommandInteraction = ChatInputCommandInteraction & {
  commandName: 'tai';
};

/**
 * Get the subcommand and options from a /tai interaction
 */
export function parseTaiCommand(interaction: TaiCommandInteraction): {
  subcommand: string;
  prompt: string;
  options: Record<string, string | undefined>;
} {
  const subcommand = interaction.options.getSubcommand();

  let prompt = '';
  const options: Record<string, string | undefined> = {};

  switch (subcommand) {
    case 'ask':
      prompt = interaction.options.getString('prompt', true);
      break;
    case 'create-issue':
      prompt = `Create a Linear issue: ${interaction.options.getString('description', true)}`;
      options.priority = interaction.options.getString('priority') ?? undefined;
      break;
    case 'query':
      prompt = `Execute SQL query: ${interaction.options.getString('sql', true)}`;
      break;
    case 'search':
      prompt = `Search Notion for: ${interaction.options.getString('query', true)}`;
      break;
  }

  return { subcommand, prompt, options };
}
