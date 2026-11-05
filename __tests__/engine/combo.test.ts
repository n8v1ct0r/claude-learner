import { describe, expect, it } from '@jest/globals';

import {
  COMBO_FLARE_INTERVAL,
  comboAccuracy,
  createComboState,
  lessonComboBonus,
  recordAnswer,
} from '@/engine/combo';
import type { ComboState } from '@/engine/combo';
import { comboBonus } from '@/engine/xp';

/** Feed a sequence of correct/incorrect answers, returning the final state + the last event. */
function play(seq: boolean[]): { state: ComboState; events: ReturnType<typeof recordAnswer>['event'][] } {
  let state = createComboState();
  const events = seq.map((correct) => {
    const r = recordAnswer(state, correct);
    state = r.state;
    return r.event;
  });
  return { state, events };
}

describe('createComboState', () => {
  it('starts empty', () => {
    expect(createComboState()).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      flares: 0,
    });
  });
});

describe('recordAnswer', () => {
  it('increments the running streak on a correct answer', () => {
    const { state, events } = play([true, true, true]);
    expect(state.currentStreak).toBe(3);
    expect(state.bestStreak).toBe(3);
    expect(state.totalCorrect).toBe(3);
    expect(state.totalAnswered).toBe(3);
    expect(events[2]).toMatchObject({ correct: true, currentStreak: 3, flare: false, broken: false });
  });

  it('resets the running streak on an incorrect answer but preserves the best', () => {
    const { state, events } = play([true, true, false]);
    expect(state.currentStreak).toBe(0);
    expect(state.bestStreak).toBe(2);
    expect(events[2]).toMatchObject({ correct: false, currentStreak: 0, broken: true });
  });

  it('marks broken=false when an incorrect answer follows no streak', () => {
    const { events } = play([false]);
    expect(events[0]).toMatchObject({ correct: false, broken: false, flare: false });
  });

  it('raises a combo flare on every Nth consecutive correct answer', () => {
    const { state, events } = play([true, true, true, true, true]);
    expect(COMBO_FLARE_INTERVAL).toBe(5);
    expect(events[4].flare).toBe(true);
    expect(state.flares).toBe(1);
    expect(events.slice(0, 4).every((e) => e.flare === false)).toBe(true);
  });

  it('flares again after a second run of five, and a break restarts the count', () => {
    // 5 correct (flare) -> 1 wrong (reset) -> 5 correct (flare again) => 2 flares.
    const seq = [...Array(5).fill(true), false, ...Array(5).fill(true)];
    const { state } = play(seq);
    expect(state.flares).toBe(2);
    expect(state.bestStreak).toBe(5);
    expect(state.totalCorrect).toBe(10);
  });
});

describe('comboAccuracy', () => {
  it('is 0 before any answers', () => {
    expect(comboAccuracy(createComboState())).toBe(0);
  });
  it('reflects correct / answered', () => {
    const { state } = play([true, false, true, true]);
    expect(comboAccuracy(state)).toBeCloseTo(3 / 4);
  });
});

describe('lessonComboBonus (feeds the XP economy)', () => {
  it('maps the best in-lesson streak through the XP comboBonus curve', () => {
    const { state } = play([true, true, true, true, true, true]); // bestStreak 6
    expect(lessonComboBonus(state)).toBe(comboBonus(6));
    expect(lessonComboBonus(state)).toBe(5);
  });
  it('is 0 when nothing was chained', () => {
    const { state } = play([false, false]);
    expect(lessonComboBonus(state)).toBe(0);
  });
});
