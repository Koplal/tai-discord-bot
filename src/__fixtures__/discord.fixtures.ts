/**
 * Discord.js test fixtures for COD-992 vision feature.
 *
 * These factories produce minimal Discord object shapes sufficient
 * for unit-testing event handlers and services. They do NOT hit
 * the Discord API or require a real bot token.
 */

import { Collection } from 'discord.js';
import type {
  Attachment,
  Message,
  ChatInputCommandInteraction,
  TextBasedChannel,
  User,
  Guild,
  GuildMember,
  MessageReaction,
  ReactionManager,
  Snowflake,
} from 'discord.js';

// ---------------------------------------------------------------------------
// Attachment
// ---------------------------------------------------------------------------

export interface MockAttachmentOverrides {
  id?: Snowflake;
  url?: string;
  proxyURL?: string;
  contentType?: string | null;
  size?: number;
  name?: string;
  spoiler?: boolean;
  height?: number | null;
  width?: number | null;
}

export function buildMockAttachment(overrides: MockAttachmentOverrides = {}): Attachment {
  return {
    id: overrides.id ?? '111222333444555666',
    url:
      overrides.url ??
      'https://cdn.discordapp.com/attachments/123/456/image.png?ex=abc&is=def&hm=xyz',
    proxyURL:
      overrides.proxyURL ??
      'https://media.discordapp.net/attachments/123/456/image.png',
    contentType: 'contentType' in overrides ? overrides.contentType : 'image/png',
    size: overrides.size ?? 204800,
    name: overrides.name ?? 'image.png',
    spoiler: overrides.spoiler ?? false,
    height: 'height' in overrides ? overrides.height : 512,
    width: 'width' in overrides ? overrides.width : 512,
    description: null,
    ephemeral: false,
    duration: null,
    flags: null,
    title: null,
    waveform: null,
  } as unknown as Attachment;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface MockUserOverrides {
  id?: Snowflake;
  username?: string;
  bot?: boolean;
  discriminator?: string;
  displayAvatarURL?: () => string;
}

function buildMockUser(overrides: MockUserOverrides = {}): User {
  return {
    id: overrides.id ?? '999888777666555444',
    username: overrides.username ?? 'testuser',
    bot: overrides.bot ?? false,
    discriminator: overrides.discriminator ?? '0',
    displayAvatarURL: overrides.displayAvatarURL ?? (() => 'https://cdn.discordapp.com/embed/avatars/0.png'),
    globalName: null,
    tag: `${overrides.username ?? 'testuser'}#0`,
  } as unknown as User;
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface MockMessageOverrides {
  id?: Snowflake;
  content?: string;
  author?: Partial<MockUserOverrides>;
  attachments?: Attachment[];
  channelId?: Snowflake;
  guildId?: Snowflake | null;
  createdAt?: Date;
  embeds?: unknown[];
  reference?: unknown | null;
}

export function buildMockMessage(overrides: MockMessageOverrides = {}): Message {
  const author = buildMockUser(overrides.author ?? {});
  const attachmentsArr = overrides.attachments ?? [];
  const attachmentCollection = new Collection<Snowflake, Attachment>(
    attachmentsArr.map((a) => [a.id, a])
  );

  const reactionsCache = new Collection<string, MessageReaction>();
  const reactionManager = {
    cache: reactionsCache,
  } as unknown as ReactionManager;

  return {
    id: overrides.id ?? '777888999000111222',
    content: overrides.content ?? 'Hello bot!',
    author,
    attachments: attachmentCollection,
    channelId: overrides.channelId ?? '333444555666777888',
    guildId: 'guildId' in overrides ? overrides.guildId : '111111111111111111',
    createdAt: overrides.createdAt ?? new Date('2026-04-18T12:00:00.000Z'),
    embeds: overrides.embeds ?? [],
    reference: 'reference' in overrides ? overrides.reference : null,
    reactions: reactionManager,
    mentions: {
      has: () => false,
    },
  } as unknown as Message;
}

// ---------------------------------------------------------------------------
// ChatInputCommandInteraction
// ---------------------------------------------------------------------------

export interface MockInteractionOverrides {
  commandName?: string;
  subcommand?: string;
  getString?: (name: string) => string | null;
  getAttachment?: (name: string) => Attachment | null;
  userId?: Snowflake;
  username?: string;
  guild?: Guild | null;
  channel?: TextBasedChannel | null;
  member?: GuildMember | null;
}

export function buildMockInteraction(
  overrides: MockInteractionOverrides = {}
): ChatInputCommandInteraction {
  const user = buildMockUser({ id: overrides.userId, username: overrides.username });

  const options = {
    getSubcommand: () => overrides.subcommand ?? 'ask',
    getString: overrides.getString ?? ((_name: string) => null),
    getAttachment: overrides.getAttachment ?? ((_name: string) => null),
  };

  return {
    commandName: overrides.commandName ?? 'tai',
    user,
    guild: 'guild' in overrides ? overrides.guild : null,
    channel: 'channel' in overrides ? overrides.channel : null,
    member: 'member' in overrides ? overrides.member : null,
    options,
    isChatInputCommand: () => true,
    reply: async () => undefined,
    deferReply: async () => undefined,
    editReply: async () => undefined,
  } as unknown as ChatInputCommandInteraction;
}

// ---------------------------------------------------------------------------
// TextBasedChannel with messages.fetch
// ---------------------------------------------------------------------------

export interface MockTextChannelOverrides {
  id?: Snowflake;
  name?: string;
  isThread?: boolean;
  messages?: Message[];
}

export function buildMockTextChannel(overrides: MockTextChannelOverrides = {}) {
  const messagesArr = overrides.messages ?? [];
  const messagesCollection = new Collection<Snowflake, Message>(
    messagesArr.map((m) => [m.id, m])
  );

  return {
    id: overrides.id ?? '444555666777888999',
    name: overrides.name ?? 'general',
    isThread: () => overrides.isThread ?? false,
    messages: {
      fetch: async (_options?: unknown) => messagesCollection,
    },
    type: 0, // GuildText
    sendTyping: async () => undefined,
  };
}
