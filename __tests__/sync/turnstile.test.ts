import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  buildTurnstileChallengeUrl,
  createTurnstileTokenBroker,
  isTrustedTurnstileChallengeUrl,
  parseTurnstileChallengeMessage,
  type TurnstileChallengeAttempt,
} from '@/sync/turnstile';

const SUPABASE_URL = 'https://qredxvgflpkqqhlhwllf.supabase.co';
const NONCE_A = 'a'.repeat(64);
const NONCE_B = 'b'.repeat(64);

afterEach(() => {
  jest.useRealTimers();
});

describe('native Turnstile trust boundary', () => {
  it('builds and accepts only the exact configured top-level URL', () => {
    const trustedUrl = `${SUPABASE_URL}/functions/v1/turnstile-challenge?nonce=${NONCE_A}`;
    expect(buildTurnstileChallengeUrl(`${SUPABASE_URL}/`, NONCE_A)).toBe(trustedUrl);
    expect(isTrustedTurnstileChallengeUrl(trustedUrl, SUPABASE_URL, NONCE_A)).toBe(true);
    expect(isTrustedTurnstileChallengeUrl(`${trustedUrl}&next=https://evil.example`, SUPABASE_URL, NONCE_A)).toBe(false);
    expect(isTrustedTurnstileChallengeUrl(trustedUrl.replace(NONCE_A, NONCE_B), SUPABASE_URL, NONCE_A)).toBe(false);
    expect(isTrustedTurnstileChallengeUrl(trustedUrl.replace('/functions', '/storage'), SUPABASE_URL, NONCE_A)).toBe(false);
    expect(isTrustedTurnstileChallengeUrl(trustedUrl.replace('qredxvgflpkqqhlhwllf', 'evil'), SUPABASE_URL, NONCE_A)).toBe(false);
    expect(isTrustedTurnstileChallengeUrl(`${trustedUrl}#fragment`, SUPABASE_URL, NONCE_A)).toBe(false);
  });

  it('accepts only exact, nonce-bound token and bounded error messages from that URL', () => {
    const trustedUrl = buildTurnstileChallengeUrl(SUPABASE_URL, NONCE_A);
    const tokenMessage = JSON.stringify({ type: 'turnstile-token', nonce: NONCE_A, token: 'opaque-token' });
    expect(parseTurnstileChallengeMessage(trustedUrl, tokenMessage, SUPABASE_URL, NONCE_A)).toEqual({
      type: 'turnstile-token',
      nonce: NONCE_A,
      token: 'opaque-token',
    });
    expect(
      parseTurnstileChallengeMessage(
        trustedUrl,
        JSON.stringify({ type: 'turnstile-error', nonce: NONCE_A, code: 'challenge_failed' }),
        SUPABASE_URL,
        NONCE_A,
      ),
    ).toEqual({ type: 'turnstile-error', nonce: NONCE_A, code: 'challenge_failed' });

    expect(parseTurnstileChallengeMessage(trustedUrl, tokenMessage.replace(NONCE_A, NONCE_B), SUPABASE_URL, NONCE_A)).toBeNull();
    expect(parseTurnstileChallengeMessage(trustedUrl, '{bad-json', SUPABASE_URL, NONCE_A)).toBeNull();
    expect(parseTurnstileChallengeMessage(trustedUrl, JSON.stringify({ type: 'turnstile-token', nonce: NONCE_A, token: '' }), SUPABASE_URL, NONCE_A)).toBeNull();
    expect(parseTurnstileChallengeMessage(trustedUrl, JSON.stringify({ type: 'turnstile-token', nonce: NONCE_A, token: 'ok', extra: true }), SUPABASE_URL, NONCE_A)).toBeNull();
    expect(parseTurnstileChallengeMessage(`${trustedUrl}&extra=1`, tokenMessage, SUPABASE_URL, NONCE_A)).toBeNull();
    expect(parseTurnstileChallengeMessage(trustedUrl, JSON.stringify({ type: 'turnstile-error', nonce: NONCE_A, code: '<script>' }), SUPABASE_URL, NONCE_A)).toBeNull();
  });
});

describe('Turnstile token broker', () => {
  it('settles one token, clears it from memory, and creates a fresh nonce for a retry', async () => {
    const attempts: (TurnstileChallengeAttempt | null)[] = [];
    const nonces = [NONCE_A, NONCE_B];
    const broker = createTurnstileTokenBroker({
      configuredSupabaseUrl: SUPABASE_URL,
      onAttemptChange: (attempt) => attempts.push(attempt),
      createNonce: () => nonces.shift() as string,
    });

    const first = broker.requestToken();
    expect(attempts.at(-1)?.nonce).toBe(NONCE_A);
    expect(
      broker.receiveMessage(
        attempts.at(-1)?.url as string,
        JSON.stringify({ type: 'turnstile-token', nonce: NONCE_A, token: 'token-a' }),
      ),
    ).toBe(true);
    await expect(first).resolves.toBe('token-a');
    expect(attempts.at(-1)).toBeNull();

    const second = broker.requestToken();
    expect(attempts.at(-1)?.nonce).toBe(NONCE_B);
    expect(
      broker.receiveMessage(
        attempts.at(-1)?.url as string,
        JSON.stringify({ type: 'turnstile-token', nonce: NONCE_B, token: 'token-b' }),
      ),
    ).toBe(true);
    await expect(second).resolves.toBe('token-b');
    broker.dispose();
  });

  it('ignores untrusted messages and rejects a structured challenge error', async () => {
    let attempt: TurnstileChallengeAttempt | null = null;
    const broker = createTurnstileTokenBroker({
      configuredSupabaseUrl: SUPABASE_URL,
      onAttemptChange: (next) => {
        attempt = next;
      },
      createNonce: () => NONCE_A,
    });
    const token = broker.requestToken();
    const rejection = expect(token).rejects.toThrow('challenge_failed');
    expect(
      broker.receiveMessage(
        'https://evil.example/functions/v1/turnstile-challenge?nonce=' + NONCE_A,
        JSON.stringify({ type: 'turnstile-token', nonce: NONCE_A, token: 'stolen' }),
      ),
    ).toBe(false);
    expect(
      broker.receiveMessage(
        (attempt as TurnstileChallengeAttempt | null)?.url as string,
        JSON.stringify({ type: 'turnstile-error', nonce: NONCE_A, code: 'challenge_failed' }),
      ),
    ).toBe(true);
    await rejection;
  });

  it('times out, resets, and permits a later attempt with a new nonce', async () => {
    jest.useFakeTimers();
    const attempts: (TurnstileChallengeAttempt | null)[] = [];
    const nonces = [NONCE_A, NONCE_B];
    const broker = createTurnstileTokenBroker({
      configuredSupabaseUrl: SUPABASE_URL,
      onAttemptChange: (attempt) => attempts.push(attempt),
      timeoutMs: 1_000,
      createNonce: () => nonces.shift() as string,
    });

    const timedOut = broker.requestToken();
    const rejection = expect(timedOut).rejects.toThrow('timed out');
    jest.advanceTimersByTime(1_001);
    await rejection;
    expect(attempts.at(-1)).toBeNull();

    const retry = broker.requestToken();
    expect(attempts.at(-1)?.nonce).toBe(NONCE_B);
    broker.failCurrentAttempt(new Error('network unavailable'));
    await expect(retry).rejects.toThrow('network unavailable');
  });
});
