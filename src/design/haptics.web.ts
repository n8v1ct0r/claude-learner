// src/design/haptics.web.ts: the web build's settings-gated haptics.
//
// Same exports as src/design/haptics.ts. The preference still reads and writes the persisted setting,
// but the impacts are no-ops: expo-haptics on web calls navigator.vibrate, which Chrome logs as a
// console error before the first tap. Native keeps haptics.ts unchanged.

import { useSettingsStore } from '@/state/settings';

/** The persisted user preference (settings store, default ON). */
export function hapticsEnabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

/** Flip the persisted preference. */
export function setHapticsEnabled(value: boolean): void {
  useSettingsStore.getState().setHapticsEnabled(value);
}

/** Light impact: a no-op on web. */
export function lightImpact(): void {}

/** Success haptic: a no-op on web. */
export function successImpact(): void {}

/** Soft haptic: a no-op on web. */
export function softImpact(): void {}
