// src/juice/haptics.ts — the app's haptic-feedback vocabulary (expo-haptics), gated on the user setting.
//
// Design rules (PLAN-rev2 D15 / ROADMAP M11):
//   • Haptics are ORTHOGONAL to reduce-motion. Reduce-motion silences visual juice; it does NOT disable
//     haptics — a low-vision user may rely on touch feedback precisely when motion is off. Haptics have
//     their own setting (settings.hapticsEnabled, default ON) and that is the ONLY gate here.
//   • No-shame (GC-13): a correct answer gets a light, encouraging tap; a chest/ceremony gets a success
//     notification; an INCORRECT answer gets NOTHING — no buzz, no "error" notification, nothing that
//     reads as punishment.
//
// Every call is fire-and-forget and swallows rejection: on a device without a Taptic Engine (Simulator,
// older hardware) expo-haptics simply rejects, which must never surface as an app error.

import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/state/settings';

/** The single gate: the persisted user preference (default ON). */
function enabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

function safe(run: () => Promise<unknown>): void {
  if (!enabled()) return;
  try {
    void run().catch(() => {});
  } catch {
    // Native module missing (e.g. under test) — never throw from a juice call site.
  }
}

/** Light impact — a correct answer, a tap-through, a small positive beat. */
export function tapLight(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium impact — a combo flare / streak tick: a slightly weightier positive beat. */
export function tapMedium(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Success notification — chest open, ceremony, streak milestone. The celebratory haptic. */
export function celebrate(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

// Intentionally NO incorrect/error haptic export: an incorrect answer must never buzz (GC-13).
