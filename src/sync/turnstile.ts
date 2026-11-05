import * as Crypto from 'expo-crypto';

import type { CaptchaTokenProvider } from '@/api/auth';

export const TURNSTILE_CHALLENGE_PATH = '/functions/v1/turnstile-challenge';
export const TURNSTILE_CHALLENGE_TIMEOUT_MS = 15_000;
export const TURNSTILE_CLOUDFLARE_ORIGIN = 'https://challenges.cloudflare.com';

const TURNSTILE_ABOUT_URLS = ['about:blank', 'about:srcdoc'] as const;

const NONCE_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ERROR_CODE_PATTERN = /^[a-z0-9_-]{1,64}$/;
const MAX_TOKEN_LENGTH = 4096;

export interface TurnstileChallengeAttempt {
  nonce: string;
  url: string;
}

export type TurnstileChallengeMessage =
  | { type: 'turnstile-token'; nonce: string; token: string }
  | { type: 'turnstile-error'; nonce: string; code: string };

interface PendingChallenge extends TurnstileChallengeAttempt {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface TurnstileTokenBroker {
  requestToken: CaptchaTokenProvider;
  receiveMessage: (sourceUrl: string, data: string) => boolean;
  failCurrentAttempt: (error: Error) => void;
  dispose: () => void;
}

interface TurnstileTokenBrokerOptions {
  configuredSupabaseUrl: string;
  onAttemptChange: (attempt: TurnstileChallengeAttempt | null) => void;
  timeoutMs?: number;
  createNonce?: () => string;
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function challengeOrigin(configuredSupabaseUrl: string): string {
  const parsed = new URL(configuredSupabaseUrl);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback(parsed.hostname))) {
    throw new Error('The Turnstile challenge requires HTTPS.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/')) {
    throw new Error('The configured Supabase URL must be an origin without credentials, query, or path.');
  }
  return parsed.origin;
}

/**
 * react-native-webview evaluates originWhitelist before onShouldStartLoadWithRequest. Include the
 * exact origins Turnstile needs so the app-level policy can inspect Cloudflare iframe navigation.
 */
export function buildTurnstileWebViewOriginWhitelist(configuredSupabaseUrl: string): string[] {
  return [
    challengeOrigin(configuredSupabaseUrl),
    TURNSTILE_CLOUDFLARE_ORIGIN,
    ...TURNSTILE_ABOUT_URLS,
  ];
}

/** Turnstile subframes may load only Cloudflare or its documented inert about: documents. */
export function isTrustedTurnstileSubframeUrl(candidateUrl: string): boolean {
  try {
    const candidate = new URL(candidateUrl);
    if (candidate.protocol === 'about:') {
      return (
        TURNSTILE_ABOUT_URLS.includes(`about:${candidate.pathname}` as (typeof TURNSTILE_ABOUT_URLS)[number]) &&
        candidate.search === ''
      );
    }
    return candidate.origin === TURNSTILE_CLOUDFLARE_ORIGIN;
  } catch {
    return false;
  }
}

/** Creates a cryptographically random 256-bit nonce without persisting it. */
export function createTurnstileNonce(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildTurnstileChallengeUrl(configuredSupabaseUrl: string, nonce: string): string {
  if (!NONCE_PATTERN.test(nonce)) throw new Error('The Turnstile challenge nonce is invalid.');
  return `${challengeOrigin(configuredSupabaseUrl)}${TURNSTILE_CHALLENGE_PATH}?nonce=${nonce}`;
}

/** Exact top-level navigation boundary: one trusted origin, path, nonce, and no extra URL data. */
export function isTrustedTurnstileChallengeUrl(
  candidateUrl: string,
  configuredSupabaseUrl: string,
  nonce: string,
): boolean {
  try {
    const expected = buildTurnstileChallengeUrl(configuredSupabaseUrl, nonce);
    const candidate = new URL(candidateUrl);
    return candidate.href === expected;
  } catch {
    return false;
  }
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}

/** Parses only the nonce-bound structured messages emitted by the trusted challenge document. */
export function parseTurnstileChallengeMessage(
  sourceUrl: string,
  data: string,
  configuredSupabaseUrl: string,
  nonce: string,
): TurnstileChallengeMessage | null {
  if (!isTrustedTurnstileChallengeUrl(sourceUrl, configuredSupabaseUrl, nonce)) return null;

  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (value.type === 'turnstile-token') {
      if (!hasExactKeys(value, ['nonce', 'token', 'type'])) return null;
      if (value.nonce !== nonce || typeof value.token !== 'string') return null;
      if (value.token.length < 1 || value.token.length > MAX_TOKEN_LENGTH) return null;
      return { type: 'turnstile-token', nonce, token: value.token };
    }
    if (value.type === 'turnstile-error') {
      if (!hasExactKeys(value, ['code', 'nonce', 'type'])) return null;
      if (value.nonce !== nonce || typeof value.code !== 'string' || !SAFE_ERROR_CODE_PATTERN.test(value.code)) return null;
      return { type: 'turnstile-error', nonce, code: value.code };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Coordinates one WebView challenge at a time. A successful token settles exactly one request;
 * failures and timeouts clear the WebView so a later retry necessarily receives a fresh nonce.
 */
export function createTurnstileTokenBroker({
  configuredSupabaseUrl,
  onAttemptChange,
  timeoutMs = TURNSTILE_CHALLENGE_TIMEOUT_MS,
  createNonce = createTurnstileNonce,
}: TurnstileTokenBrokerOptions): TurnstileTokenBroker {
  let pending: PendingChallenge | null = null;

  const clearPending = (): PendingChallenge | null => {
    const current = pending;
    if (!current) return null;
    clearTimeout(current.timer);
    pending = null;
    onAttemptChange(null);
    return current;
  };

  const failCurrentAttempt = (error: Error): void => {
    const current = clearPending();
    current?.reject(error);
  };

  const requestToken: CaptchaTokenProvider = () =>
    new Promise<string>((resolve, reject) => {
      if (pending) {
        reject(new Error('A bot-verification challenge is already in progress.'));
        return;
      }

      let attempt: TurnstileChallengeAttempt;
      try {
        const nonce = createNonce();
        attempt = { nonce, url: buildTurnstileChallengeUrl(configuredSupabaseUrl, nonce) };
      } catch {
        reject(new Error('Secure bot verification is unavailable on this device.'));
        return;
      }

      const timer = setTimeout(() => {
        failCurrentAttempt(new Error('Bot verification timed out.'));
      }, timeoutMs);
      pending = { ...attempt, resolve, reject, timer };
      onAttemptChange(attempt);
    });

  const receiveMessage = (sourceUrl: string, data: string): boolean => {
    if (!pending) return false;
    const message = parseTurnstileChallengeMessage(
      sourceUrl,
      data,
      configuredSupabaseUrl,
      pending.nonce,
    );
    if (!message) return false;

    const current = clearPending();
    if (!current) return false;
    if (message.type === 'turnstile-token') {
      current.resolve(message.token);
    } else {
      current.reject(new Error(`Bot verification failed (${message.code}).`));
    }
    return true;
  };

  const dispose = (): void => {
    if (!pending) return;
    clearTimeout(pending.timer);
    const current = pending;
    pending = null;
    current.reject(new Error('Bot verification was cancelled.'));
  };

  return { requestToken, receiveMessage, failCurrentAttempt, dispose };
}
