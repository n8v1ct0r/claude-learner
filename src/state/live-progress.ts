// src/state/live-progress.ts
//
// Read-time views of the progress ledger (V-features-1, FT-13). The stored energy and streak change
// only when an action writes them, yet both follow the clock: energy refills passively (+1 per 45 min)
// and a streak settles missed days (freezes, pause, archive) as local days pass. Screens read these
// views, so what they show — and gate on — is what the engines say now, not the value last written.
//
// The pure functions take `now`; the hooks own the wall clock at the React edge (re-read every minute
// and when the app returns to the foreground), keeping the engines clock-free.

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { refill, type EnergyState } from '@/engine/energy';
import { reduceStreak, type StreakState } from '@/engine/streak';
import { localDateInTz } from '@/engine/time';
import { resolveTimezone, useProgressStore } from '@/state/progress';

/** Energy after passive refill up to `now`: what the learner has and what the lesson gate uses. */
export function effectiveEnergy(energy: EnergyState, now: number): number {
  return refill(energy, now).energy;
}

/**
 * The streak as it stands on the learner's local day at `now`: missed days settled exactly as the
 * streak engine's `refresh` would settle them. Returns the stored state itself when nothing changes.
 */
export function effectiveStreak(streak: StreakState, now: number, timeZone: string): StreakState {
  return reduceStreak(streak, { type: 'refresh' }, localDateInTz(now, timeZone));
}

/** How often an on-screen value re-reads the clock while the app is open. */
export const LIVE_CLOCK_INTERVAL_MS = 60_000;

/** The wall clock for render: re-read on an interval and whenever the app comes back to the foreground. */
export function useNow(intervalMs: number = LIVE_CLOCK_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [intervalMs]);
  return now;
}

/** Energy to show and gate on right now, passive refill included (V-features-1). */
export function useEffectiveEnergy(): number {
  const energy = useProgressStore((s) => s.energy);
  const now = useNow();
  return effectiveEnergy(energy, now);
}

/** The streak as it stands today, missed days settled (FT-13). */
export function useEffectiveStreak(): StreakState {
  const streak = useProgressStore((s) => s.streak);
  const now = useNow();
  return effectiveStreak(streak, now, resolveTimezone());
}
