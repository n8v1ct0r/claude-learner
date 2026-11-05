// __tests__/a11y/ceremony.a11y.test.tsx  (AP-2)
//
// The lesson-end results must be readable by VoiceOver. An accessible element (every RN Pressable is
// one) hides its descendants from VoiceOver, so the old full-screen "Skip celebration" Pressable
// swallowed the XP, accuracy, chest and streak. RNTL does not model that grouping, so this suite
// asserts it directly: no result has an accessible ancestor. The skip stays one tap away while the
// reveal plays, and a running screen reader gets the settled results straight away.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Drive reduce-motion straight off the settings override, as juice.a11y.test.tsx does.
jest.mock('@/design/motion', () => ({
  useReduceMotion: () => require('@/state/settings').useSettingsStore.getState().reduceMotionOverride === 'on',
}));

import type { LessonXpBreakdown } from '@/engine/xp';
import { Ceremony } from '@/features/lesson-player/Ceremony';
import { useSettingsStore } from '@/state/settings';

const XP: LessonXpBreakdown = { base: 40, combo: 0, unit: 0, legendary: 0, multiplier: 1, total: 40 };

interface TreeNode {
  props: Record<string, unknown>;
  parent: TreeNode | null;
}

/** The nearest ancestor VoiceOver would treat as a single element (accessible === true), if any. */
function accessibleAncestor(element: TreeNode): TreeNode | null {
  for (let node = element.parent; node; node = node.parent) {
    if (node.props.accessible === true) return node;
  }
  return null;
}

function renderCeremony() {
  return render(
    <Ceremony xp={XP} chestTier="silver" accuracy={0.8} conceptCoverage={1} comboBest={3} streakCurrent={4} onDone={jest.fn()} />,
  );
}

function results(): TreeNode[] {
  return [
    screen.getByLabelText('40 XP earned'),
    screen.getByText('Accuracy 80%'),
    screen.getByText(/Silver chest/),
    screen.getByText('4-day streak'),
  ] as unknown as TreeNode[];
}

beforeEach(() => {
  useSettingsStore.getState().reset();
  useSettingsStore.getState().setReduceMotionOverride('off');
  jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(false);
});

describe('lesson ceremony results are reachable by VoiceOver', () => {
  it('never nests XP, accuracy, chest or streak inside an accessible element', async () => {
    await renderCeremony();
    for (const result of results()) {
      expect(accessibleAncestor(result)).toBeNull();
    }
  });

  it('keeps a separate one-tap skip while the reveal plays, then removes it', async () => {
    await renderCeremony();
    const skip = screen.getByRole('button', { name: 'Skip celebration' });
    expect(skip.props.accessibilityHint).toBe('Show the final results now');
    for (const result of results()) {
      expect(accessibleAncestor(result)).not.toBe(skip);
    }
    await fireEvent.press(skip);
    expect(screen.queryByRole('button', { name: 'Skip celebration' })).toBeNull();
    expect(screen.getByLabelText('40 XP earned')).toBeTruthy();
    expect(screen.getByText('+40')).toBeTruthy();
  });

  it('still skips on a tap anywhere on the celebration', async () => {
    await renderCeremony();
    await fireEvent(screen.getByTestId('ceremony-results'), 'touchEnd');
    expect(screen.queryByRole('button', { name: 'Skip celebration' })).toBeNull();
    expect(screen.getByText('+40')).toBeTruthy();
  });

  it('shows the settled results at once when a screen reader is running', async () => {
    jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockResolvedValue(true);
    await renderCeremony();
    expect(await screen.findByText('+40')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip celebration' })).toBeNull();
    for (const result of results()) {
      expect(accessibleAncestor(result)).toBeNull();
    }
  });
});
