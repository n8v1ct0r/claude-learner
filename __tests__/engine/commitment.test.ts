import { describe, expect, it } from '@jest/globals';
import { advanceCommitment, claimCommitmentBonus, createCommitment } from '../../src/engine/commitment';

describe('gain-framed commitment', () => {
  it('earns a bonus chest when the chosen 7-day goal is met and silently renews', () => {
    let state = createCommitment('2026-07-01', 3);
    state = advanceCommitment(state, '2026-07-01', true);
    state = advanceCommitment(state, '2026-07-02', true);
    state = advanceCommitment(state, '2026-07-03', true);
    state = advanceCommitment(state, '2026-07-08', false);
    expect(state.bonusChests).toBe(1);
    expect(state.periodStart).toBe('2026-07-08');
    expect(claimCommitmentBonus(state).bonusChests).toBe(0);
  });

  it('renews with no negative balance when a week is quieter', () => {
    const state = advanceCommitment(createCommitment('2026-07-01', 7), '2026-07-08', false);
    expect(state.bonusChests).toBe(0);
    expect(state.studiedDates).toEqual([]);
    expect(Object.values(state).every((value) => typeof value !== 'number' || value >= 0)).toBe(true);
  });
});
