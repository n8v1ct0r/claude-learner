import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Expo inlines EXPO_PUBLIC_* variables at build time. The Supabase anon / publishable key is a
// CLIENT credential by design — Row Level Security (migration 0001) is the trust boundary, not the
// key's secrecy — so it is safe to ship in the app bundle. The service/secret key must NEVER live
// here or anywhere client-side. See .env.example.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** Public project URL used by the native Turnstile challenge. Never contains a secret. */
export const configuredSupabaseUrl = supabaseUrl ?? null;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// AsyncStorage is Supabase's documented React Native session store; detectSessionInUrl is off
// because there is no browser URL to parse on a native device.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/**
 * The learning app is fully usable without a backend. Online-only actions call this helper so a
 * missing hosted-project configuration becomes a friendly local-only state instead of a startup
 * crash that blocks bundled lessons.
 */
export function requireSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Online backup is not configured on this build yet. Your study progress remains on this device.');
  }
  return supabase;
}
