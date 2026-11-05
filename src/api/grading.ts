// src/api/grading.ts
//
// The client edge of the Feynman grader (GC-09). It calls the `grade-feynman` Supabase edge function
// with the learner's typed explanation and returns a typed union that the lesson store folds into the
// explain-back UI. The single hard contract of this module: it NEVER throws and NEVER surfaces an
// error to the learner. Every failure — no server configured, offline, a timeout, a 401/400/404, or
// an exhausted quota/budget — collapses into a `degraded` result so the caller silently falls back to
// the same self-assessment path shipped before grading existed, with identical XP (GC-09.8).
//
// Identity is the caller's, always: `functions.invoke` attaches the Supabase session's Authorization
// bearer and the anon apikey. The server derives the user from that JWT alone (never from the body),
// so this client never sends a user id — it only sends the concept, the transcript, and an idempotency
// key. If the client has no configured backend it degrades to `no-server` WITHOUT a network call, the
// same way src/api/supabase.ts no-ops when the hosted project is absent from the build.

import { demoGradeConcept, isDemoGrading } from '@/api/demo-grading';
import { FunctionsFetchError, FunctionsHttpError } from '@/api/functions-errors';
import { isSupabaseConfigured, supabase } from '@/api/supabase';

/** The grader's JSON-schema-valid verdict. `covered_points`/`missing_points` are key-point IDs. */
export interface FeynmanGrade {
  covered_points: string[];
  missing_points: string[];
  jargon_flags: string[];
  misconception: string | null;
  simple_score: 1 | 2 | 3 | 4 | 5;
  next_step_hint: string;
}

/**
 * Why a grading attempt did not yield a verdict. All of these degrade to manual self-assessment with
 * the SAME XP — the distinction exists only for local product analytics, never for the learner's eyes.
 */
export type DegradeReason = 'offline' | 'quota' | 'budget' | 'error' | 'timeout' | 'no-server';

export type GradingResult =
  | { kind: 'graded'; grade: FeynmanGrade }
  | { kind: 'degraded'; reason: DegradeReason };

export interface GradingRequest {
  conceptId: string;
  transcript: string;
  /** A fresh idempotency key per submission (server dedupes retries; a refine uses a NEW one). */
  clientSubmissionId: string;
}

/** Hard ceiling on how long the learner's explain-back waits before we quietly fall back to manual. */
export const GRADING_TIMEOUT_MS = 8000;

/**
 * Grade one explain-back transcript. Resolves to `graded` with the schema-valid verdict, or `degraded`
 * with the reason. Never rejects: callers can `.then` without a `.catch` and treat any non-`graded`
 * result as "stay in manual self-assessment".
 */
export async function requestGrading({
  conceptId,
  transcript,
  clientSubmissionId,
}: GradingRequest): Promise<GradingResult> {
  // The public web build (no backend) answers with the labeled DEMO word-match grader instead.
  if (isDemoGrading) {
    const grade = demoGradeConcept(conceptId, transcript);
    if (grade) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return { kind: 'graded', grade };
    }
  }
  // No hosted backend on this build → degrade instantly, no network, mirroring requireSupabaseClient.
  if (!isSupabaseConfigured || !supabase) {
    return { kind: 'degraded', reason: 'no-server' };
  }
  const client = supabase;

  // Race the invoke against an 8s timeout. The invoke keeps running if the timer wins; we ignore it.
  const TIMEOUT = Symbol('grading-timeout');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), GRADING_TIMEOUT_MS);
  });

  try {
    const outcome = await Promise.race([
      client.functions.invoke('grade-feynman', {
        // The learner's text rides as DATA inside a JSON body — never concatenated into instructions —
        // and the user id is deliberately absent (the server reads identity from the JWT, GC-09).
        body: { concept_id: conceptId, transcript, client_submission_id: clientSubmissionId },
      }),
      timeout,
    ]);
    if (outcome === TIMEOUT) return { kind: 'degraded', reason: 'timeout' };
    return await interpretInvokeResult(outcome);
  } catch {
    // Any unexpected throw (malformed client, thrown polyfill, etc.) is still a silent degrade.
    return { kind: 'degraded', reason: 'error' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Fold a supabase-js `{ data, error }` invoke result into the grading union. */
async function interpretInvokeResult(result: {
  data: unknown;
  error: unknown;
}): Promise<GradingResult> {
  const { data, error } = result;

  if (error) {
    // A network-layer failure (DNS, connection reset, CORS) → the device is effectively offline.
    if (error instanceof FunctionsFetchError) return { kind: 'degraded', reason: 'offline' };
    // A non-2xx HTTP response carries the status on the attached Response.
    if (error instanceof FunctionsHttpError) {
      const status = error.context?.status;
      if (status === 429) {
        // Distinguish the personal daily cap from the shared global budget for local analytics only.
        let code: unknown;
        try {
          code = (await error.context.json())?.error;
        } catch {
          /* body already consumed or non-JSON — fall through to the per-user default */
        }
        return { kind: 'degraded', reason: code === 'global_budget' ? 'budget' : 'quota' };
      }
      // 401 (no/invalid user), 400 (bad request / too long), 404 (unknown concept), 5xx — all silent.
      return { kind: 'degraded', reason: 'error' };
    }
    return { kind: 'degraded', reason: 'error' };
  }

  const grade = parseGrade(data);
  return grade ? { kind: 'graded', grade } : { kind: 'degraded', reason: 'error' };
}

/** Validate the grader payload defensively; a shape mismatch degrades rather than corrupting the UI. */
function parseGrade(body: unknown): FeynmanGrade | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');

  if (!isStringArray(b.covered_points)) return null;
  if (!isStringArray(b.missing_points)) return null;
  if (!isStringArray(b.jargon_flags)) return null;
  if (!(b.misconception === null || typeof b.misconception === 'string')) return null;
  if (typeof b.simple_score !== 'number' || ![1, 2, 3, 4, 5].includes(b.simple_score)) return null;
  if (typeof b.next_step_hint !== 'string') return null;

  return {
    covered_points: b.covered_points,
    missing_points: b.missing_points,
    jargon_flags: b.jargon_flags,
    misconception: b.misconception as string | null,
    simple_score: b.simple_score as 1 | 2 | 3 | 4 | 5,
    next_step_hint: b.next_step_hint,
  };
}
