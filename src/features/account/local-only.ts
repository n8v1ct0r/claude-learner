// src/features/account/local-only.ts
//
// Claude Learners v1.0 on the App Store is LOCAL-ONLY. The store build ships without
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY, so it has no accounts, no sync and no AI
// grading. Screens read this flag to present the on-device experience as the whole product: no
// backend status, no sync queue, no "checking" state for a grader that does not exist.
//
// A build that carries the public Supabase config (a developer build, or a later online release)
// keeps every online path exactly as before. The flag derives from the same build-time check the
// Supabase client uses, so the two can never disagree.

import { isSupabaseConfigured } from '@/api/supabase';

/** True when this build has no hosted backend configured (the App Store v1.0 build). */
export const isLocalOnlyBuild = !isSupabaseConfigured;
