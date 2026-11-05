// __tests__/a11y/juice.a11y.test.tsx
//
// Accessibility + reduce-motion contract for the juice layer (GC-10):
//   • the mascot renders an accessible image and its legendary glow has a STATIC fallback,
//   • the confetti Celebration swaps to a static frame under reduce-motion,
//   • ceremony v2 renders its final state instantly under reduce-motion (and is skippable),
//   • the streak takeover + welcome-back surfaces expose proper roles/labels and gain-framed copy.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => {
  const backing: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(k in backing ? backing[k] : null),
      setItem: (k: string, v: string) => {
        backing[k] = v;
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        delete backing[k];
        return Promise.resolve();
      },
      getAllKeys: () => Promise.resolve(Object.keys(backing)),
      clear: () => Promise.resolve(),
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return {
    SafeAreaView: rn.View,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Drive reduce-motion straight off the settings override (synchronously). The real hook also polls
// AccessibilityInfo asynchronously, whose leaked promise otherwise triggers overlapping act() warnings
// across these back-to-back renders. This preserves the exact override semantics the surfaces rely on.
jest.mock('@/design/motion', () => ({
  useReduceMotion: () => require('@/state/settings').useSettingsStore.getState().reduceMotionOverride === 'on',
}));

import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { Celebration } from '@/juice/Celebration';
import { Ceremony } from '@/features/lesson-player/Ceremony';
import { StreakMilestone } from '@/features/ceremony/StreakMilestone';
import type { LessonXpBreakdown } from '@/engine/xp';
import { useSettingsStore } from '@/state/settings';

const XP: LessonXpBreakdown = { base: 40, combo: 0, unit: 0, legendary: 0, multiplier: 1, total: 40 };

function setReduceMotion(on: boolean): void {
  useSettingsStore.getState().setReduceMotionOverride(on ? 'on' : 'off');
}

beforeEach(() => {
  useSettingsStore.getState().reset();
});

describe('ClaudeAgentMascot poses', () => {
  it('renders an accessible image for every mood', async () => {
    const moods = ['idle', 'celebrate', 'thinking', 'peek', 'curious', 'sleepy', 'legendary'] as const;
    await render(
      <>
        {moods.map((mood) => (
          <ClaudeAgentMascot key={mood} mood={mood} accessibilityLabel={`agent ${mood}`} />
        ))}
      </>,
    );
    expect(screen.getAllByRole('image')).toHaveLength(moods.length);
    // The legendary pose adds its glow halo; the others do not.
    expect(screen.getAllByTestId('claude-mascot-halo')).toHaveLength(1);
  });

  it('keeps the legendary glow as a static fallback under reduce-motion', async () => {
    setReduceMotion(true);
    await render(<ClaudeAgentMascot mood="legendary" accessibilityLabel="legend" />);
    // The halo view exists (statically dimmed) even with motion reduced.
    expect(screen.getByTestId('claude-mascot-halo')).toBeTruthy();
    expect(screen.getByLabelText('legend')).toBeTruthy();
  });
});

describe('Celebration reduce-motion gating', () => {
  it('renders the Lottie confetti when motion is allowed', async () => {
    setReduceMotion(false);
    await render(<Celebration />);
    expect(screen.getByTestId('celebration-lottie', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('celebration-static', { includeHiddenElements: true })).toBeNull();
  });

  it('renders a static frame when motion is reduced', async () => {
    setReduceMotion(true);
    await render(<Celebration />);
    expect(screen.getByTestId('celebration-static', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('celebration-lottie', { includeHiddenElements: true })).toBeNull();
  });
});

describe('Ceremony v2', () => {
  it('shows the final state instantly with a static celebration under reduce-motion', async () => {
    setReduceMotion(true);
    await render(
      <Ceremony xp={XP} chestTier="silver" accuracy={1} conceptCoverage={1} comboBest={3} streakCurrent={7} onDone={jest.fn()} />,
    );
    // Settled XP label (GC-03a — no await) and the chest tier are present immediately.
    expect(screen.getByLabelText('40 XP earned')).toBeTruthy();
    expect(screen.getByText(/Silver chest/)).toBeTruthy();
    // Reduced motion => static congratulatory frame, not the animated confetti.
    expect(screen.getByTestId('celebration-static', { includeHiddenElements: true })).toBeTruthy();
  });

  it('exposes a one-tap skip control', async () => {
    setReduceMotion(false);
    await render(
      <Ceremony xp={XP} chestTier="bronze" accuracy={0.8} conceptCoverage={0.5} comboBest={0} streakCurrent={2} onDone={jest.fn()} />,
    );
    const skip = screen.getByRole('button', { name: 'Skip celebration' });
    expect(skip).toBeTruthy();
    fireEvent.press(skip);
    // After skipping, the settled total is shown.
    expect(screen.getByLabelText('40 XP earned')).toBeTruthy();
  });
});

describe('Streak milestone surface', () => {
  it('renders a gain-framed streak milestone takeover with an accessible CTA', async () => {
    await render(<StreakMilestone days={7} onDone={jest.fn()} />);
    expect(screen.getByText('7-day streak')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep it going' })).toBeTruthy();
  });

  it('renders nothing for a non-milestone streak length', async () => {
    await render(<StreakMilestone days={5} onDone={jest.fn()} />);
    expect(screen.queryByText(/streak/)).toBeNull();
  });
});
