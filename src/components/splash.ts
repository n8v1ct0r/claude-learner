// src/components/splash.ts
//
// The one place that hides the native splash screen. app/_layout.tsx keeps it up from launch
// (preventAutoHideAsync) and the first-run gate (OnboardingGate.tsx) hides it once the first real
// screen is settled: fonts loaded, persisted stores hydrated, the content DB open and the onboarding
// redirect done — so a fresh install never flashes the Learn tab and a returning learner never sees a
// spinner frame (IB-5). Error and not-found screens hide it too, and the root layout's failsafe timer
// guarantees a failed hydration can never leave the learner staring at the splash.

import * as SplashScreen from 'expo-splash-screen';

let requested = false;

function hideNativeSplash(): void {
  // Web: public/index.html paints a static splash over the app until this moment.
  if (typeof document !== 'undefined') document.getElementById('web-splash')?.remove();
  try {
    void Promise.resolve(SplashScreen.hideAsync()).catch(() => undefined);
  } catch {
    // No native splash module (web, tests): nothing to hide.
  }
}

/** Hide the splash once. Later calls are no-ops, so any screen may call it defensively. */
export function hideAppSplash(): void {
  if (requested) return;
  requested = true;
  hideNativeSplash();
}

/** Failsafe: hide unconditionally, even if an earlier request raced the native splash. */
export function forceHideAppSplash(): void {
  requested = true;
  hideNativeSplash();
}
