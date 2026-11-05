// src/engine/energy.ts
//
// The energy model (PLAN-rev2 §4.4), as pure functions with an injectable clock — the GC-04 oracle.
//
// Energy is a *pacing* meter, not a punishment meter. It gates ONLY the start of a new path lesson
// (cost 1, max 5). Practice, SRS reviews, mistake review, explain-back, and mock exams NEVER consume
// or require energy — which is why the "at 0 energy, at least one zero-cost study action is always
// available" invariant (unit-tested below) holds. Refill math takes `now` as a parameter; nothing
// here calls Date.now().

import { MINUTE_MS } from './time';

/** Full bar (spec §4.4). */
export const MAX_ENERGY = 5;
/** Cost to start a new path lesson. */
export const PATH_LESSON_COST = 1;
/** A mistake inside a path lesson costs 1. */
export const MISTAKE_COST = 1;
/** A 5-in-a-row combo restores 1 (the "energy refund lightning", spec §4.3/§4.4). */
export const COMBO_RESTORE = 1;
/** Completing any practice/SRS session restores 1 (guaranteed recovery path). */
export const PRACTICE_RESTORE = 1;
/** The 0-energy "warm up to refill" session grants a guaranteed +2. */
export const WARMUP_RESTORE = 2;
/** Passive regeneration: +1 energy per 45 minutes. */
export const REFILL_INTERVAL_MS = 45 * MINUTE_MS;

export interface EnergyState {
  energy: number;
  maxEnergy: number;
  /** Epoch-ms anchor from which passive regeneration is measured. */
  lastRefillAt: number;
}

/** Every study action the path screen can offer. Only `path-lesson` has a nonzero energy cost. */
export type StudyAction =
  | 'path-lesson'
  | 'practice'
  | 'srs-review'
  | 'mistake-review'
  | 'explain-back'
  | 'mock-exam'
  | 'warmup';

/** The always-free actions — the guaranteed recovery/continue-studying surface at 0 energy. */
export const ZERO_COST_ACTIONS: readonly StudyAction[] = [
  'practice',
  'srs-review',
  'mistake-review',
  'explain-back',
  'mock-exam',
  'warmup',
];

/** A fresh energy state, full by default. */
export function createEnergyState(now: number, energy: number = MAX_ENERGY): EnergyState {
  return { energy, maxEnergy: MAX_ENERGY, lastRefillAt: now };
}

/** The energy cost of an action (1 for a path lesson, 0 for every zero-cost action). */
export function actionCost(action: StudyAction): number {
  return action === 'path-lesson' ? PATH_LESSON_COST : 0;
}

/**
 * Apply pending passive regeneration up to `now`. While full, the anchor is kept fresh at `now` (so
 * the regen clock only starts once the bar leaves full). Below full, the anchor advances by whole
 * consumed intervals, preserving any sub-interval remainder. Backward clock skew is inert.
 */
export function refill(state: EnergyState, now: number): EnergyState {
  if (state.energy >= state.maxEnergy) {
    return { ...state, energy: state.maxEnergy, lastRefillAt: now };
  }
  const elapsed = now - state.lastRefillAt;
  if (elapsed < REFILL_INTERVAL_MS) return state;

  const gained = Math.floor(elapsed / REFILL_INTERVAL_MS);
  const energy = Math.min(state.maxEnergy, state.energy + gained);
  const lastRefillAt =
    energy >= state.maxEnergy ? now : state.lastRefillAt + gained * REFILL_INTERVAL_MS;
  return { ...state, energy, lastRefillAt };
}

/** Grant `amount` energy (after settling passive refill), clamped to the cap. */
function grant(state: EnergyState, amount: number, now: number): EnergyState {
  const settled = refill(state, now);
  const energy = Math.min(settled.maxEnergy, settled.energy + amount);
  const lastRefillAt = energy >= settled.maxEnergy ? now : settled.lastRefillAt;
  return { ...settled, energy, lastRefillAt };
}

/** Whether a new path lesson can start right now (refill-aware). */
export function canStartPathLesson(state: EnergyState, now: number): boolean {
  return refill(state, now).energy >= PATH_LESSON_COST;
}

export interface StartResult {
  ok: boolean;
  state: EnergyState;
}

/**
 * Attempt to start a path lesson. On success, charge {@link PATH_LESSON_COST}; on failure (empty
 * bar, nothing refilled), the user is never hard-blocked — the UI redirects them to a zero-cost
 * warm-up (see {@link ZERO_COST_ACTIONS} / {@link warmupRefill}).
 */
export function startPathLesson(state: EnergyState, now: number): StartResult {
  const settled = refill(state, now);
  if (settled.energy < PATH_LESSON_COST) return { ok: false, state: settled };
  return { ok: true, state: { ...settled, energy: settled.energy - PATH_LESSON_COST } };
}

/** A mistake inside a path lesson costs 1 energy, never below 0. */
export function registerMistake(state: EnergyState, now: number): EnergyState {
  const settled = refill(state, now);
  return { ...settled, energy: Math.max(0, settled.energy - MISTAKE_COST) };
}

/** Restore 1 for a 5-in-a-row combo. */
export function restoreFromCombo(state: EnergyState, now: number): EnergyState {
  return grant(state, COMBO_RESTORE, now);
}

/** Restore 1 for completing any practice/SRS session. */
export function restoreFromPractice(state: EnergyState, now: number): EnergyState {
  return grant(state, PRACTICE_RESTORE, now);
}

/** The 0-energy warm-up: a guaranteed +{@link WARMUP_RESTORE}. */
export function warmupRefill(state: EnergyState, now: number): EnergyState {
  return grant(state, WARMUP_RESTORE, now);
}

/** Whether `action` is affordable right now (refill-aware). Zero-cost actions are always available. */
export function isActionAvailable(state: EnergyState, action: StudyAction, now: number): boolean {
  return refill(state, now).energy >= actionCost(action);
}

/** Every action currently available, including `path-lesson` only when energy permits. */
export function availableActions(state: EnergyState, now: number): StudyAction[] {
  const all: StudyAction[] = ['path-lesson', ...ZERO_COST_ACTIONS];
  return all.filter((action) => isActionAvailable(state, action, now));
}

/**
 * The always-free study actions available right now. INVARIANT (spec §4.4): this is never empty —
 * at 0 energy the learner can still practice, review, explain back, take a mock, or warm up.
 */
export function availableZeroCostActions(state: EnergyState, now: number): StudyAction[] {
  return ZERO_COST_ACTIONS.filter((action) => isActionAvailable(state, action, now));
}
