// src/db/content-provider.web.tsx: the web build's content provider.
//
// Same exports as content-provider.tsx, but instead of opening content.db through expo-sqlite (whose
// web driver needs a wasm worker and cross-origin isolation headers) it fetches the JSON snapshot that
// scripts/build-web-content.ts generates from that same database, and serves it through
// createSnapshotReader. Native builds keep content-provider.tsx unchanged.
//
// The snapshot is ~180 KB compressed, and a first visit opens on onboarding, which shows no lesson
// content. So the app does not wait for it: children render at once, and a screen that reads content
// (useContentDb) suspends until the snapshot is in, under the loading view below (onboarding excepted).
//
// When the download starts depends on the first screen. A returning learner (onboarding complete) needs
// content at once: public/index.html already starts it for them before any script runs, and this
// provider fetches as soon as the settings store has loaded. On a first visit it starts once the
// onboarding screen is on screen, so its 180 KB does not compete with the scripts and fonts that screen
// needs on a slow connection; the learner spends far longer than the download on onboarding's two taps,
// and finishing early simply waits for it (useContentDbWhenReady).

import { useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { registerDemoKeyPoints } from '@/api/demo-grading';
import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/design/tokens';
import { shouldShowOnboarding } from '@/features/onboarding/onboarding-flow';
import { isOnboardingShown, subscribeOnboardingShown } from '@/features/onboarding/onboarding-shown';
import { isHydrationSettled, subscribeHydrationSettled } from '@/state/hydration';
import { useSettingsStore } from '@/state/settings';

import type { Lesson } from '../../content/schema/types';

import type { ContentReader } from './content-reader';
import { createSnapshotReader, type ContentSnapshot } from './content-snapshot';

type LoadState = { status: 'loading' } | { status: 'ready'; reader: ContentReader } | { status: 'failed' };

let state: LoadState = { status: 'loading' };
const listeners = new Set<() => void>();

function setState(next: LoadState): void {
  state = next;
  for (const listener of [...listeners]) listener();
}

let resolveLoaded: (reader: ContentReader) => void = () => undefined;
let rejectLoaded: (error: unknown) => void = () => undefined;
/** Settles when the snapshot has loaded (or failed). Waiting on it does not start the download. */
const loaded = new Promise<ContentReader>((resolve, reject) => {
  resolveLoaded = resolve;
  rejectLoaded = reject;
});
loaded.catch(() => undefined); // failures surface through `state`; no unhandled rejection

let started = false;

/** Start downloading the snapshot (once). */
function startLoad(): Promise<ContentReader> {
  if (started) return loaded;
  started = true;
  fetch('/content.json')
    .then((res) => {
      if (!res.ok) throw new Error(`content.json ${res.status}`);
      return res.json() as Promise<ContentSnapshot>;
    })
    .then((snapshot) => {
      const reader = createSnapshotReader(snapshot);
      const keyPoints: Record<string, { id: string; text: string }[]> = {};
      for (const course of Object.values(snapshot.courseById)) {
        for (const unit of course.units) {
          for (const lesson of unit.lessons) {
            keyPoints[lesson.concept.conceptId] = lesson.concept.keyPoints;
          }
        }
      }
      registerDemoKeyPoints(keyPoints);
      setState({ status: 'ready', reader });
      resolveLoaded(reader);
    })
    .catch((error: unknown) => {
      setState({ status: 'failed' });
      rejectLoaded(error);
    });
  return loaded;
}

/** Backstop: whatever the first screen turns out to be, content is on its way by now. */
const START_BACKSTOP_MS = 3_000;

/** Decide when to start the download (see the header note). */
function useStartLoad(): void {
  const hydrated = useSyncExternalStore(
    (onChange) => subscribeHydrationSettled(useSettingsStore, onChange),
    () => isHydrationSettled(useSettingsStore),
    () => false,
  );
  const step = useSettingsStore((s) => s.onboardingStep);
  const onboardingShown = useSyncExternalStore(subscribeOnboardingShown, isOnboardingShown, () => false);

  useEffect(() => {
    const backstop = setTimeout(startLoad, START_BACKSTOP_MS);
    return () => clearTimeout(backstop);
  }, []);

  useEffect(() => {
    if (hydrated && !shouldShowOnboarding(step)) void startLoad();
  }, [hydrated, step]);

  useEffect(() => {
    if (!onboardingShown) return;
    // After the onboarding screen has painted.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(startLoad, 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [onboardingShown]);
}

// A failed load is not retried in a loop: the screen stays suspended under the "refresh" message.
const never = new Promise<never>(() => undefined);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useLoadState(): LoadState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

const ReaderContext = createContext<ContentReader | null>(null);

function ContentLoading({ failed }: { failed: boolean }): ReactNode {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading your lessons"
      style={[
        StyleSheet.absoluteFill,
        { alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bg },
      ]}
    >
      {failed ? (
        <AppText tier="body" size="base" color={colors.textSecondary}>
          Lessons did not load. Refresh the page to try again.
        </AppText>
      ) : (
        <ActivityIndicator color={colors.clay400} />
      )}
    </View>
  );
}

export function ContentProvider({ children }: { children: ReactNode }): ReactNode {
  useStartLoad();
  const load = useLoadState();
  const segments = useSegments();
  const reader = load.status === 'ready' ? load.reader : null;
  // Onboarding renders without content; every other screen waits under the loading view.
  const covered = reader === null && segments[0] !== 'onboarding';
  return (
    <ReaderContext.Provider value={reader}>
      {children}
      {covered ? <ContentLoading failed={load.status === 'failed'} /> : null}
    </ReaderContext.Provider>
  );
}

/** The content reader. Suspends the calling screen until the snapshot has loaded. */
export function useContentDb(): ContentReader {
  const reader = useContext(ReaderContext);
  if (reader !== null) return reader;
  // Throwing a promise suspends this screen (its route's Suspense boundary) until content is in.
  throw state.status === 'failed' ? never : loaded;
}

/**
 * For a screen that renders without content and needs it only in a handler (onboarding's finish):
 * the reader if it is already loaded, else null, plus a promise that settles once it is.
 */
export function useContentDbWhenReady(): { reader: ContentReader | null; ready: () => Promise<ContentReader> } {
  const reader = useContext(ReaderContext);
  return useMemo(() => ({ reader, ready: startLoad }), [reader]);
}

/** Convenience hook: the fully-hydrated lesson for `id`, or undefined if unknown. */
export function useLesson(id: string): Lesson | undefined {
  const reader = useContentDb();
  return useMemo(() => reader.getLesson(id), [reader, id]);
}
