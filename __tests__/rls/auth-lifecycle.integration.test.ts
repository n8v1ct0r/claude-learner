/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import { expect, test } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

import { TURNSTILE_TEST_OPTIONS } from '../support/turnstile';

function localConfig(): { url: string; key: string; mail: string } {
  const parsed = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' })) as Record<string, string>;
  return { url: parsed.API_URL, key: parsed.ANON_KEY ?? parsed.PUBLISHABLE_KEY, mail: parsed.INBUCKET_URL ?? parsed.MAILPIT_URL };
}

async function waitForOtp(mailUrl: string, email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await fetch(`${mailUrl}/api/v1/messages`).then((response) => response.json()) as { messages?: Array<{ ID: string; To?: Array<{ Address?: string }> }> };
    const message = list.messages?.find((candidate) => candidate.To?.some((to) => to.Address === email));
    if (message) {
      const detail = await fetch(`${mailUrl}/api/v1/message/${message.ID}`).then((response) => response.json()) as { Text?: string; HTML?: string; Subject?: string };
      const match = `${detail.Subject ?? ''} ${detail.Text ?? ''} ${detail.HTML ?? ''}`.match(/\b(\d{6})\b/);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No six-digit OTP arrived for ${email}`);
}

test('GC-12 upgrades an anonymous user through email OTP without changing ownership', async () => {
  const local = localConfig();
  const client = createClient(local.url, local.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonymous = await client.auth.signInAnonymously(TURNSTILE_TEST_OPTIONS);
  expect(anonymous.error).toBeNull();
  expect(anonymous.data.user?.is_anonymous).toBe(true);
  const userId = anonymous.data.user?.id as string;

  const profile = await client.from('profiles').select('id,display_name').single();
  expect(profile.error).toBeNull();
  expect(profile.data?.id).toBe(userId);
  expect(profile.data?.display_name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);

  const email = `cca-${Date.now()}@example.com`;
  const request = await client.auth.updateUser({ email });
  expect(request.error).toBeNull();
  const token = await waitForOtp(local.mail, email);
  const verified = await client.auth.verifyOtp({ email, token, type: 'email_change' });
  expect(verified.error).toBeNull();
  expect(verified.data.user?.id).toBe(userId);
  expect(verified.data.user?.is_anonymous).toBe(false);

  const stillOwned = await client.from('profiles').select('id').single();
  expect(stillOwned.data?.id).toBe(userId);
  await client.auth.signOut();
}, 20_000);
