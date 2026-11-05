import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ensureSession, type CaptchaTokenProvider } from '@/api/auth';
import { useSessionMetaStore } from '@/state/session-meta';
import { useOutboxStore } from '@/sync/outbox';
import { syncNow } from '@/sync/runtime';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('@/api/auth', () => ({
  ensureSession: jest.fn(),
  registerAuthAutoRefresh: jest.fn(() => () => undefined),
}));

jest.mock('@/api/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

const mockedEnsureSession = ensureSession as jest.MockedFunction<typeof ensureSession>;

beforeEach(() => {
  mockedEnsureSession.mockReset();
  useSessionMetaStore.getState().reset();
  useOutboxStore.getState().reset();
});

describe('sync CAPTCHA fallback', () => {
  it('keeps queued progress local and retryable when the challenge is rejected', async () => {
    const queuedId = useOutboxStore.getState().queueXp({
      amount: 10,
      source: 'lesson',
      sourceId: 'lesson-1',
      occurredAt: 1,
    });
    const provider = jest.fn<CaptchaTokenProvider>().mockRejectedValue(new Error('challenge rejected'));
    mockedEnsureSession.mockImplementation(async (tokenProvider) => {
      if (!tokenProvider) throw new Error('missing provider');
      await tokenProvider();
      throw new Error('unreachable');
    });

    await expect(syncNow(provider)).resolves.toBeUndefined();

    expect(provider).toHaveBeenCalledTimes(1);
    expect(useOutboxStore.getState().items.map((item) => item.id)).toContain(queuedId);
    expect(useSessionMetaStore.getState()).toMatchObject({
      backendConfigured: true,
      accountState: 'connecting',
      syncState: 'offline',
      isOnline: false,
      syncMessage: 'Online backup will retry automatically. Your progress is safe on this device.',
    });
  });
});
