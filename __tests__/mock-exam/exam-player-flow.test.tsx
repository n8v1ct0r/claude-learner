// __tests__/mock-exam/exam-player-flow.test.tsx — moving through an exam (smoke fixes).
//
//   • Every question opens at the top. The question scroller used to survive question changes, so a
//     question inherited the previous one's scroll offset: on Q2 the task chips were scrolled away, on
//     Q4 "Save & next" sat under the tab bar. Jest has no scroll engine, so this pins the mechanism: each
//     question gets a fresh scroller (a new native scroll view starts at offset 0), while guided feedback
//     on the same question keeps the learner's place.
//   • Submitting with unanswered questions asks first. "Submit 1/4 answered" used to submit on the spot.
//     The in-place confirm step (the same panel as "Start a new exam?") says how many are unanswered,
//     moves VoiceOver to that question, and offers "Submit anyway" / "Keep going".

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/db/content-provider', () => {
  const question = (n: number) => ({
    id: `exam-q${n}`,
    type: 'mc',
    domain: 'd1',
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 60,
    stem: `Question ${n}: what keeps an agent loop moving?`,
    options: ['Ignore tools', 'Append the tool result', 'End immediately'],
    answerKey: 1,
    explanation: 'The model must observe the tool result before choosing the next action.',
    sourceUrls: ['https://docs.anthropic.com/'],
  });
  const questions = [1, 2, 3, 4].map(question);
  return {
    useContentDb: () => ({
      getQuestion: (id: string) => questions.find((candidate) => candidate.id === id),
      getLessonForConcept: () => undefined,
    }),
  };
});

import { ExamPlayer } from '@/features/exams/ExamPlayer';
import { useExamAttemptStore, type ExamAttempt } from '@/state/exam-attempt';

const QUESTION_IDS = ['exam-q1', 'exam-q2', 'exam-q3', 'exam-q4'];

interface HostNode {
  type: string;
  props: Record<string, unknown>;
  parent: HostNode | null;
}

/** The native scroll view a question's stem is rendered in. */
function scrollerOf(node: unknown): HostNode {
  let current = node as HostNode | null;
  while (current && current.type !== 'RCTScrollView') current = current.parent;
  if (!current) throw new Error('expected the question inside a scroll view');
  return current;
}

beforeEach(() => {
  useExamAttemptStore.getState().reset();
});

function startSimulation(): ExamAttempt {
  return useExamAttemptStore.getState().start({
    examId: 'mini-d1',
    mode: 'simulation',
    questionIds: QUESTION_IDS,
    timeLimitMinutes: 25,
    now: Date.now(),
  });
}

/** Render the player the way the Exams tab does: always from the store's live attempt. */
function LivePlayer() {
  const attempt = useExamAttemptStore((state) => state.activeAttempt);
  return attempt ? <ExamPlayer attempt={attempt} onExit={() => undefined} /> : null;
}

