import { describe, expect, it } from '@jest/globals';

import { selectLessonDecisionSet } from '@/features/lesson-player/question-selection';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';

describe('lesson decision set', () => {
  it('serves a concise, stable mix from the larger lesson bank', () => {
    const first = selectLessonDecisionSet(l1WorkflowsVsAgents.exercises);
    const second = selectLessonDecisionSet(l1WorkflowsVsAgents.exercises);

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0].id).toBe('c1-u1-l1-q01');
    expect(first.some((question) => question.variant === 'scenario')).toBe(true);
    expect(first.some((question) => question.variant === 'spot-bug')).toBe(true);
    expect(first.some((question) => question.type === 'multi')).toBe(true);
    expect(first.some((question) => ['match', 'order', 'cloze'].includes(question.type))).toBe(true);
    expect(first.some((question) => question.variant === 'tf-speed')).toBe(false);
  });

  it('keeps short authored lessons intact', () => {
    const source = l1WorkflowsVsAgents.exercises.slice(0, 3);
    expect(selectLessonDecisionSet(source)).toEqual(source);
  });
});
