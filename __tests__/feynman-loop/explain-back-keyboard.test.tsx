// __tests__/feynman-loop/explain-back-keyboard.test.tsx  (smoke fix: the first "Teach it" tap)
//
// With the keyboard up, the first tap on "Teach it" only dismissed the keyboard: a ScrollView's default
// keyboardShouldPersistTaps ('never') swallows a tap outside the focused input to close the keyboard.
// With 'handled', a tap on a button reaches the button (and the keyboard closes as the step changes),
// while a tap on empty space still dismisses it. Jest has no keyboard, so this pins the prop:
//   • on the explain-back scroller, in both the first explanation and the "add the missing bit" refine;
//   • on every lesson-player scroller that holds a text input (source scan, so a new input can't
//     reintroduce the double tap).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { ExplainBack, type ExplainBackProps } from '@/features/lesson-player/ExplainBack';

interface HostNode {
  type: string;
  props: Record<string, unknown>;
  parent: HostNode | null;
}

/** The native scroll view an element is rendered in. */
function scrollerOf(node: unknown): HostNode {
  let current = node as HostNode | null;
  while (current && current.type !== 'RCTScrollView') current = current.parent;
  if (!current) throw new Error('expected the element inside a scroll view');
  return current;
}

const noop = () => undefined;

const baseProps: ExplainBackProps = {
  prompt: 'Explain the difference between a workflow and an agent.',
  keyPoints: [
    { id: 'kp-keyboard-1', text: 'A workflow follows steps fixed in code.' },
    { id: 'kp-keyboard-2', text: 'An agent chooses its own next step.' },
  ],
  status: 'pending',
  coveredIds: [],
  grading: 'idle',
  coachingHint: null,
  canRefine: false,
  onSubmit: noop,
  onRefine: noop,
  onToggleCovered: noop,
  onFinish: noop,
  onSkip: noop,
};

describe('explain-back with the keyboard up', () => {
  it('lets the first tap on "Teach it" reach the button', async () => {
    await render(<ExplainBack {...baseProps} />);
    const input = screen.getByLabelText('Your one-sentence explanation');
    expect(scrollerOf(input).props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollerOf(screen.getByRole('button', { name: 'Teach it' }))).toBe(scrollerOf(input));
  });

  it('lets the first tap on "Teach it again" reach the button while refining', async () => {
    await render(<ExplainBack {...baseProps} status="submitted" grading="graded" canRefine />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add the missing bit' }));
    const input = screen.getByLabelText('Your added detail');
    expect(scrollerOf(input).props.keyboardShouldPersistTaps).toBe('handled');
  });
});

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

describe('lesson-player scrollers that hold a text input', () => {
  it('all let taps through to their buttons (keyboardShouldPersistTaps="handled")', () => {
    const files = tsxFiles(join(__dirname, '../../src/features/lesson-player'));
    const withInputs = files.filter((file) => readFileSync(file, 'utf8').includes('<TextInput'));
    expect(withInputs.length).toBeGreaterThan(0);
    for (const file of withInputs) {
      // A whole opening tag, including any `=>` inside its props.
      const scrollViews = readFileSync(file, 'utf8').match(/<ScrollView\b(?:=>|[^>])*>/g) ?? [];
      // The scan must find the scroller the input lives in, or the check below would pass vacuously.
      expect({ file, hasScrollView: scrollViews.length > 0 }).toEqual({ file, hasScrollView: true });
      for (const tag of scrollViews) {
        expect({ file, tag }).toEqual({ file, tag: expect.stringContaining('keyboardShouldPersistTaps="handled"') });
      }
    }
  });
});
