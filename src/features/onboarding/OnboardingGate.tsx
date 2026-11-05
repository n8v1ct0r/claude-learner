// src/features/onboarding/OnboardingGate.tsx
//
// The renderless first-run gate. Mounted once at the root (app/_layout.tsx), it watches the persisted
// onboarding cursor and, on a fresh install, redirects the cold-open into /onboarding BEFORE the Path
// tab settles — so a new learner never sees the home screen first (PLAN-rev2 §4.7 #7).
//
// All of the decision logic lives in the PURE resolveOnboardingRedirect() (onboarding-flow.ts); this
// component only wires it to three runtime signals and calls router.replace. That keeps the gate:
//   • flash-free — it waits for settings rehydration (the persisted cursor) AND a mounted navigator,
//     so a RETURNING learner is never bounced into onboarding on the first frame; and
//   • loop-free — it never redirects while already on the onboarding route (the screen owns its exit).
//
// It also owns the moment the native splash lifts (IB-5). The gate renders inside ContentProvider, so
// it only mounts once the fonts are loaded and the content DB is open; it then waits for EVERY persisted
// store to rehydrate (the first screen reads them) and, on a fresh install, for the native stack to
// finish showing the onboarding screen (onboarding-shown.ts), lifting the splash one frame after that.
// Until then the splash covers the in-between frames: the content spinner, and the Learn tab a fresh
// install is being redirected away from. Neither the redirect landing in the JS navigation state nor the
// onboarding screen's first layout is enough on its own: on iOS the native stack removes the outgoing
// Learn tab in a transition completion on a later run-loop turn, even with `animation: 'none'`.
//
// Once the cursor is 'complete' the gate never redirects, so it never fights the GC-03 deep-resume that
// the Path tab performs on cold open. (A finished learner who deep-links into /onboarding is sent back
// by the onboarding screen itself; the gate only keeps the splash up until that lands.)

import { useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';

import { hideAppSplash } from '@/components/splash';
import {
  resolveOnboardingRedirect,
  shouldShowOnboarding,
  type OnboardingStep,
} from '@/features/onboarding/onboarding-flow';
import { isOnboardingShown, subscribeOnboardingShown } from '@/features/onboarding/onboarding-shown';
import { useExamAttemptStore } from '@/state/exam-attempt';
import { useGameStore } from '@/state/game';
import { useLessonSessionStore } from '@/state/lesson-session';
import { useNotificationStore } from '@/state/notifications';
import { useProgressStore } from '@/state/progress';
import { isHydrationSettled, subscribeHydrationSettled, type PersistedStore } from '@/state/hydration';
import { useSettingsStore } from '@/state/settings';
import { useSrsStore } from '@/state/srs';

/**
 * Track zustand persist rehydration so the gate never acts on pre-hydration default state.
 * useSyncExternalStore subscribes to the load's outcome and reads it as the snapshot, correct whether
 * the load finished before or after this component mounted, with no setState-in-effect. A load that
 * FAILED (a corrupt or unreadable saved blob) also counts as settled: zustand v5 never reports it as
 * hydrated, and the store simply keeps its defaults (src/state/hydration.ts).
 */
/**
 * What these signals read while the web build pre-renders a page at build time (no saved state, no
 * navigator, nothing shown yet). Native never server-renders, so it never calls this.
 */
function serverSnapshot(): boolean {
  return false;
}

function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeHydrationSettled(useSettingsStore, onChange),
    () => isHydrationSettled(useSettingsStore),
    serverSnapshot,
  );
}

/** Every AsyncStorage-backed store the first screen (Learn tab, a resumed lesson or exam) reads. */
const PERSISTED_STORES: readonly PersistedStore[] = [
  useSettingsStore,
  useProgressStore,
  useLessonSessionStore,
  useGameStore,
  useSrsStore,
  useExamAttemptStore,
  useNotificationStore,
];

function subscribeToHydration(onChange: () => void): () => void {
  const unsubscribes = PERSISTED_STORES.map((store) => subscribeHydrationSettled(store, onChange));
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

function allStoresHydrated(): boolean {
  return PERSISTED_STORES.every((store) => isHydrationSettled(store));
}

function usePersistedStoresHydrated(): boolean {
  return useSyncExternalStore(subscribeToHydration, allStoresHydrated, serverSnapshot);
}

/**
 * PURE: may the native splash lift? Only once every persisted store has rehydrated, the navigator is
 * mounted, and the onboarding decision has landed. A fresh install must already be ON the onboarding
 * route AND the native stack must have finished showing the onboarding screen, so the Learn tab it is
 * being redirected away from is never shown. A finished learner who opened the onboarding route (a deep
 * link) is covered until the onboarding screen has sent them back to the Learn tab (shouldLeaveOnboarding).
 */
export function isFirstScreenSettled(params: {
  storesHydrated: boolean;
  navReady: boolean;
  step: OnboardingStep;
  inOnboarding: boolean;
  /** The native stack has finished showing the onboarding screen (onboarding-shown.ts). */
  onboardingShown: boolean;
}): boolean {
  if (!params.storesHydrated || !params.navReady) return false;
  if (!shouldShowOnboarding(params.step)) return !params.inOnboarding;
  return params.inOnboarding && params.onboardingShown;
}

export function OnboardingGate(): null {
  const step = useSettingsStore((state) => state.onboardingStep);
  const hydrated = useSettingsHydrated();
  const storesHydrated = usePersistedStoresHydrated();
  const onboardingShown = useSyncExternalStore(subscribeOnboardingShown, isOnboardingShown, serverSnapshot);
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    const redirect = resolveOnboardingRedirect({
      hydrated,
      navReady: Boolean(navState?.key),
      step,
      inOnboarding: segments[0] === 'onboarding',
    });
    if (redirect) router.replace(redirect);
  }, [hydrated, navState?.key, step, segments, router]);

  const settled = isFirstScreenSettled({
    storesHydrated,
    navReady: Boolean(navState?.key),
    step,
    inOnboarding: segments[0] === 'onboarding',
    onboardingShown,
  });

  useEffect(() => {
    if (!settled) return;
    // One frame for the settled (on a fresh install, fully shown) screen to paint under the splash.
    const frame = requestAnimationFrame(() => hideAppSplash());
    return () => cancelAnimationFrame(frame);
  }, [settled]);

  return null;
}
