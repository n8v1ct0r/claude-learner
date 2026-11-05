import { describe, expect, it } from '@jest/globals';

import {
  bandForPercent,
  estimateScaledScore,
  formatCountdown,
  gradeExamSelection,
  paceBand,
  readinessForScore,
  remainingSeconds,
  scoreExam,
} from '../../src/engine/mock-exam';
import type { Question } from '../../content/schema/types';

const mc = (id: string, domain: 'd1' | 'd2', answerKey = 1, taskStatement = domain === 'd1' ? '1.1' : '2.1'): Question => ({
  id,
  type: 'mc',
  domain,
  conceptId: `${domain}-concept`,
  taskStatement,
  difficulty: 2,
  estimatedSeconds: 60,
  stem: 'Which option is correct?',
  options: ['A', 'B', 'C'],
  answerKey,
  explanation: 'B is correct.',
  sourceUrls: ['https://docs.anthropic.com/'],
});

describe('mock-exam engine', () => {
  it('grades MC and multi-select responses without accepting partial credit', () => {
    const base = mc('multi', 'd1');
    if (base.type !== 'mc') throw new Error('fixture must be MC');
    const multi: Question = {
      ...base,
      type: 'multi',
      selectCount: 2,
      answerKey: [0, 2],
    };
    expect(gradeExamSelection(mc('mc', 'd1'), [1])).toBe(true);
    expect(gradeExamSelection(mc('mc', 'd1'), [0])).toBe(false);
    expect(gradeExamSelection(multi, [2, 0])).toBe(true);
    expect(gradeExamSelection(multi, [0])).toBe(false);
    expect(gradeExamSelection(multi, [0, 1])).toBe(false);
    expect(gradeExamSelection(multi, undefined)).toBe(false);
  });

  it('uses the signed 100–1000 score estimate for full and mini exams', () => {
    expect(estimateScaledScore(0, 60)).toBe(100);
    expect(estimateScaledScore(42, 60)).toBe(730);
    expect(estimateScaledScore(60, 60)).toBe(1000);
    expect(estimateScaledScore(13, 18)).toBe(750);
    expect(estimateScaledScore(99, 60)).toBe(1000);
  });

  it('applies exact readiness and domain-band boundaries', () => {
    expect(readinessForScore(649)).toBe('keep-building');
    expect(readinessForScore(650)).toBe('getting-close');
    expect(readinessForScore(769)).toBe('getting-close');
    expect(readinessForScore(770)).toBe('likely-ready');
    expect(bandForPercent(59)).toBe('needs-work');
    expect(bandForPercent(60)).toBe('borderline');
    expect(bandForPercent(80)).toBe('strong');
  });

  it('builds a weakest-domain-first report and patch list', () => {
    const result = scoreExam([
      { question: mc('d1-a', 'd1'), selection: [1] },
      { question: mc('d1-b', 'd1'), selection: [0] },
      { question: mc('d2-a', 'd2'), selection: [0] },
      { question: mc('d2-b', 'd2'), selection: undefined },
    ]);
    expect(result.correct).toBe(1);
    expect(result.estimatedScore).toBe(325);
    expect(result.missedQuestionIds).toEqual(['d1-b', 'd2-a', 'd2-b']);
    expect(result.domains.map((domain) => [domain.domain, domain.percent, domain.band])).toEqual([
      ['d2', 0, 'needs-work'],
      ['d1', 50, 'needs-work'],
    ]);
    expect(result.tasks.map((task) => [task.taskStatement, task.percent, task.missedQuestionIds])).toEqual([
      ['2.1', 0, ['d2-a', 'd2-b']],
      ['1.1', 50, ['d1-b']],
    ]);
  });

  it('counts down deterministically and hits zero at the deadline', () => {
    expect(remainingSeconds(10_000, 8_001)).toBe(2);
    expect(remainingSeconds(10_000, 10_000)).toBe(0);
    expect(remainingSeconds(10_000, 12_000)).toBe(0);
    expect(formatCountdown(7_265)).toBe('2:01:05');
    expect(formatCountdown(65)).toBe('1:05');
  });

  it('reports ahead, on-pace, and behind from answered vs elapsed share', () => {
    const common = { total: 60, allowedSeconds: 7_200 };
    expect(paceBand({ ...common, answered: 35, elapsedSeconds: 3_600 })).toBe('ahead');
    expect(paceBand({ ...common, answered: 30, elapsedSeconds: 3_600 })).toBe('on-pace');
    expect(paceBand({ ...common, answered: 20, elapsedSeconds: 3_600 })).toBe('behind');
  });
});
