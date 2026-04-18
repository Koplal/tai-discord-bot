/**
 * Tests for interactionCreate.ts — W5 slash attachment wiring.
 *
 * T27: /tai ask with image option → agent called with attachments.length === 1
 * T28: /tai ask without image option → agent called without attachments (text-only path)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMockAttachment, buildMockInteraction, buildMockTextChannel } from '../__fixtures__/discord.fixtures.js';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before dynamic imports
// ---------------------------------------------------------------------------

vi.mock('../services/agent.js', () => ({
  processAgentRequest: vi.fn().mockResolvedValue({
    content: 'Agent response',
    tokensUsed: 100,
    processingTimeMs: 200,
  }),
}));

vi.mock('../services/context-collector.js', () => ({
  collectContext: vi.fn().mockResolvedValue([]),
  collectThreadContext: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/response-formatter.js', () => ({
  formatResponse: vi.fn().mockReturnValue('Formatted response'),
}));

vi.mock('../middleware/rate-limiter.js', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100 }),
}));

vi.mock('../middleware/permissions.js', () => ({
  checkPermissions: vi.fn().mockReturnValue({ allowed: true, tier: 'free' }),
}));

// ---------------------------------------------------------------------------
// Dynamic imports (after mocks are registered)
// ---------------------------------------------------------------------------

const { handleInteractionCreate } = await import('./interactionCreate.js');
const { processAgentRequest } = await import('../services/agent.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConfig() {
  return {
    discordToken: 'token',
    discordClientId: 'clientId',
    discordGuildId: 'guildId',
    anthropicApiKey: 'anthropicKey',
    linearApiKey: 'linearKey',
    linearTeamId: 'teamId',
  };
}

// ---------------------------------------------------------------------------
// T27: /tai ask with image option → agent called with attachments.length === 1
// ---------------------------------------------------------------------------

describe('T27 slashAsk_withImageOption_forwardsAttachmentToAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards a valid image attachment to processAgentRequest', async () => {
    const attachment = buildMockAttachment({
      id: '100200300400500600',
      url: 'https://cdn.discordapp.com/attachments/1/2/photo.png?ex=abc&is=def&hm=xyz',
      contentType: 'image/png',
      size: 204800,
      spoiler: false,
    });

    const channel = buildMockTextChannel({ name: 'general' });

    const interaction = buildMockInteraction({
      subcommand: 'ask',
      getString: (name: string) => (name === 'prompt' ? 'what is this' : null),
      getAttachment: (name: string) => (name === 'image' ? attachment : null),
      channel: channel as unknown as import('discord.js').TextBasedChannel,
    });

    await handleInteractionCreate(interaction, buildConfig());

    expect(processAgentRequest).toHaveBeenCalledOnce();
    const [requestArg] = (processAgentRequest as ReturnType<typeof vi.fn>).mock.calls[0] as [import('../services/agent.js').AgentRequest, unknown];
    const attachments = requestArg.attachments;
    expect(attachments).toBeDefined();
    expect(attachments?.length).toBe(1);
    expect(attachments?.at(0)?.url).toBe(attachment.url);
    expect(requestArg.content).toBe('what is this');
  });
});

// ---------------------------------------------------------------------------
// T28: /tai ask without image option → agent called without attachments
// ---------------------------------------------------------------------------

describe('T28 slashAsk_withoutImageOption_stillWorks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls processAgentRequest with no attachments when no image provided', async () => {
    const channel = buildMockTextChannel({ name: 'general' });

    const interaction = buildMockInteraction({
      subcommand: 'ask',
      getString: (name: string) => (name === 'prompt' ? 'hi' : null),
      getAttachment: (_name: string) => null,
      channel: channel as unknown as import('discord.js').TextBasedChannel,
    });

    await handleInteractionCreate(interaction, buildConfig());

    expect(processAgentRequest).toHaveBeenCalledOnce();
    const [requestArg] = (processAgentRequest as ReturnType<typeof vi.fn>).mock.calls[0] as [import('../services/agent.js').AgentRequest, unknown];
    // attachments should be undefined or empty when no image
    const hasAttachments = requestArg.attachments !== undefined && requestArg.attachments.length > 0;
    expect(hasAttachments).toBe(false);
    expect(requestArg.content).toBe('hi');
  });
});
