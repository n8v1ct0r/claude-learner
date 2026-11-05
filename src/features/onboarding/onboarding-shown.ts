// src/features/onboarding/onboarding-shown.ts
//
// A one-shot, in-memory signal: "the onboarding screen is on screen". The first-run gate
// (OnboardingGate.tsx) keeps the native splash over a fresh install until this fires, then lifts it on
// the next frame (IB-5).
//
// The route alone is not enough. useSegments() reports /onboarding as soon as the JS navigation state
// changes, before the native stack has swapped the screens, and on iOS that swap is not atomic even with
// `animation: 'none'`: react-native-screens replaces the Learn tab through a UIKit transition that removes
// the outgoing screen only in a completion block on a later run-loop turn. The screen's first layout is
// not enough either: Fabric computes layout, and emits onLayout, before the mount reaches the main
// thread, so on a simulator the event sometimes arrived before the swap and the Learn tab still flashed.
// The onboarding screen therefore reports on the native stack's transitionEnd (closing: false), which
// react-native-screens emits from the screen's viewDidAppear, after UIKit has removed the outgoing screen.
//
// Not persisted: it describes this launch only, and the splash lifts once per launch.

let shown = false;
const listeners = new Set<() => void>();

/** Called by the onboarding screen once the native stack has finished showing it. Later calls are no-ops. */
export function reportOnboardingShown(): void {
  if (shown) return;
  shown = true;
  listeners.forEach((listener) => listener());
}

/** True once the onboarding screen has been shown during this launch. */
export function isOnboardingShown(): boolean {
  return shown;
}

/**
 * Calls `listener` when the onboarding screen is first shown; returns the unsubscribe. Pairs with
 * {@link isOnboardingShown} as a useSyncExternalStore subscription.
 */
export function subscribeOnboardingShown(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: forget the signal between cases. */
export function resetOnboardingShownForTests(): void {
  shown = false;
}
