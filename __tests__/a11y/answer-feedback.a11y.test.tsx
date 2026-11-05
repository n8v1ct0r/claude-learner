// __tests__/a11y/answer-feedback.a11y.test.tsx  (AP-3, AP-4, WR-13)
//
// VoiceOver contract for graded answers:
//   • the result is ANNOUNCED (announceForAccessibility — role "alert" is silent on iOS), with the best
//     answer written out after a miss, in lessons and in guided exams;
//   • only the learner's own pick is accessibilityState.selected, and once graded the label says the
//     result in words, so correctness never rides on colour alone — in lessons and in the exam review.

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
    sourceUrls: ['https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls'],
  };
  return {
    useContentDb: () => ({
      getQuestion: (id: string) => (id === question.id ? question : undefined),
      getLessonForConcept: () => ({ id: 'c1-u1-l3', title: 'The agentic loop' }),
    }),
  };
});

import { setHapticsEnabled } from '@/design/haptics';
import { ExamPlayer } from '@/features/exams/ExamPlayer';
import { ExamReport } from '@/features/exams/ExamReport';
import { ExerciseStep } from '@/features/lesson-player/ExerciseStep';
import { answerAnnouncement, bestAnswerText } from '@/features/lesson-player/answer-text';
import { OptionCard } from '@/features/lesson-player/OptionCard';
import { MatchRenderer } from '@/features/lesson-player/renderers/MatchRenderer';
import { McRenderer } from '@/features/lesson-player/renderers/McRenderer';
import { MultiRenderer } from '@/features/lesson-player/renderers/MultiRenderer';
import { OrderRenderer } from '@/features/lesson-player/renderers/OrderRenderer';
import { useExamAttemptStore } from '@/state/exam-attempt';
import { useSrsStore } from '@/state/srs';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';
import type { MatchQuestion, McQuestion, MultiQuestion, OrderQuestion } from '../../content/schema/types';

const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

const mc = l1WorkflowsVsAgents.exercises.find((q) => q.id === 'c1-u1-l1-q01') as McQuestion;
const multi = l1WorkflowsVsAgents.exercises.find((q) => q.id === 'c1-u1-l1-q07') as MultiQuestion;
const order = l1WorkflowsVsAgents.exercises.find((q) => q.id === 'c1-u1-l1-q09') as OrderQuestion;

const match: MatchQuestion = {
  id: 'fixture-match-q01',
  type: 'match',
  domain: 'd1',
  conceptId: 'workflows-vs-agents',
  taskStatement: '1.1',
  difficulty: 2,
  estimatedSeconds: 40,
  stem: 'Match each stop_reason to what it means.',
  pairs: [
    { left: 'end_turn', right: 'The model finished its turn' },
    { left: 'tool_use', right: 'The model is calling a tool' },
    { left: 'max_tokens', right: 'The output hit the length cap' },
  ],
  explanation: 'These are common stop_reason values from the Messages API.',
  sourceUrls: ['https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons'],
};

const trimmed = (text: string): string => text.replace(/\.+$/, '');

beforeEach(() => {
  announce.mockClear();
  setHapticsEnabled(false);
  useExamAttemptStore.getState().reset();
  useSrsStore.getState().reset();
});

describe('announcements', () => {
  it('writes out the keyed answer for every question type', () => {
    expect(bestAnswerText(mc)).toBe(mc.options[mc.answerKey]);
    expect(bestAnswerText(multi)).toBe(multi.answerKey.map((i) => multi.options[i]).join('; '));
    expect(bestAnswerText(order)).toBe(order.answerKey.map((s, p) => `${p + 1}. ${order.steps[s]}`).join('; '));
    expect(bestAnswerText(match)).toContain('end_turn: The model finished its turn');
    expect(answerAnnouncement(true, 'anything')).toBe('Correct.');
    expect(answerAnnouncement(false, 'Plan first.')).toBe('Not quite. Best answer: Plan first.');
  });

  it('announces a correct lesson answer when the feedback appears', async () => {
    await render(
      <ExerciseStep question={mc} pending={{ correct: true, explanation: mc.explanation }} onAnswer={jest.fn()} onContinue={jest.fn()} />,
    );
    expect(announce).toHaveBeenCalledWith('Correct.');
  });

  it('announces the best answer after a lesson miss', async () => {
    await render(
      <ExerciseStep question={mc} pending={{ correct: false, explanation: mc.explanation }} onAnswer={jest.fn()} onContinue={jest.fn()} />,
    );
    expect(announce).toHaveBeenCalledWith(`Not quite. Best answer: ${trimmed(mc.options[mc.answerKey])}.`);
  });

  it('announces the result of a guided exam check', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<ExamPlayer attempt={attempt} onExit={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'A. Ignore tools' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Check answer' }));
    expect(announce).toHaveBeenCalledWith('Not quite. Best answer: Append the tool result.');

    // The revealed options say the result in words; only the learner's pick is selected.
    const pick = screen.getByRole('radio', { name: 'A. Ignore tools. Your answer, not quite.' });
    expect(pick.props.accessibilityState).toMatchObject({ selected: true, checked: true });
    const best = screen.getByRole('radio', { name: 'B. Append the tool result. Correct answer.' });
    expect(best.props.accessibilityState).toMatchObject({ selected: false, checked: false });
    expect(screen.getByText('✓')).toBeTruthy();
    expect(screen.getByText('•')).toBeTruthy();
  });

  it('announces match connections, since the amber flash is visual only', async () => {
    await render(<MatchRenderer question={match} answered={false} onAnswer={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'tool_use' }));
    await fireEvent.press(screen.getByRole('button', { name: 'The output hit the length cap' }));
    expect(announce).toHaveBeenLastCalledWith('Not a match. Try another answer.');

    await fireEvent.press(screen.getByRole('button', { name: 'end_turn' }));
    expect(screen.getByRole('button', { name: 'end_turn' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'The model finished its turn' }));
    expect(announce).toHaveBeenLastCalledWith('Matched. 2 to go.');

    const locked = screen.getByRole('button', { name: 'end_turn. Matched.' });
    expect(locked.props.accessibilityState).toMatchObject({ selected: false, disabled: true });
  });
});

