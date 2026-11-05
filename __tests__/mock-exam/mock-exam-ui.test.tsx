import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/db/content-provider', () => {
  const question = {
    id: 'exam-q1',
    type: 'mc',
    domain: 'd1',
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 60,
    stem: 'What keeps an agent loop moving?',
    options: ['Ignore tools', 'Append the tool result', 'End immediately'],
    answerKey: 1,
    explanation: 'The model must observe the tool result before choosing the next action.',
    sourceUrls: ['https://docs.anthropic.com/'],
  };
  return {
    useContentDb: () => ({
      getQuestion: (id: string) => (id === question.id ? question : undefined),
      getLessonForConcept: () => ({ id: 'c1-u1-l3', title: 'The agentic loop' }),
    }),
  };
});

import { ExamPlayer } from '@/features/exams/ExamPlayer';
import { ExamReport } from '@/features/exams/ExamReport';
import { useExamAttemptStore } from '@/state/exam-attempt';
import { useSrsStore } from '@/state/srs';

beforeEach(() => {
  useExamAttemptStore.getState().reset();
  useSrsStore.getState().reset();
});

describe('GC-05 mock-exam UI', () => {
  it('renders the timed player, saves an answer, and exposes flag + navigator controls', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mock-1',
      mode: 'simulation',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 120,
      now: Date.now(),
    });
    await render(<ExamPlayer attempt={attempt} onExit={jest.fn()} />);

    expect(await screen.findByText('2:00:00')).toBeTruthy();
    fireEvent.press(await screen.findByRole('radio', { name: /B\. Append the tool result/i }));
    fireEvent.press(await screen.findByRole('button', { name: 'Save & next' }));
    expect(useExamAttemptStore.getState().activeAttempt?.answers['exam-q1']).toMatchObject({
      selection: [1],
      correct: true,
    });

    fireEvent.press(await screen.findByRole('button', { name: 'Flag question for review' }));
    expect(useExamAttemptStore.getState().activeAttempt?.flaggedQuestionIds).toEqual(['exam-q1']);
    expect(await screen.findByText('Question navigator')).toBeTruthy();
  });

  it('shows immediate explanation in guided practice', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<ExamPlayer attempt={attempt} onExit={jest.fn()} />);
    fireEvent.press(await screen.findByRole('radio', { name: /B\. Append the tool result/i }));
    fireEvent.press(await screen.findByRole('button', { name: 'Check answer' }));

    expect(await screen.findByText('Correct')).toBeTruthy();
    expect(await screen.findByText(/must observe the tool result/i)).toBeTruthy();
  });

  it('renders the transparent estimate disclaimer and captures misses for review', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'simulation',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    useExamAttemptStore.getState().submit('manual', Date.now());
    const completed = useExamAttemptStore.getState().activeAttempt;
    if (!completed) throw new Error('expected completed attempt');

    await render(<ExamReport attempt={completed} onDone={jest.fn()} onRelearn={jest.fn()} />);
    expect(await screen.findByText('100')).toBeTruthy();
    expect(await screen.findByText(/not Anthropic official equating/i)).toBeTruthy();
    expect(await screen.findByText('Your patch plan')).toBeTruthy();
    expect(useSrsStore.getState().cards['exam-q1']).toBeDefined();
  });
});
