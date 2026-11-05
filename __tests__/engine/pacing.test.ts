import { describe, expect, it } from '@jest/globals';
import { computeStudyPace } from '../../src/engine/pacing';
import { DAY_MS } from '../../src/engine/time';

describe('exam-date pacing', () => {
  it('translates lessons remaining and exam date into a weekly pace', () => {
    expect(computeStudyPace(28 * DAY_MS, 0, 56)).toEqual({ daysRemaining: 28, lessonsRemaining: 56, lessonsPerWeek: 14, status: 'focused' });
    expect(computeStudyPace(28 * DAY_MS, 0, 20).lessonsPerWeek).toBe(5);
    expect(computeStudyPace(28 * DAY_MS, 0, 0).status).toBe('complete');
  });
});
