import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { ensureSession, type CaptchaTokenProvider } from '@/api/auth';
import { requireSupabaseClient } from '@/api/supabase';

jest.mock('@/api/supabase', () => ({
  requireSupabaseClient: jest.fn(),
  supabase: null,
}));

const mockedRequireSupabaseClient = requireSupabaseClient as jest.MockedFunction<typeof requireSupabaseClient>;

function fakeSession(id: string): Session {
  return { user: { id } } as unknown as Session;
}

function mockAuthClient(session: Session | null, anonymousSession: Session | null = null) {
  const getSession = jest.fn(async () => ({ data: { session }, error: null }));
  const signInAnonymously = jest.fn(async () => ({
    data: { session: anonymousSession, user: anonymousSession?.user ?? null },
    error: null,
  }));
  mockedRequireSupabaseClient.mockReturnValue({
    auth: { getSession, signInAnonymously },
  } as unknown as SupabaseClient);
  return { getSession, signInAnonymously };
}

beforeEach(() => {
  mockedRequireSupabaseClient.mockReset();
});

describe('anonymous auth CAPTCHA bootstrap', () => {
  it('reuses an existing session without requesting a CAPTCHA token', async () => {
    const persisted = fakeSession('persisted-user');
    const auth = mockAuthClient(persisted);
    const provider = jest.fn<CaptchaTokenProvider>();

    await expect(ensureSession(provider)).resolves.toBe(persisted);
    expect(provider).not.toHaveBeenCalled();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('requests a fresh token and forwards it to anonymous sign-in', async () => {
    const anonymous = fakeSession('anonymous-user');
    const auth = mockAuthClient(null, anonymous);
    const provider = jest.fn<CaptchaTokenProvider>().mockResolvedValue('fresh-turnstile-token');

    await expect(ensureSession(provider)).resolves.toBe(anonymous);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(auth.signInAnonymously).toHaveBeenCalledWith({
      options: { captchaToken: 'fresh-turnstile-token' },
    });
  });

  it('does not attempt anonymous sign-in when the provider is missing or rejected', async () => {
    const auth = mockAuthClient(null);
    await expect(ensureSession()).rejects.toThrow('Bot verification is not ready');
    expect(auth.signInAnonymously).not.toHaveBeenCalled();

    const rejected = jest.fn<CaptchaTokenProvider>().mockRejectedValue(new Error('challenge rejected'));
    await expect(ensureSession(rejected)).rejects.toThrow('challenge rejected');
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
});
