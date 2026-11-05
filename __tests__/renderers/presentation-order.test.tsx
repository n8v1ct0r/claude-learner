// __tests__/renderers/presentation-order.test.tsx  (CS-4 / FT-5)
//
// Order and match questions must not hand the learner the answer pattern. Every authored order
// question keys its steps in written order, and the match key pairs each prompt with the answer written
// beside it, so the renderers show a seeded per-question shuffle that is never the key order or its
// exact reverse. This suite drives EVERY order question and the match question in the real curriculum
// (the six course modules, i.e. the same objects the content DB is built from) through the pure
// presentation helper AND the real renderers, and proves grading still keys off the answer.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { setHapticsEnabled } from '@/design/haptics';
import { MatchRenderer } from '@/features/lesson-player/renderers/MatchRenderer';
import { OrderRenderer } from '@/features/lesson-player/renderers/OrderRenderer';
import {
  matchAnswerPresentation,
  orderStepPresentation,
  seededPresentationOrder,
} from '@/features/lesson-player/renderers/presentation-order';

// Importing the six course modules registers the whole curriculum into the content catalog.
import '../../content/src/meta/course';
import '../../content/src/d1-agentic-architecture/course';
import '../../content/src/d2-tool-design-mcp/course';
import '../../content/src/d3-claude-code-config/course';
import '../../content/src/d4-prompt-engineering/course';
import '../../content/src/d5-context-management/course';
import { getCatalog } from '../../content/src/index';
import type { MatchQuestion, OrderQuestion } from '../../content/schema/types';

const questions = getCatalog().questions;
const orderQuestions = questions.filter((q): q is OrderQuestion => q.type === 'order');
const matchQuestions = questions.filter((q): q is MatchQuestion => q.type === 'match');

const reverse = (values: readonly number[]): number[] => [...values].reverse();
const sorted = (values: readonly number[]): number[] => [...values].sort((a, b) => a - b);
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

beforeEach(() => {
  setHapticsEnabled(false);
});

describe('the real curriculum', () => {
  it('has the 18 order questions and the match question this suite covers', () => {
    expect(orderQuestions.length).toBeGreaterThanOrEqual(18);
    expect(matchQuestions.length).toBeGreaterThanOrEqual(1);
  });
});

describe('seededPresentationOrder', () => {
  it('never returns the key or its reverse, for every size and many seeds', () => {
    for (let n = 3; n <= 7; n += 1) {
      const key = range(n);
      for (let seed = 0; seed < 400; seed += 1) {
        const order = seededPresentationOrder(`seed-${seed}`, key);
        expect(sorted(order)).toEqual(key);
        expect(order).not.toEqual(key);
        expect(order).not.toEqual(reverse(key));
      }
    }
  });

  it('respects a non-identity key and is deterministic per seed', () => {
    const key = [2, 0, 3, 1];
    const first = seededPresentationOrder('q-1', key);
    expect(seededPresentationOrder('q-1', key)).toEqual(first);
    expect(first).not.toEqual(key);
    expect(first).not.toEqual(reverse(key));
  });
});

describe('order questions (every one in the curriculum)', () => {
  it.each(orderQuestions.map((q) => [q.id, q] as const))(
    '%s shows a seeded layout that is neither the key nor its reverse',
    (_id, question) => {
      const presentation = orderStepPresentation(question);
      expect(sorted(presentation)).toEqual(range(question.steps.length));
      expect(presentation).not.toEqual(question.answerKey);
      expect(presentation).not.toEqual(reverse(question.answerKey));
      // Deterministic: a resumed lesson renders the same layout.
      expect(orderStepPresentation(question)).toEqual(presentation);
    },
  );

  it.each(orderQuestions.map((q) => [q.id, q] as const))(
    '%s renders that layout and still grades the key order as correct',
    async (_id, question) => {
      // Step texts are unique, so a chip's accessible name identifies its step.
      expect(new Set(question.steps).size).toBe(question.steps.length);

      const onAnswer = jest.fn();
      await render(<OrderRenderer question={question} answered={false} onAnswer={onAnswer} />);
      const shown = screen
        .getAllByRole('button')
        .map((chip) => question.steps.indexOf(String(chip.props.accessibilityLabel)));
      expect(shown).toEqual(orderStepPresentation(question));
      expect(shown).not.toEqual(question.answerKey);
      expect(shown).not.toEqual(reverse(question.answerKey));

      for (const stepIndex of question.answerKey) {
        await fireEvent.press(await screen.findByRole('button', { name: question.steps[stepIndex] }));
      }
      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(true);
    },
  );

  const sweeps: [string, 'top to bottom' | 'bottom to top', OrderQuestion][] = orderQuestions.flatMap((q) => [
    [q.id, 'top to bottom', q],
    [q.id, 'bottom to top', q],
  ]);

  it.each(sweeps)('%s: tapping the chips %s is not the answer', async (_id, direction) => {
    // `direction` names a sweep over what is actually RENDERED: each tap takes the first (or last)
    // chip still on screen, so a renderer that laid the chips out in key order (or its reverse)
    // would make one of these sweeps grade correct and fail this test.
    const question = orderQuestions.find((q) => q.id === _id) as OrderQuestion;
    const onAnswer = jest.fn();
    await render(<OrderRenderer question={question} answered={false} onAnswer={onAnswer} />);
    for (let tap = 0; tap < question.steps.length; tap += 1) {
      const undo = screen.queryByRole('button', { name: 'Undo last' });
      const chips = screen.getAllByRole('button', { disabled: false }).filter((node) => node !== undo);
      await fireEvent.press(direction === 'top to bottom' ? chips[0] : chips[chips.length - 1]);
    }
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

describe('match questions (every one in the curriculum)', () => {
  it.each(matchQuestions.map((q) => [q.id, q] as const))(
    '%s shows its answers in a seeded order and grades a full, correct matching',
    async (_id, question) => {
      const presentation = matchAnswerPresentation(question);
      const identity = range(question.pairs.length);
      expect(sorted(presentation)).toEqual(identity);
      expect(presentation).not.toEqual(identity);
      expect(presentation).not.toEqual(reverse(identity));

      const onAnswer = jest.fn();
      await render(<MatchRenderer question={question} answered={false} onAnswer={onAnswer} />);
      const cells = screen.getAllByRole('button');
      // Left column (authored prompts) first, then the right column top to bottom.
      const rightShown = cells
        .slice(question.pairs.length)
        .map((cell) => question.pairs.findIndex((pair) => pair.right === cell.props.accessibilityLabel));
      expect(rightShown).toEqual(presentation);

      for (const pair of question.pairs) {
        await fireEvent.press(await screen.findByRole('button', { name: pair.left }));
        await fireEvent.press(await screen.findByRole('button', { name: pair.right }));
      }
      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith(true);
    },
  );
});
