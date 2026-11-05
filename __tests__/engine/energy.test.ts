import { describe, expect, it } from '@jest/globals';

import {
  MAX_ENERGY,
  PATH_LESSON_COST,
  REFILL_INTERVAL_MS,
  WARMUP_RESTORE,
  ZERO_COST_ACTIONS,
  actionCost,
  availableActions,
  availableZeroCostActions,
  canStartPathLesson,
  createEnergyState,
  isActionAvailable,
  refill,
  registerMistake,
  restoreFromCombo,
  restoreFromPractice,
  startPathLesson,
  warmupRefill,
} from '@/engine/energy';
import type { EnergyState } from '@/engine/energy';

const T0 = 1_700_000_000_000; // arbitrary fixed epoch anchor for the injectable clock

const at = (energy: number, lastRefillAt = T0): EnergyState => ({
  energy,
  maxEnergy: MAX_ENERGY,
  lastRefillAt,
});

describe('createEnergyState', () => {
  it('starts full by default', () => {
    expect(createEnergyState(T0)).toEqual({ energy: 5, maxEnergy: 5, lastRefillAt: T0 });
  });
  it('accepts an explicit starting energy', () => {
    expect(createEnergyState(T0, 2).energy).toBe(2);
  });
});

describe('actionCost', () => {
  it('charges 1 only for a path lesson', () => {
    expect(actionCost('path-lesson')).toBe(PATH_LESSON_COST);
    for (const a of ZERO_COST_ACTIONS) expect(actionCost(a)).toBe(0);
  });
});

describe('passive refill (injectable clock)', () => {
  it('adds nothing before a full interval elapses', () => {
    expect(refill(at(2), T0 + REFILL_INTERVAL_MS - 1)).toEqual(at(2));
  });
  it('adds one energy per elapsed interval', () => {
    expect(refill(at(2), T0 + REFILL_INTERVAL_MS).energy).toBe(3);
    expect(refill(at(2), T0 + 2 * REFILL_INTERVAL_MS).energy).toBe(4);
  });
  it('carries the remainder into the next interval anchor when below max', () => {
    const r = refill(at(0), T0 + REFILL_INTERVAL_MS + 1_000);
    expect(r.energy).toBe(1);
    // anchor advances by exactly one consumed interval, preserving the 1s remainder
    expect(r.lastRefillAt).toBe(T0 + REFILL_INTERVAL_MS);
  });
  it('caps at max and pins the anchor to now once full', () => {
    const r = refill(at(1), T0 + 10 * REFILL_INTERVAL_MS);
    expect(r.energy).toBe(MAX_ENERGY);
    expect(r.lastRefillAt).toBe(T0 + 10 * REFILL_INTERVAL_MS);
  });
  it('keeps the anchor fresh while already full', () => {
    const later = T0 + 5 * REFILL_INTERVAL_MS;
    expect(refill(at(5), later)).toEqual(at(5, later));
  });
  it('is inert under backward clock skew', () => {
    expect(refill(at(3), T0 - 1_000)).toEqual(at(3));
  });
});

describe('starting a path lesson', () => {
  it('is allowed and costs 1 when energy is available', () => {
    const r = startPathLesson(at(3), T0);
    expect(r.ok).toBe(true);
    expect(r.state.energy).toBe(2);
  });
  it('starts the regen clock from now when leaving a full bar', () => {
    const later = T0 + 3 * REFILL_INTERVAL_MS;
    const r = startPathLesson(at(5), later);
    expect(r.state.energy).toBe(4);
    expect(r.state.lastRefillAt).toBe(later);
  });
  it('applies any pending passive refill before charging', () => {
    const r = startPathLesson(at(0), T0 + 2 * REFILL_INTERVAL_MS);
    expect(r.ok).toBe(true);
    expect(r.state.energy).toBe(1); // refilled to 2, then -1
  });
  it('is refused at 0 energy with no refill due', () => {
    const r = startPathLesson(at(0), T0);
    expect(r.ok).toBe(false);
    expect(r.state.energy).toBe(0);
  });
  it('canStartPathLesson mirrors the refill-aware check', () => {
    expect(canStartPathLesson(at(0), T0)).toBe(false);
    expect(canStartPathLesson(at(0), T0 + REFILL_INTERVAL_MS)).toBe(true);
    expect(canStartPathLesson(at(1), T0)).toBe(true);
  });
});

describe('mistakes and restores', () => {
  it('a mistake in a path lesson costs 1, never below 0', () => {
    expect(registerMistake(at(3), T0).energy).toBe(2);
    expect(registerMistake(at(0), T0).energy).toBe(0);
  });
  it('a 5-in-a-row combo restores 1', () => {
    expect(restoreFromCombo(at(2), T0).energy).toBe(3);
  });
  it('completing practice/SRS restores 1', () => {
    expect(restoreFromPractice(at(2), T0).energy).toBe(3);
  });
  it('the 0-energy warm-up grants WARMUP_RESTORE', () => {
    expect(warmupRefill(at(0), T0).energy).toBe(WARMUP_RESTORE);
    expect(WARMUP_RESTORE).toBe(2);
  });
  it('restores never exceed the cap', () => {
    expect(restoreFromCombo(at(5), T0).energy).toBe(5);
    expect(warmupRefill(at(5), T0).energy).toBe(5);
  });
  it('a restore that reaches the cap pins the anchor to now', () => {
    const later = T0 + REFILL_INTERVAL_MS; // would also passively give +1
    const r = warmupRefill(at(4), later); // refill->5 already caps
    expect(r.energy).toBe(5);
    expect(r.lastRefillAt).toBe(later);
  });
});

describe('zero-energy invariant (unit-tested per spec §4.4)', () => {
  it('path lessons require energy but every zero-cost action stays available', () => {
    for (let e = 0; e <= MAX_ENERGY; e += 1) {
      const state = at(e);
      expect(isActionAvailable(state, 'path-lesson', T0)).toBe(e >= 1);
      const zero = availableZeroCostActions(state, T0);
      expect(zero).toEqual([...ZERO_COST_ACTIONS]);
      expect(zero).toContain('warmup');
      // INVARIANT: at least one zero-cost study action is ALWAYS offered.
      expect(zero.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('availableActions includes path-lesson only once energy (or refill) permits', () => {
    expect(availableActions(at(0), T0)).not.toContain('path-lesson');
    expect(availableActions(at(0), T0 + REFILL_INTERVAL_MS)).toContain('path-lesson');
    expect(availableActions(at(3), T0)).toContain('path-lesson');
  });
});
