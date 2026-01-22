import { createHmac } from 'crypto';
import type { AgentRequest, AgentResponse, BotConfig } from '../types.js';

/**
 * Send a request to the TAI backend agent endpoint
 *
 * Security: Uses HMAC-SHA256 signature for request authentication
 */
export async function sendAgentRequest(
  request: AgentRequest,
  config: BotConfig
): Promise<AgentResponse> {
  const timestamp = Date.now();
  const body = JSON.stringify(request);

  // Create HMAC signature for authentication
  const signature = createHmac('sha256', config.taiDiscordSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const response = await fetch(`${config.taiApiUrl}/api/discord-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Discord-Timestamp': timestamp.toString(),
      'X-Discord-Signature': signature,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Agent API error: ${response.status} - ${errorText}`);

    // Throw user-friendly errors based on status code
    switch (response.status) {
      case 401:
        throw new Error('Authentication failed. Please contact an administrator.');
      case 403:
        throw new Error('You do not have permission to perform this action.');
      case 429:
        throw new Error('Rate limit exceeded. Please wait before trying again.');
      case 500:
        throw new Error('Server error. Our team has been notified.');
      default:
        throw new Error('Failed to process request. Please try again.');
    }
  }

  const data = (await response.json()) as AgentResponse;
  return data;
}

/**
 * Verify HMAC signature from incoming webhook (for future use)
 */
export function verifySignature(
  timestamp: string,
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}