describe('moving between exam questions', () => {
  it('opens every question at the top, in a fresh scroller, whatever the previous question scrolled to', async () => {
    startSimulation();
    await render(<LivePlayer />);
    // The learner scrolls down to reach "Save & next" on Q1.
    const first = scrollerOf(await screen.findByText(/^Question 1:/));
    await fireEvent.scroll(first as never, { nativeEvent: { contentOffset: { x: 0, y: 640 } } });
    await fireEvent.press(screen.getByRole('radio', { name: /B\. Append the tool result/i }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save & next' }));

    const second = scrollerOf(await screen.findByText(/^Question 2:/));
    expect(second).not.toBe(first);
    expect(second.props.contentOffset).toBeUndefined();

    // Saving Q2 moves on to Q3 in yet another fresh scroller.
    await fireEvent.scroll(second as never, { nativeEvent: { contentOffset: { x: 0, y: 900 } } });
    await fireEvent.press(screen.getByRole('radio', { name: /B\. Append the tool result/i }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save & next' }));
    const third = scrollerOf(await screen.findByText(/^Question 3:/));
    expect(third).not.toBe(second);
    expect(third.props.contentOffset).toBeUndefined();
  });

  it('keeps the scroll position while the same question shows its guided feedback', async () => {
    useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: QUESTION_IDS,
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<LivePlayer />);
    const scroller = scrollerOf(await screen.findByText(/^Question 1:/));
    await fireEvent.press(screen.getByRole('radio', { name: /B\. Append the tool result/i }));
    await fireEvent.press(screen.getByRole('button', { name: 'Check answer' }));
    expect(await screen.findByText('Correct')).toBeTruthy();
    // Same question: the feedback appears in place, below the options the learner just answered.
    expect(scrollerOf(screen.getByText(/^Question 1:/))).toBe(scroller);
  });
});

describe('submitting with unanswered questions', () => {
  /** Answer Q1 only, then open the navigator from Q2. */
  async function answerOneAndOpenNavigator(): Promise<void> {
    startSimulation();
    await render(<LivePlayer />);
    await fireEvent.press(await screen.findByRole('radio', { name: /B\. Append the tool result/i }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save & next' }));
    await screen.findByText(/^Question 2:/);
    await fireEvent.press(screen.getByRole('button', { name: 'Question 2 of 4' }));
    expect(await screen.findByText('Question navigator')).toBeTruthy();
  }

  it('asks first, saying how many questions are unanswered, instead of submitting', async () => {
    await answerOneAndOpenNavigator();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit 1/4 answered' }));

    expect(useExamAttemptStore.getState().activeAttempt?.completedAt).toBeNull();
    expect(screen.getByRole('header', { name: 'Submit with 3 unanswered?' })).toBeTruthy();
    expect(
      screen.getByText('3 of 4 questions have no answer yet. Unanswered questions count as misses in your estimated score.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit anyway' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy();
    // One decision at a time: the confirm step replaces the submit and back buttons.
    expect(screen.queryByRole('button', { name: 'Submit 1/4 answered' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Back to question' })).toBeNull();
  });

  it('moves VoiceOver focus to the question when the confirm step replaces the tapped button', async () => {
    await answerOneAndOpenNavigator();
    const sendEvent = AccessibilityInfo.sendAccessibilityEvent as unknown as jest.Mock;
    sendEvent.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit 1/4 answered' }));

    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent.mock.calls[0][1]).toBe('focus');
    const target = sendEvent.mock.calls[0][0] as { props: { accessibilityRole?: string; children?: { props?: { children?: unknown } } } };
    expect(target.props.accessibilityRole).toBe('header');
    expect(target.props.children?.props?.children).toBe('Submit with 3 unanswered?');
  });

  it('"Submit anyway" submits the exam', async () => {
    await answerOneAndOpenNavigator();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit 1/4 answered' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Submit anyway' }));

    const attempt = useExamAttemptStore.getState().activeAttempt;
    expect(attempt?.completedAt).not.toBeNull();
    expect(attempt?.submittedReason).toBe('manual');
  });

  it('"Keep going" opens the first unanswered question and submits nothing', async () => {
    await answerOneAndOpenNavigator();
    await fireEvent.press(screen.getByRole('button', { name: 'Submit 1/4 answered' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Keep going' }));

    expect(useExamAttemptStore.getState().activeAttempt?.completedAt).toBeNull();
    expect(await screen.findByText(/^Question 2:/)).toBeTruthy();
    expect(screen.queryByText('Question navigator')).toBeNull();
    // Reopening the navigator starts from its plain state again.
    await fireEvent.press(screen.getByRole('button', { name: 'Question 2 of 4' }));
    expect(screen.getByRole('button', { name: 'Submit 1/4 answered' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Submit with 3 unanswered?' })).toBeNull();
  });

  it('submits straight away once every question is answered', async () => {
    startSimulation();
    await render(<LivePlayer />);
    for (const n of [1, 2, 3, 4]) {
      await screen.findByText(new RegExp(`^Question ${n}:`));
      await fireEvent.press(screen.getByRole('radio', { name: /B\. Append the tool result/i }));
      await fireEvent.press(screen.getByRole('button', { name: 'Save & next' }));
    }
    await fireEvent.press(await screen.findByRole('button', { name: 'Submit exam' }));

    expect(useExamAttemptStore.getState().activeAttempt?.completedAt).not.toBeNull();
    expect(screen.queryByRole('header', { name: /^Submit with/ })).toBeNull();
  });
});
