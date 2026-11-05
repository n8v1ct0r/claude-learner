/** @jest-environment node */

import { describe, expect, test } from '@jest/globals';

import { handleTurnstileChallenge } from '../../supabase/functions/turnstile-challenge/handler';

const SITE_KEY = '1x00000000000000000000AA';
const NONCE = 'ab'.repeat(32);
const URL = `https://example.supabase.co/functions/v1/turnstile-challenge?nonce=${NONCE}`;

describe('turnstile-challenge edge function', () => {
  test('serves a no-store, nonce-bound challenge document for one strong nonce', async () => {
    const response = handleTurnstileChallenge(new Request(URL), SITE_KEY);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('content-security-policy')).toContain(
      'https://challenges.cloudflare.com',
    );
    expect(html).toContain('https://challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain(`const requestNonce = "${NONCE}"`);
    expect(html).toContain("type: 'turnstile-ready'");
    expect(html).toContain("type: 'turnstile-token'");
    expect(html).toContain("type: 'turnstile-error'");
    expect(html).toContain("appearance: 'interaction-only'");
    expect(html).not.toContain('TURNSTILE_SECRET');
  });

  test.each([
    'missing nonce|https://example.supabase.co/functions/v1/turnstile-challenge',
    'short nonce|https://example.supabase.co/functions/v1/turnstile-challenge?nonce=abc',
    `uppercase nonce|https://example.supabase.co/functions/v1/turnstile-challenge?nonce=${NONCE.toUpperCase()}`,
    `duplicate nonce|${URL}&nonce=${NONCE}`,
    `extra parameter|${URL}&debug=true`,
  ])('rejects %s', async (row: string) => {
    const [, requestUrl] = row.split('|');
    const response = handleTurnstileChallenge(new Request(requestUrl), SITE_KEY);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid challenge request');
  });

  test('is GET-only', async () => {
    const response = handleTurnstileChallenge(new Request(URL, { method: 'POST' }), SITE_KEY);

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    await expect(response.text()).resolves.toBe('Method not allowed');
  });

  test.each([undefined, '', 'not a valid site key'] as (string | undefined)[])(
    'fails closed without a valid site key',
    async (key: string | undefined) => {
      const response = handleTurnstileChallenge(new Request(URL), key);

      expect(response.status).toBe(500);
      await expect(response.text()).resolves.toBe('Challenge unavailable');
    },
  );
});
