// The web build's Reanimated stand-in (src/web/reanimated-lite.tsx, wired for web only in
// metro.config.js). Drives its frame loop by hand and checks each animation the app uses lands where
// Reanimated would: timing, spring, delay, sequence, reversing repeat, cancel, and an animation
// returned straight from an animated style.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from '../../src/web/reanimated-lite';

let now = 0;
let queued: ((t: number) => void)[] = [];

beforeEach(() => {
  // The previous test's views are unmounted by now, so nothing is running: run its last queued frame so
  // the module's frame loop goes idle and schedules afresh here.
  const leftover = queued;
  queued = [];
  leftover.forEach((cb) => cb(now));
  now = 0;
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    queued.push(cb);
    return queued.length;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Advance the frame clock in 16 ms frames. */
async function advance(ms: number): Promise<void> {
  const end = now + ms;
  while (now < end) {
    now = Math.min(end, now + 16);
    const frame = queued;
    queued = [];
    await act(async () => frame.forEach((cb) => cb(now)));
  }
}

function Probe({ drive, read }: { drive: (sv: SharedValue<number>) => void; read: (sv: SharedValue<number>) => void }) {
  const sv = useSharedValue(0);
  useEffect(() => {
    drive(sv);
    read(sv);
  }, [drive, read, sv]);
  const style = useAnimatedStyle(() => ({ opacity: sv.value }));
  return <Animated.View testID="probe" style={style} />;
}

function opacity(): number {
  return StyleSheet.flatten(screen.getByTestId('probe').props.style).opacity as number;
}

async function mount(drive: (sv: SharedValue<number>) => void): Promise<{ sv: () => SharedValue<number> }> {
  let held: SharedValue<number> | null = null;
  await render(<Probe drive={drive} read={(sv) => (held = sv)} />);
  return { sv: () => held as unknown as SharedValue<number> };
}

describe('reanimated-lite (web)', () => {
  it('withTiming eases to the target over its duration and the view re-renders each frame', async () => {
    await mount((sv) => {
      sv.value = withTiming(1, { duration: 200 });
    });
    await advance(100);
    const mid = opacity();
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    await advance(150);
    expect(opacity()).toBe(1);
  });

  it('withSpring settles on its target', async () => {
    await mount((sv) => {
      sv.value = withSpring(1, { damping: 14, stiffness: 140 });
    });
    await advance(300);
    expect(opacity()).toBeGreaterThan(0);
    await advance(8000);
    expect(opacity()).toBe(1);
  });

  it('withDelay holds the start value, then runs', async () => {
    await mount((sv) => {
      sv.value = withDelay(300, withTiming(1, { duration: 100 }));
    });
    await advance(250);
    expect(opacity()).toBe(0);
    await advance(250);
    expect(opacity()).toBe(1);
  });

  it('withSequence runs its steps in order', async () => {
    await mount((sv) => {
      sv.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0.5, { duration: 100 }));
    });
    await advance(120);
    expect(opacity()).toBeGreaterThan(0.9);
    await advance(200);
    expect(opacity()).toBe(0.5);
  });

  it('withRepeat(-1, reverse) goes there and back until cancelled', async () => {
    const { sv } = await mount((v) => {
      v.value = withRepeat(withTiming(1, { duration: 100 }), -1, true);
    });
    await advance(116);
    expect(opacity()).toBeGreaterThan(0.9);
    await advance(112);
    expect(opacity()).toBeLessThan(0.2);
    await act(async () => cancelAnimation(sv()));
    const frozen = opacity();
    await advance(300);
    expect(opacity()).toBe(frozen);
  });

  it('a plain assignment stops a running animation', async () => {
    const { sv } = await mount((v) => {
      v.value = withTiming(1, { duration: 1000 });
    });
    await advance(100);
    await act(async () => {
      sv().value = 0.25;
    });
    await advance(500);
    expect(opacity()).toBe(0.25);
  });

  it('animates a style value returned as an animation (the progress-bar pattern)', async () => {
    function Bar({ on }: { on: boolean }) {
      const style = useAnimatedStyle(() => ({ opacity: withTiming(on ? 1 : 0, { duration: 100 }) }));
      return <Animated.View testID="probe" style={style} />;
    }
    const view = await render(<Bar on={false} />);
    expect(opacity()).toBe(0);
    await view.rerender(<Bar on />);
    await advance(50);
    expect(opacity()).toBeGreaterThan(0);
    expect(opacity()).toBeLessThan(1);
    await advance(100);
    expect(opacity()).toBe(1);
  });
});
