// __tests__/state/live-clock.test.tsx — on-screen values follow the clock while a screen stays open.
//
// Energy refills passively and a streak settles as days pass, but nothing writes the store while the
// learner just looks at a screen. useNow re-reads the clock once a minute, so what is shown catches up
// without a tap (V-features-1, FT-13).

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createEnergyState, REFILL_INTERVAL_MS } from '@/engine/energy';
import { LIVE_CLOCK_INTERVAL_MS, useEffectiveEnergy, useNow } from '@/state/live-progress';
import { useProgressStore } from '@/state/progress';

const T0 = Date.UTC(2026, 8, 25, 14);

function Clock() {
  return <Text testID="clock">{String(useNow())}</Text>;
}

function EnergyReadout() {
  return <Text testID="energy">{String(useEffectiveEnergy())}</Text>;
}

const shown = (testID: string): string => String(screen.getByTestId(testID).props.children);

afterEach(() => {
  jest.useRealTimers();
});

describe('the live clock (useNow)', () => {
  it('re-reads the clock once a minute while the screen stays open', async () => {
    jest.useFakeTimers({ now: T0 });
    await render(<Clock />);
    expect(shown('clock')).toBe(String(T0));

    await act(async () => {
      jest.advanceTimersByTime(LIVE_CLOCK_INTERVAL_MS);
    });
    expect(shown('clock')).toBe(String(T0 + LIVE_CLOCK_INTERVAL_MS));
    expect(LIVE_CLOCK_INTERVAL_MS).toBe(60_000);
  });

  it('lets a passive refill reach a screen nobody touches: empty energy shows 1 after 45 minutes', async () => {
    jest.useFakeTimers({ now: T0 });
    useProgressStore.setState({ energy: createEnergyState(T0, 0) });
    await render(<EnergyReadout />);
    expect(shown('energy')).toBe('0');

    await act(async () => {
      jest.advanceTimersByTime(REFILL_INTERVAL_MS);
    });
    expect(shown('energy')).toBe('1');
  });
});
