// src/api/supabase.web.ts: the web build's Supabase module.
//
// The public web build is an offline demo with no backend (see src/api/demo-grading.ts), so it never
// creates a client. Keeping @supabase/supabase-js out of this file keeps the whole library out of the
// web bundle. Same exports as supabase.ts; native builds resolve supabase.ts unchanged.

import type { SupabaseClient } from '@supabase/supabase-js';

export const configuredSupabaseUrl: string | null = null;
export const isSupabaseConfigured = false;
export const supabase: SupabaseClient | null = null;

export function requireSupabaseClient(): SupabaseClient {
  throw new Error('Online backup is not configured on this build yet. Your study progress remains on this device.');
}
