import { DAY_MS } from './time';

export interface StudyPace { daysRemaining: number; lessonsRemaining: number; lessonsPerWeek: number; status: 'complete' | 'steady' | 'focused' }

export function computeStudyPace(examDate: number, now: number, lessonsRemaining: number): StudyPace {
  const daysRemaining = Math.max(0, Math.ceil((examDate - now) / DAY_MS));
  const remaining = Math.max(0, Math.trunc(lessonsRemaining));
  const weeks = Math.max(daysRemaining / 7, 1 / 7);
  const lessonsPerWeek = remaining === 0 ? 0 : Math.ceil(remaining / weeks);
  return { daysRemaining, lessonsRemaining: remaining, lessonsPerWeek, status: remaining === 0 ? 'complete' : lessonsPerWeek <= 7 ? 'steady' : 'focused' };
}
