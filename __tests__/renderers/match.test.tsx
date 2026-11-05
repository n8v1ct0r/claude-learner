// __tests__/renderers/match.test.tsx  (M4 — MatchRenderer)
//
// Drives the real match-pairs renderer through a tap-a-left-then-a-right interaction against a jest
// fixture (the pilot has no match question yet, so the fixture is authored here). Proves:
//   • a correct connection locks the pair and a wrong one does not complete or grade the question,
//   • every pair connected => the question grades correct exactly once (onAnswer(true)),
//   • a wrong attempt is retryable and never grades the question against the learner (no shame),
//   • every cell is an accessible button (role + label).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

// The haptics gate reads the persisted settings store, which persists via AsyncStorage — mock the
// native module with the official jest mock (same pattern as the other component suites).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { setHapticsEnabled } from '@/design/haptics';
import { MatchRenderer } from '@/features/lesson-player/renderers/MatchRenderer';

import type { MatchQuestion } from '../../content/schema/types';

const matchQuestion: MatchQuestion = {
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
  sourceUrls: ['https://docs.claude.com/en/docs/build-with-claude/tool-use'],
};

async function tap(name: string): Promise<void> {
  fireEvent.press(await screen.findByRole('button', { name }));
}

beforeEach(() => {
  // Keep the taptic engine out of the unit test (it's fire-and-forget native otherwise).
  setHapticsEnabled(false);
});

describe('MatchRenderer', () => {
  it('renders every prompt and answer as an accessible button', async () => {
    const onAnswer = jest.fn();
    await render(<MatchRenderer question={matchQuestion} answered={false} onAnswer={onAnswer} />);
    for (const pair of matchQuestion.pairs) {
      expect(screen.getByRole('button', { name: pair.left })).toBeTruthy();
      expect(screen.getByRole('button', { name: pair.right })).toBeTruthy();
    }
  });

  it('does not grade the question until every pair is connected, and ignores wrong attempts', async () => {
    const onAnswer = jest.fn();
    await render(<MatchRenderer question={matchQuestion} answered={false} onAnswer={onAnswer} />);

    // One correct connection: end_turn -> its meaning.
    await tap('end_turn');
    await tap('The model finished its turn');
    expect(onAnswer).not.toHaveBeenCalled();

    // A WRONG connection: tool_use -> max_tokens's meaning. Amber, retryable, still not graded.
    await tap('tool_use');
    await tap('The output hit the length cap');
    expect(onAnswer).not.toHaveBeenCalled();

    // The wrong attempt did not consume tool_use — retry it correctly.
    await tap('tool_use');
    await tap('The model is calling a tool');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('grades correct exactly once when all pairs are matched', async () => {
    const onAnswer = jest.fn();
    await render(<MatchRenderer question={matchQuestion} answered={false} onAnswer={onAnswer} />);

    await tap('end_turn');
    await tap('The model finished its turn');
    await tap('tool_use');
    await tap('The model is calling a tool');
    await tap('max_tokens');
    await tap('The output hit the length cap');

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});
