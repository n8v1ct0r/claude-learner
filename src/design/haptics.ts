// src/design/haptics.ts — settings-gated haptic feedback.
//
// Originally an in-memory stub; now that the persisted settings surface exists (M11:
// src/features/settings/JuiceSettings.tsx → settings.hapticsEnabled), every haptic here is gated on
// the SAME persisted preference the juice layer honors (src/juice/haptics.ts). Components like
// Button3D keep calling these thin wrappers so the gate stays in one place.

import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/state/settings';

/** The single gate: the persisted user preference (settings store, default ON). */
export function hapticsEnabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

/** Flip the persisted preference (kept for tests/settings surfaces; writes through the store). */
export function setHapticsEnabled(value: boolean): void {
  useSettingsStore.getState().setHapticsEnabled(value);
}

/** Light impact on press-in, but only when the user's haptics setting is on. No-op otherwise. */
export function lightImpact(): void {
  if (!hapticsEnabled()) return;
  // Fire-and-forget; a missing taptic engine (e.g. Simulator) simply rejects silently.
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Success notification haptic for a correct answer (settings-gated). */
export function successImpact(): void {
  if (!hapticsEnabled()) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Soft feedback for an incorrect answer — a gentle medium impact, deliberately NOT the harsh
 * "error" buzzer (no-shame rule). Settings-gated.
 */
export function softImpact(): void {
  if (!hapticsEnabled()) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
