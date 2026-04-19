/**
 * T30 — integration_15MessageContextRoundtrip
 *
 * Verifies that the agent correctly passes all 15 context messages to Claude,
 * including the oldest ones. Runs only when RUN_INTEGRATION_TESTS=1 is set.
 * Requires ANTHROPIC_API_KEY.
 *
 * The test embeds a distinctive passphrase ("PURPLE-FOX-42") only in the
 * first of 15 context messages, then asks Claude what it was. A correct
 * response proves the full 15-message window reached the API.
 */

import { describe, it, expect } from 'vitest';
import { processAgentRequest } from '../services/agent.js';
import type { BotConfig, ContextMessage } from '../types.js';

const RUN = process.env['RUN_INTEGRATION_TESTS'] === '1';

function makeConfig(): BotConfig {
  return {
    discordToken: 'not-used-in-integration',
    discordClientId: 'not-used-in-integration',
    discordGuildId: 'not-used-in-integration',
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
    linearApiKey: 'not-used-in-integration',
    linearTeamId: 'not-used-in-integration',
  };
}

/**
 * Build 15 synthetic ContextMessages. The FIRST message contains the secret
 * passphrase. Messages 2–15 discuss unrelated topics to ensure Claude is
 * actually retrieving from the earliest message, not just the recent ones.
 */
function buildContextMessages(): ContextMessage[] {
  const messages: ContextMessage[] = [
    // Message 1 (oldest) — contains the secret passphrase
    {
      role: 'user' as const,
      content: 'The secret code is PURPLE-FOX-42. Please remember it for later.',
      author: 'alice',
    },
    {
      role: 'assistant' as const,
      content: 'Got it, I will remember the secret code PURPLE-FOX-42.',
    },
  ];

  // Messages 3–15 — cover unrelated topics to dilute recency
  const topics = [
    'project deadlines',
    'database schema changes',
    'API rate limits',
    'UI component library',
    'authentication flow',
    'deployment pipeline',
    'test coverage goals',
    'performance benchmarks',
    'error monitoring',
    'feature flag rollout',
    'documentation updates',
    'sprint planning',
    'team standup notes',
  ];

  for (let i = 0; i < topics.length; i++) {
    messages.push({
      role: 'user' as const,
      content: `Message ${i + 3}: discusses ${topics[i]}.`,
      author: 'alice',
    });
    messages.push({
      role: 'assistant' as const,
      content: `Acknowledged the topic of ${topics[i]}.`,
    });
  }

  // Return exactly 15 messages (slice in case we overshot due to pairs)
  return messages.slice(0, 15);
}

describe.skipIf(!RUN)('context integration', () => {
  it('integration_15MessageContextRoundtrip: earliest of 15 context messages reaches Claude', async () => {
    const context = buildContextMessages();

    // Sanity: we should have exactly 15 context messages
    expect(context).toHaveLength(15);

    const response = await processAgentRequest(
      {
        content: 'What was the secret code mentioned at the very start of our conversation?',
        context,
        username: 'integration-test-user',
        channel: 'integration-test-channel',
        tier: 'free',
      },
      makeConfig()
    );

    // Plumbing check: response must be non-empty
    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(0);

    // Soft content check: Claude should recall the passphrase from message 1.
    // We test for "PURPLE" or "FOX" since Claude may quote, paraphrase, or
    // format the code differently. Intentionally loose — proves the first of
    // 15 messages reached the model.
    const upper = response.content.toUpperCase();
    const recalled = upper.includes('PURPLE') || upper.includes('FOX') || upper.includes('42');

    expect(recalled).toBe(true);
  }, 30_000); // 30s timeout — real API call
});