describe('only the learner’s own pick is selected, and results are spoken', () => {
  it('mc: a wrong pick reads as your answer; the key reads as the correct answer, not selected', async () => {
    const wrongIndex = mc.answerKey === 0 ? 1 : 0;
    await render(<McRenderer question={mc} answered={false} onAnswer={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: mc.options[wrongIndex] }));
    await screen.rerender(<McRenderer question={mc} answered onAnswer={jest.fn()} />);

    const pick = screen.getByRole('button', { name: `${trimmed(mc.options[wrongIndex])}. Your answer, not quite.` });
    expect(pick.props.accessibilityState).toMatchObject({ selected: true });
    const key = screen.getByRole('button', { name: `${trimmed(mc.options[mc.answerKey])}. Correct answer.` });
    expect(key.props.accessibilityState).toMatchObject({ selected: false });
    const selected = screen.getAllByRole('button').filter((b) => b.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
  });

  it('mc: a correct pick reads as correct and stays selected', async () => {
    await render(<McRenderer question={mc} answered={false} onAnswer={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: mc.options[mc.answerKey] }));
    await screen.rerender(<McRenderer question={mc} answered onAnswer={jest.fn()} />);
    const key = screen.getByRole('button', { name: `${trimmed(mc.options[mc.answerKey])}. Correct, your answer.` });
    expect(key.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('multi: separates the picked key, the missed key and the wrong pick', async () => {
    const [keyA, keyB] = multi.answerKey;
    const wrong = multi.options.findIndex((_, i) => !multi.answerKey.includes(i));
    await render(<MultiRenderer question={multi} answered={false} onAnswer={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: multi.options[keyA] }));
    await fireEvent.press(screen.getByRole('button', { name: multi.options[wrong] }));
    await screen.rerender(<MultiRenderer question={multi} answered onAnswer={jest.fn()} />);

    expect(
      screen.getByRole('button', { name: `${trimmed(multi.options[keyA])}. Correct, your answer.` }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByRole('button', { name: `${trimmed(multi.options[keyB])}. Correct answer.` }).props.accessibilityState,
    ).toMatchObject({ selected: false });
    expect(
      screen.getByRole('button', { name: `${trimmed(multi.options[wrong])}. Your answer, not quite.` }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('order: placed steps read their position; the revealed order is not marked as the learner’s pick', async () => {
    await render(<OrderRenderer question={order} answered={false} onAnswer={jest.fn()} />);
    const first = order.steps[order.answerKey[0]];
    await fireEvent.press(screen.getByRole('button', { name: first }));
    expect(screen.getByRole('button', { name: `1. ${first}` }).props.accessibilityState).toMatchObject({ selected: true });

    await screen.rerender(<OrderRenderer question={order} answered onAnswer={jest.fn()} />);
    const revealed = screen.getByRole('button', { name: `1. ${trimmed(first)}. Correct answer.` });
    expect(revealed.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('self-assessment toggles (explain-back key points) keep their plain label and read covered as selected', async () => {
    await render(<OptionCard label="Workflows follow predefined paths" state="correct" onPress={jest.fn()} />);
    const point = screen.getByRole('button', { name: 'Workflows follow predefined paths' });
    expect(point.props.accessibilityState).toMatchObject({ selected: true });
  });

  it('exam review: each missed decision says which answer was yours and which was best', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'simulation',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    useExamAttemptStore.getState().answer('exam-q1', [0], false, Date.now());
    useExamAttemptStore.getState().submit('manual', Date.now());
    const completed = useExamAttemptStore.getState().activeAttempt;
    if (!completed || completed.attemptId !== attempt.attemptId) throw new Error('expected the completed attempt');

    await render(<ExamReport attempt={completed} onDone={jest.fn()} onRelearn={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Review 1 missed decisions' }));
    expect(screen.getByLabelText('Your answer, not quite: Ignore tools')).toBeTruthy();
    expect(screen.getByLabelText('Best answer: Append the tool result')).toBeTruthy();
  });
});
