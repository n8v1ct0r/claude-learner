import { AppState, type AppStateStatus } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { requireSupabaseClient, supabase } from './supabase';

/** Supplies a new, single-use CAPTCHA token for one anonymous sign-in attempt. */
export type CaptchaTokenProvider = () => Promise<string>;

/**
 * Guarantees a session exists: reuse the persisted one, otherwise sign in anonymously so the user
 * can start playing instantly (ADHD-friendly — no signup wall). The anonymous account is later
 * upgraded to email in the auth-lifecycle milestone (GC-12).
 */
export async function ensureSession(captchaTokenProvider?: CaptchaTokenProvider): Promise<Session> {
  const client = requireSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (session) return session;

  if (!captchaTokenProvider) {
    throw new Error('Bot verification is not ready. Online backup will retry automatically.');
  }
  const captchaToken = await captchaTokenProvider();
  if (!captchaToken) throw new Error('Bot verification returned an empty token.');

  const { data, error } = await client.auth.signInAnonymously({ options: { captchaToken } });
  if (error) throw error;
  if (!data.session) throw new Error('signInAnonymously() returned no session');
  return data.session;
}

/** Send a six-digit email-change OTP while preserving the anonymous user's identity and data. */
export async function requestEmailUpgrade(email: string): Promise<void> {
  const client = requireSupabaseClient();
  const session = await ensureSession();
  if (!session.user.is_anonymous) throw new Error('This account is already saved with an email.');
  const { error } = await client.auth.updateUser({ email: email.trim().toLowerCase() });
  if (error) throw error;
}

/** Confirm the email-change OTP. The auth user id remains unchanged, so every RLS row stays owned. */
export async function verifyEmailUpgrade(email: string, token: string): Promise<Session> {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email_change',
  });
  if (error) throw error;
  if (!data.session) throw new Error('Email verification returned no session');
  return data.session;
}

/**
 * Wire Supabase token auto-refresh to app foreground state, per the Supabase React Native docs:
 * refresh only while the app is active, stop while backgrounded. Returns an unsubscribe function.
 */
export function registerAuthAutoRefresh(): () => void {
  if (!supabase) return () => undefined;
  const client = supabase;
  const handleAppStateChange = (state: AppStateStatus): void => {
    if (state === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  };

  // Apply the current state immediately (the app usually mounts while 'active').
  handleAppStateChange(AppState.currentState);
  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription.remove();
}
