// __tests__/a11y/source-links.a11y.test.tsx  (WR-5 / FT-4, owner rule 2)
//
// After answering, the learner can open the question's cited sources: lesson Feedback (every player
// that uses ExerciseStep), the guided exam feedback, and the exam review of missed decisions. Each
// source is a real link (role "link", readable page name + host, >= 44pt row) that opens through
// expo-web-browser, falling back to the system browser.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })),
}));

const EXAM_SOURCE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls';

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

import * as WebBrowser from 'expo-web-browser';

import { SourceLinks } from '@/components/SourceLinks';
import { sourceLinkLabel } from '@/components/source-label';
import { ExamPlayer } from '@/features/exams/ExamPlayer';
import { ExamReport } from '@/features/exams/ExamReport';
import { ExerciseStep } from '@/features/lesson-player/ExerciseStep';
import { useExamAttemptStore } from '@/state/exam-attempt';
import { useSrsStore } from '@/state/srs';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';

const openBrowserAsync = WebBrowser.openBrowserAsync as jest.MockedFunction<typeof WebBrowser.openBrowserAsync>;

function linkName(url: string): string {
  const { title, host } = sourceLinkLabel(url);
  return `${title}, ${host}`;
}

beforeEach(() => {
  openBrowserAsync.mockClear();
  useExamAttemptStore.getState().reset();
  useSrsStore.getState().reset();
});

describe('lesson Feedback (ExerciseStep, a real authored question)', () => {
  const question = l1WorkflowsVsAgents.exercises[0];

  it('shows every cited source as a tappable, labelled link of at least 44pt', async () => {
    expect(question.sourceUrls.length).toBeGreaterThan(0);
    await render(
      <ExerciseStep
        question={question}
        pending={{ correct: false, explanation: question.explanation }}
        onAnswer={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(new Set(question.sourceUrls).size);
    for (const url of question.sourceUrls) {
      const link = screen.getByRole('link', { name: linkName(url) });
      expect(link.props.accessibilityHint).toBe('Opens the source page in your browser');
      expect(StyleSheet.flatten(link.props.style).minHeight).toBeGreaterThanOrEqual(44);
      expect(screen.getByText(sourceLinkLabel(url).title)).toBeTruthy();
    }

    await fireEvent.press(links[0]);
    expect(openBrowserAsync).toHaveBeenCalledWith(question.sourceUrls[0], expect.anything());
  });

  it('shows no sources while the question is still unanswered', async () => {
    await render(<ExerciseStep question={question} pending={null} onAnswer={jest.fn()} onContinue={jest.fn()} />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});

describe('SourceLinks', () => {
  it('falls back to the system browser when the in-app browser fails', async () => {
    openBrowserAsync.mockRejectedValueOnce(new Error('no in-app browser'));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<SourceLinks urls={[EXAM_SOURCE]} />);
    await fireEvent.press(screen.getByRole('link', { name: linkName(EXAM_SOURCE) }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(openURL).toHaveBeenCalledWith(EXAM_SOURCE);
    openURL.mockRestore();
  });

  it('drops duplicates and anything that is not an https link', async () => {
    await render(<SourceLinks urls={[EXAM_SOURCE, EXAM_SOURCE, 'javascript:alert(1)', 'http://example.com/a']} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('SOURCE')).toBeTruthy();
  });

  it('renders nothing without sources', async () => {
    await render(<SourceLinks urls={[]} />);
    expect(screen.toJSON()).toBeNull();
  });
});

describe('exams', () => {
  it('shows the source in guided exam feedback after checking an answer', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'practice',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<ExamPlayer attempt={attempt} onExit={jest.fn()} />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    await fireEvent.press(await screen.findByRole('radio', { name: /A\. Ignore tools/i }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Check answer' }));
    await fireEvent.press(await screen.findByRole('link', { name: linkName(EXAM_SOURCE) }));
    expect(openBrowserAsync).toHaveBeenCalledWith(EXAM_SOURCE, expect.anything());
  });

  it('shows the source on each missed decision in the exam review', async () => {
    useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'simulation',
      questionIds: ['exam-q1'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    useExamAttemptStore.getState().submit('manual', Date.now());
    const completed = useExamAttemptStore.getState().activeAttempt;
    if (!completed) throw new Error('expected a completed attempt');

    await render(<ExamReport attempt={completed} onDone={jest.fn()} onRelearn={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Review 1 missed decisions' }));
    await fireEvent.press(await screen.findByRole('link', { name: linkName(EXAM_SOURCE) }));
    expect(openBrowserAsync).toHaveBeenCalledWith(EXAM_SOURCE, expect.anything());
  });
});
