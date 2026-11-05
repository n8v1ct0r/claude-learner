import { addDays, diffDays } from './time';

export interface CommitmentState { active: boolean; periodStart: string; targetDays: 3 | 5 | 7; studiedDates: string[]; bonusChests: number }

export function createCommitment(periodStart: string, targetDays: 3 | 5 | 7): CommitmentState {
  return { active: true, periodStart, targetDays, studiedDates: [], bonusChests: 0 };
}

export function advanceCommitment(state: CommitmentState, today: string, studied: boolean): CommitmentState {
  if (!state.active) return state;
  const elapsed = diffDays(state.periodStart, today);
  let current = state;
  if (elapsed >= 7) {
    const earned = state.studiedDates.length >= state.targetDays ? 1 : 0;
    current = { ...state, periodStart: addDays(state.periodStart, Math.floor(elapsed / 7) * 7), studiedDates: [], bonusChests: state.bonusChests + earned };
  }
  if (!studied || current.studiedDates.includes(today)) return current;
  return { ...current, studiedDates: [...current.studiedDates, today] };
}

export function claimCommitmentBonus(state: CommitmentState): CommitmentState {
  return state.bonusChests > 0 ? { ...state, bonusChests: state.bonusChests - 1 } : state;
}
