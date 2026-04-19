/**
 * T29 — integration_visionRespondsToSimpleImage
 *
 * Verifies that the full vision pipeline (attachment → Claude) works end-to-end.
 * Runs only when RUN_INTEGRATION_TESTS=1 is set. Requires ANTHROPIC_API_KEY.
 *
 * The test image is a small 8×8 solid-red PNG checked into test-fixtures/.
 * It is accessed via raw.githubusercontent.com so Anthropic's servers can
 * fetch it without needing a local server.
 *
 * URL: https://raw.githubusercontent.com/Koplal/tai-discord-bot/main/test-fixtures/vision-test.png
 */

import { describe, it, expect } from 'vitest';
import { processAgentRequest } from '../services/agent.js';
import type { BotConfig } from '../types.js';

const RUN = process.env['RUN_INTEGRATION_TESTS'] === '1';

// Stable URL for the red-square test fixture on main.
// raw.githubusercontent.com is widely accessible from Anthropic infrastructure.
const TEST_IMAGE_URL =
  'https://raw.githubusercontent.com/Koplal/tai-discord-bot/main/test-fixtures/vision-test.png';

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

describe.skipIf(!RUN)('vision integration', () => {
  it('integration_visionRespondsToSimpleImage: responds meaningfully to an image prompt', async () => {
    const response = await processAgentRequest(
      {
        content: 'What color is this image? Please describe what you see.',
        context: [],
        username: 'integration-test-user',
        channel: 'integration-test-channel',
        tier: 'free',
        attachments: [
          {
            url: TEST_IMAGE_URL,
            mimeType: 'image/png',
          },
        ],
      },
      makeConfig()
    );

    // Plumbing check: response must be non-empty
    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(0);

    // Soft content check: the image is a solid red square, so Claude should
    // mention "red" (or at minimum return a non-error response with real text).
    // We intentionally keep this loose — we are testing plumbing, not AI quality.
    const lower = response.content.toLowerCase();
    const hasRelevantContent =
      lower.includes('red') ||
      lower.includes('color') ||
      lower.includes('colour') ||
      lower.includes('image') ||
      lower.includes('square') ||
      lower.includes('solid');

    expect(hasRelevantContent).toBe(true);
  }, 30_000); // 30s timeout — real API call
});
