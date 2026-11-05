// __tests__/mock-exam/exam-start-confirm.test.tsx — FT-3 at the Exams tab.
//
// With an exam in progress, tapping Start on any exam must ask first. Keeping the saved exam changes
// nothing; confirming closes the old attempt as abandoned (unscored) and starts the new one.

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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

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
  const exams = [
    { id: 'mini-d1', kind: 'mini', title: 'Agentic Architecture Mini', timeLimitMinutes: 25, questionCount: 1 },
    { id: 'mini-d2', kind: 'mini', title: 'Tool Design Mini', timeLimitMinutes: 25, questionCount: 1 },
  ];
  return {
    useContentDb: () => ({
      listCourses: () => [],
      getCourse: () => undefined,
      listExams: () => exams,
      getExam: (id: string) => {
        const exam = exams.find((candidate) => candidate.id === id);
        return exam ? { ...exam, questionIds: [question.id] } : undefined;
      },
      getQuestion: (id: string) => (id === question.id ? question : undefined),
      getLessonForConcept: () => undefined,
    }),
  };
});

import ExamsScreen from '../../app/(tabs)/exams';
import { ExamHub } from '@/features/exams/ExamHub';
import { useExamAttemptStore } from '@/state/exam-attempt';

beforeEach(() => {
  useExamAttemptStore.getState().reset();
});

function startSavedMini(): string {
  const attempt = useExamAttemptStore.getState().start({
    examId: 'mini-d1',
    mode: 'practice',
    questionIds: ['exam-q1'],
    timeLimitMinutes: 25,
    now: Date.now(),
  });
  return attempt.attemptId;
}

describe('starting an exam while another is in progress (FT-3)', () => {
  it('asks before replacing, and "Keep saved exam" changes nothing', async () => {
    startSavedMini();
    const onStart = jest.fn();
    await render(<ExamHub activeAttempt={useExamAttemptStore.getState().activeAttempt} onStart={onStart} onResume={jest.fn()} />);

    const [, secondCardStart] = await screen.findAllByRole('button', { name: 'Start simulation' });
    await fireEvent.press(secondCardStart);

    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByText('Start a new exam?')).toBeTruthy();
    expect(screen.getByText(/Agentic Architecture Mini attempt \(0\/1 answered\) will close without a score/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Keep saved exam' }));
    expect(screen.queryByText('Start a new exam?')).toBeNull();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('confirming starts the new exam with the chosen mode', async () => {
    startSavedMini();
    const onStart = jest.fn();
    await render(<ExamHub activeAttempt={useExamAttemptStore.getState().activeAttempt} onStart={onStart} onResume={jest.fn()} />);

    const guided = await screen.findAllByRole('button', { name: 'Guided practice' });
    await fireEvent.press(guided[1]);
    await fireEvent.press(screen.getByRole('button', { name: 'Start new exam' }));

    expect(onStart).toHaveBeenCalledWith('mini-d2', 'practice');
  });

  it('starts straight away when nothing is in progress', async () => {
    const onStart = jest.fn();
    await render(<ExamHub activeAttempt={null} onStart={onStart} onResume={jest.fn()} />);
    const [firstStart] = await screen.findAllByRole('button', { name: 'Start simulation' });
    await fireEvent.press(firstStart);
    expect(onStart).toHaveBeenCalledWith('mini-d1', 'simulation');
    expect(screen.queryByText('Start a new exam?')).toBeNull();
  });

  it('on the Exams tab, confirming closes the saved attempt as abandoned and opens the new one', async () => {
    const savedId = startSavedMini();
    await render(<ExamsScreen />);

    // The saved attempt opens in the player; leave it to reach the hub.
    await fireEvent.press(await screen.findByRole('button', { name: 'Save and exit exam' }));
    expect(await screen.findByText('Resume where you stopped')).toBeTruthy();

    const [, secondCardStart] = screen.getAllByRole('button', { name: 'Start simulation' });
    await fireEvent.press(secondCardStart);
    expect(useExamAttemptStore.getState().activeAttempt?.attemptId).toBe(savedId);

    await fireEvent.press(screen.getByRole('button', { name: 'Start new exam' }));
    const state = useExamAttemptStore.getState();
    expect(state.activeAttempt?.examId).toBe('mini-d2');
    expect(state.abandonedAttemptIds).toEqual([savedId]);
    expect(state.history).toEqual([]);
    expect(await screen.findByRole('button', { name: 'Save and exit exam' })).toBeTruthy();
  });

  it('moves VoiceOver focus to the "Start a new exam?" question when the panel replaces the tapped button', async () => {
    startSavedMini();
    const sendEvent = AccessibilityInfo.sendAccessibilityEvent as unknown as jest.Mock;
    sendEvent.mockClear();
    await render(<ExamHub activeAttempt={useExamAttemptStore.getState().activeAttempt} onStart={jest.fn()} onResume={jest.fn()} />);
    expect(sendEvent).not.toHaveBeenCalled();

    const [, secondCardStart] = await screen.findAllByRole('button', { name: 'Start simulation' });
    await fireEvent.press(secondCardStart);

    expect(screen.getByRole('header', { name: 'Start a new exam?' })).toBeTruthy();
    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent.mock.calls[0][1]).toBe('focus');
    // The focus target is that heading: the panel's question.
    const target = sendEvent.mock.calls[0][0] as { props: { accessibilityRole?: string; children?: { props?: { children?: unknown } } } };
    expect(target.props.accessibilityRole).toBe('header');
    expect(target.props.children?.props?.children).toBe('Start a new exam?');
  });
});
