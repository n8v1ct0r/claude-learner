import '@/design/global-styles';

// Per-weight subpaths, never the '@expo-google-fonts/nunito' barrel: the barrel require()s all 16
// Nunito TTFs, so Metro would bundle 13 unused files (~1.7 MB). Only these three weights are used
// (src/design/tokens.ts fontFamily).
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, router, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ErrorRecovery } from '@/components/ErrorRecovery';
import { GestureRoot } from '@/components/GestureRoot';
import { forceHideAppSplash } from '@/components/splash';
import { ContentProvider } from '@/db/content-provider';
import { pushEnter } from '@/design/screen-transition';
import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { registerAppOpen } from '@/services/local-notifications';
import { SyncBootstrap } from '@/sync/SyncBootstrap';

// Keep the native splash up until the first real screen is settled. OnboardingGate lifts it once the
// fonts are loaded, every persisted store has rehydrated, the content DB is open and the onboarding
// redirect has landed (IB-5), so launch never shows a spinner frame or a flash of the wrong tab.
SplashScreen.preventAutoHideAsync();

/**
 * A failed hydration or a hung load must never strand the learner on the splash. Kept short because a
 * store whose rehydration throws (corrupt JSON, a migrate that fails) never reports hydrated in
 * zustand v5, so every cold launch would wait out the full failsafe until that store is next written.
 */
export const SPLASH_FAILSAFE_MS = 3_000;

export const unstable_settings = {
  // A deep link or web refresh straight into a lesson, a review or an unknown URL still gets the tabs
  // underneath, so back, the edge-swipe gesture and every "Done" land on the Learn tab.
  initialRouteName: '(tabs)',
};

/**
 * Root error boundary: an error above the navigator (fonts, content DB, providers). There is no
 * navigator to leave through, so it offers a retry only.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorRecovery onRetry={retry} />;
}

/** Per-screen error boundary: the navigator survives, so the learner can also go back to Learn. */
function ScreenErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorRecovery onRetry={retry} onHome={() => router.dismissTo('/')} />;
}

// Warm-dark "Clay" theme (PLAN-rev2 Section 4.1). Full semantic tokens land in src/design at M1.
const ClayDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1F1B16',
    card: '#2A251E',
    primary: '#E08A6B',
    text: '#F5EFE6',
    border: '#2A251E',
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    const failsafe = setTimeout(forceHideAppSplash, SPLASH_FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    void registerAppOpen();
  }, []);

  // Render once the fonts settle either way: if they fail to load the app falls back to the system
  // face rather than holding the splash (or a blank screen) forever.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureRoot style={{ flex: 1 }}>
      <ThemeProvider value={ClayDarkTheme}>
        <StatusBar style="light" />
        <SyncBootstrap />
        {/* Opens the bundled content database (assets/content/content.db) and exposes the typed
            reader to every screen; suspends (under the splash) while the asset copies/opens. */}
        <ContentProvider>
          {/* First-run gate: redirects a fresh install into /onboarding before the Path tab settles,
              then lifts the splash. Inert once onboarding is complete, so it never fights the GC-03
              deep-resume. */}
          <OnboardingGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#1F1B16' },
            }}
            unstable_screenErrorBoundary={ScreenErrorBoundary}
          >
            <Stack.Screen name="(tabs)" />
            {/* First-run onboarding (no tab bar); the gate routes here under the splash, so it swaps in
                without an animation. The screen deep-links out. */}
            <Stack.Screen name="onboarding" options={{ presentation: 'card', gestureEnabled: false, animation: 'none' }} />
            {/* Full-screen lesson player (no tab bar) — the Feynman spine lives here. */}
            <Stack.Screen
              name="lesson/[lessonId]"
              options={{ presentation: 'card', contentStyle: [{ backgroundColor: '#1F1B16' }, pushEnter] }}
            />
            {/* Full-screen, energy-free unit review — re-serves a unit's questions (PLAN-rev2 §4.4). */}
            <Stack.Screen
              name="review/[unitId]"
              options={{ presentation: 'card', contentStyle: [{ backgroundColor: '#1F1B16' }, pushEnter] }}
            />
          </Stack>
        </ContentProvider>
      </ThemeProvider>
    </GestureRoot>
  );
}
