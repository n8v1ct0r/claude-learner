// src/api/demo-grading.ts
//
// DEMO grading for the public web build. The real Feynman grader is a Supabase edge function that
// calls Claude; the web build ships with no backend and no API key. So that a visitor still sees what
// a graded explain-back looks like, the web build grades with a plain word match against the lesson's
// key points. It is NOT Claude, and the UI says so wherever its output appears (ExplainBack).
//
// Active only on web with no Supabase config. Native builds never take this path: requestGrading
// degrades to self-assessment exactly as before.

import { Platform } from 'react-native';

import type { FeynmanGrade } from './grading';
import { isSupabaseConfigured } from './supabase';

/** True on the public web build: no backend, so explain-back uses the labeled demo grader. */
export const isDemoGrading = Platform.OS === 'web' && !isSupabaseConfigured;

/** Shown next to every demo verdict. */
export const DEMO_GRADING_LABEL = 'DEMO grading: a simple word match, not Claude. Live grading needs the backend.';

type KeyPointText = { id: string; text: string };

let keyPointsByConcept: Record<string, KeyPointText[]> = {};

/** The web content provider registers each concept's key points once the snapshot loads. */
export function registerDemoKeyPoints(map: Record<string, KeyPointText[]>): void {
  keyPointsByConcept = map;
}

const STOPWORDS = new Set([
  'about', 'after', 'again', 'because', 'before', 'being', 'between', 'could', 'every', 'their',
  'there', 'these', 'thing', 'things', 'those', 'through', 'which', 'while', 'where', 'would', 'should',
  'other', 'never', 'always', 'instead', 'until', 'using', 'without', 'within', 'claude',
]);

/** Content words of 5+ letters, reduced to a 5-letter stem so "tools" matches "tooling". */
function stems(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z][a-z0-9-]*/g) ?? [];
  return [...new Set(words.filter((w) => w.length >= 5 && !STOPWORDS.has(w)).map((w) => w.slice(0, 5)))];
}

/**
 * PURE: grade a transcript against key points by word overlap. A key point counts as covered when at
 * least half of its content words appear in the transcript (minimum 2, or 1 for a one-word point),
 * capped at 3: a long key point lists details (every domain and its weight), and a learner who
 * explains the idea in their own words names only a few of them.
 */
export function demoGrade(keyPoints: KeyPointText[], transcript: string): FeynmanGrade {
  const said = new Set(stems(transcript));
  const covered: string[] = [];
  const missing: string[] = [];
  for (const point of keyPoints) {
    const words = stems(point.text);
    const hits = words.filter((w) => said.has(w)).length;
    const needed = words.length < 2 ? 1 : Math.min(3, Math.max(2, Math.ceil(words.length / 2)));
    (words.length > 0 && hits >= needed ? covered : missing).push(point.id);
  }
  const firstMissing = keyPoints.find((p) => missing.includes(p.id));
  const ratio = keyPoints.length > 0 ? covered.length / keyPoints.length : 0;
  const score = Math.min(5, Math.max(1, Math.round(1 + ratio * 4))) as FeynmanGrade['simple_score'];
  return {
    covered_points: covered,
    missing_points: missing,
    jargon_flags: [],
    misconception: null,
    simple_score: score,
    next_step_hint: firstMissing
      ? `Try adding this point: ${firstMissing.text}`
      : 'You named every key point. Nice work.',
  };
}

/** Demo verdict for a concept, or null when its key points are not known. */
export function demoGradeConcept(conceptId: string, transcript: string): FeynmanGrade | null {
  const points = keyPointsByConcept[conceptId];
  return points && points.length > 0 ? demoGrade(points, transcript) : null;
}
