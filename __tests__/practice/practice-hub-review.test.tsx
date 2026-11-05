// __tests__/practice/practice-hub-review.test.tsx — FT-1 at the Practice hub edge.
//
// The hub must only offer "Start review" when the session it launches has questions in it, and it must
// be able to load the exam-register questions that mock and mini exams capture as misses (they are not
// lesson exercises, so they resolve through the content reader, not the course tree).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return {
    SafeAreaView: rn.View,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/db/content-provider', () => {
  const {
    l1WorkflowsVsAgents,
  } = require('../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents');
  const course = {
    id: 'c1',
    domain: 'd1',
    title: 'Agentic Architecture',
    description: 'Course under test',
    order: 0,
    units: [{ id: 'c1-u1', title: 'Unit 1', order: 0, lessons: [l1WorkflowsVsAgents] }],
  };
  // Standalone exam-register questions: reachable only through getQuestion, like the real reader.
  const register = new Map(
    Array.from({ length: 60 }, (_, i) => {
      const id = `reg-d1-q${String(i + 1).padStart(2, '0')}`;
      return [
        id,
        {
          id,
          type: 'mc',
          domain: 'd1',
          conceptId: l1WorkflowsVsAgents.concept.conceptId,
          taskStatement: '1.1',
          difficulty: 2,
          estimatedSeconds: 60,
          stem: `Register decision ${i + 1}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answerKey: 1,
          explanation: 'Register explanation.',
          sourceUrls: ['https://docs.anthropic.com/'],
        },
      ];
    }),
  );
  // One reader for the whole run, like the app's context-provided reader (a stable identity).
  const reader = {
    listCourses: () => [{ id: 'c1', domain: 'd1', title: course.title, description: '', order: 0 }],
    getCourse: () => course,
    getQuestion: (id: string) => register.get(id),
  };
  return { useContentDb: () => reader };
});

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';
import { DAY_MS } from '@/engine/time';
import { PracticeHub } from '@/features/practice/PracticeHub';
import type { PracticeSession } from '@/features/practice/practice-content';
import { useSettingsStore } from '@/state/settings';
import { useSrsStore } from '@/state/srs';

const conceptId = l1WorkflowsVsAgents.concept.conceptId;

beforeEach(() => {
  useSrsStore.getState().reset();
  useSettingsStore.getState().reset(); // 10-minute goal → 20-card cap
});

describe('Practice hub review launch (FT-1)', () => {
  it('launches a non-empty review after a mock with 25 misses, with a seat for a later lesson miss', async () => {
    const now = Date.now();
    for (let i = 0; i < 25; i += 1) {
      useSrsStore.getState().recordMistake(`reg-d1-q${String(i + 1).padStart(2, '0')}`, conceptId, now - 2 * DAY_MS);
    }
    const lessonQuestion = l1WorkflowsVsAgents.exercises[0];
    useSrsStore.getState().recordMistake(lessonQuestion.id, conceptId, now - DAY_MS);

    const onLaunch = jest.fn<(session: PracticeSession) => void>();
    await render(<PracticeHub onLaunch={onLaunch} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Start review' }));

    expect(onLaunch).toHaveBeenCalledTimes(1);
    const session = onLaunch.mock.calls[0][0];
    expect(session.kind).toBe('review');
    // While the lesson miss is due, exam misses take at most half of the 20 seats.
    expect(session.questions).toHaveLength(11);
    expect(session.questions.filter((question) => question.id.startsWith('reg-d1-q'))).toHaveLength(10);
    expect(session.questions.map((question) => question.id)).toContain(lessonQuestion.id);
  });

  it('reviews a lesson miss in the first session after a 60-miss mock on a 5-minute goal', async () => {
    useSettingsStore.getState().setDailyGoalMinutes(5); // 10 seats
    const now = Date.now();
    for (let i = 0; i < 60; i += 1) {
      useSrsStore.getState().recordMistake(`reg-d1-q${String(i + 1).padStart(2, '0')}`, conceptId, now - 2 * DAY_MS);
    }
    const lessonQuestion = l1WorkflowsVsAgents.exercises[1];
    useSrsStore.getState().recordMistake(lessonQuestion.id, conceptId, now - DAY_MS);

    const onLaunch = jest.fn<(session: PracticeSession) => void>();
    await render(<PracticeHub onLaunch={onLaunch} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Start review' }));

    const ids = onLaunch.mock.calls[0][0].questions.map((question) => question.id);
    expect(ids).toContain(lessonQuestion.id);
    expect(ids.filter((id) => id.startsWith('reg-'))).toHaveLength(5);
  });

  it('never offers "Start review" when the only due cards cannot be loaded', async () => {
    const now = Date.now();
    for (let i = 0; i < 12; i += 1) useSrsStore.getState().recordMistake(`retired-q${i}`, conceptId, now - 2 * DAY_MS);

    const onLaunch = jest.fn();
    await render(<PracticeHub onLaunch={onLaunch} />);

    expect(await screen.findByText(/all caught up/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start review' })).toBeNull();
    // A topic deck is listed only when at least one of its cards can be opened.
    expect(screen.queryByText('Topics to revisit')).toBeNull();
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('never opens an empty review when the "Start review" framing has gone stale', async () => {
    const onLaunch = jest.fn();
    await render(<PracticeHub onLaunch={onLaunch} />);
    expect(await screen.findByText(/all caught up/i)).toBeTruthy(); // nothing is due

    // The framing snapshot goes stale: it still offers a review the deck no longer has.
    await act(async () => {
      useSrsStore.setState({ reviewHasCards: true });
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Start review' }));

    expect(onLaunch).not.toHaveBeenCalled();
    expect(useSrsStore.getState().reviewHasCards).toBe(false); // the framing was refreshed instead
    expect(await screen.findByText(/all caught up/i)).toBeTruthy();
  });

  it('lists a topic deck for exam misses and opens it with their questions', async () => {
    useSrsStore.getState().recordMistake('reg-d1-q01', conceptId, Date.now() - DAY_MS);

    const onLaunch = jest.fn<(session: PracticeSession) => void>();
    await render(<PracticeHub onLaunch={onLaunch} />);
    await fireEvent.press(await screen.findByRole('button', { name: `Review ${l1WorkflowsVsAgents.title}` }));

    expect(onLaunch.mock.calls[0][0].questions.map((question) => question.id)).toEqual(['reg-d1-q01']);
  });
});
