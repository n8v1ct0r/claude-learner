// __tests__/path/unit-review-player.test.tsx — FT-6: unit review records what it says it records.
//
// The shared feedback panel tells the learner a missed objective "was added to Practice". Unit review
// must make that true (capture the miss in the FSRS deck, grade a card it already has), and serve the
// learner's previously missed questions first.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

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
  const question = (n: number) => ({
    id: `u-q${n}`,
    type: 'mc',
    domain: 'd1',
    conceptId: 'concept-u',
    taskStatement: '1.1',
    difficulty: 1,
    estimatedSeconds: 30,
    stem: `Unit question ${n}`,
    options: ['Right answer', 'Other answer'],
    answerKey: 0,
    explanation: `Why ${n} works.`,
    sourceUrls: ['https://docs.anthropic.com/'],
  });
  const unit = {
    id: 'unit-x',
    title: 'Unit X',
    order: 1,
    lessons: [{ id: 'lesson-a', title: 'Lesson A', order: 1, exercises: [question(1), question(2), question(3)] }],
  };
  return { useContentDb: () => ({ getUnit: (id: string) => (id === unit.id ? unit : undefined) }) };
});

import { UnitReviewPlayer } from '@/features/path/UnitReviewPlayer';
import { DAY_MS } from '@/engine/time';
import { useSrsStore } from '@/state/srs';

beforeEach(() => {
  useSrsStore.getState().reset();
});

describe('unit review and the review deck (FT-6)', () => {
  it('adds a missed objective to Practice, as the feedback says', async () => {
    await render(<UnitReviewPlayer unitId="unit-x" />);
    expect(screen.getByText('Unit question 1')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Other answer/ }));
    expect(await screen.findByText(/added to Practice/)).toBeTruthy();
    expect(useSrsStore.getState().cards['u-q1']).toMatchObject({ id: 'u-q1', conceptId: 'concept-u', state: 'learning' });

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(await screen.findByRole('button', { name: /Right answer/ }));
    // A correct answer on a question with no card creates nothing.
    expect(useSrsStore.getState().cards['u-q2']).toBeUndefined();
  });

  it('serves previously missed questions first and grades their cards', async () => {
    useSrsStore.getState().recordMistake('u-q3', 'concept-u', Date.now() - DAY_MS);
    const before = useSrsStore.getState().cards['u-q3'];

    await render(<UnitReviewPlayer unitId="unit-x" />);
    expect(screen.getByText('Unit question 3')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Right answer/ }));
    const after = useSrsStore.getState().cards['u-q3'];
    expect(after.reps).toBe(before.reps + 1);
    expect(after.state).toBe('review');
  });
});
