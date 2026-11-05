import { useCallback, useEffect, useRef } from 'react';

import type { CaptchaTokenProvider } from '@/api/auth';
import { configuredSupabaseUrl } from '@/api/supabase';
import { TurnstileChallenge, type TurnstileChallengeHandle } from '@/sync/TurnstileChallenge';
import { startSyncRuntime } from '@/sync/runtime';

/** Invisible root component that keeps online backup entirely outside the offline lesson path. */
export function SyncBootstrap() {
  const challengeRef = useRef<TurnstileChallengeHandle>(null);
  const captchaTokenProvider = useCallback<CaptchaTokenProvider>(() => {
    if (!challengeRef.current) {
      return Promise.reject(new Error('Bot verification is not ready.'));
    }
    return challengeRef.current.requestToken();
  }, []);

  useEffect(() => startSyncRuntime(captchaTokenProvider), [captchaTokenProvider]);

  return configuredSupabaseUrl ? (
    <TurnstileChallenge ref={challengeRef} configuredSupabaseUrl={configuredSupabaseUrl} />
  ) : null;
}
