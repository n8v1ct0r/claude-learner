// __tests__/onboarding/root-layout.test.tsx  (IB-5, V-a11y-perf-2, V-web-runtime-1, V-web-runtime-3)
//
// The root layout's launch and failure wiring, with the heavy providers stubbed out:
//   • it renders once the fonts settle EITHER way — a font-load error falls back to the system face
//     instead of holding the splash (or a blank screen) forever;
//   • a failsafe lifts the splash even if the first screen never settles;
//   • deep links keep the tabs underneath (initialRouteName), so back never dead-ends;
//   • a root error boundary (retry only) and a per-screen boundary (retry + back to Learn) replace the
//     blank screen a render error used to leave.

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType, ReactNode } from 'react';

jest.mock('../../global.css', () => ({}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/components/splash', () => ({
  hideAppSplash: jest.fn(),
  forceHideAppSplash: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

let mockFonts: [boolean, Error | null] = [false, null];
jest.mock('expo-font', () => ({ useFonts: () => mockFonts }));
jest.mock('@expo-google-fonts/nunito/400Regular', () => ({ Nunito_400Regular: 1 }));
jest.mock('@expo-google-fonts/nunito/600SemiBold', () => ({ Nunito_600SemiBold: 2 }));
jest.mock('@expo-google-fonts/nunito/800ExtraBold', () => ({ Nunito_800ExtraBold: 3 }));

jest.mock('@/db/content-provider', () => ({ ContentProvider: ({ children }: { children: ReactNode }) => children }));
jest.mock('@/features/onboarding/OnboardingGate', () => ({ OnboardingGate: () => null }));
jest.mock('@/sync/SyncBootstrap', () => ({ SyncBootstrap: () => null }));
jest.mock('@/services/local-notifications', () => ({ registerAppOpen: jest.fn(() => Promise.resolve()) }));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: ReactNode }) => children,
}));

const mockStackProps: { current: Record<string, unknown> | null } = { current: null };
const mockRouter = { dismissTo: jest.fn() };
jest.mock('expo-router', () => {
  const rn = require('react-native');
  const Stack = (props: Record<string, unknown> & { children?: ReactNode }) => {
    mockStackProps.current = props;
    return <rn.View testID="root-stack">{props.children}</rn.View>;
  };
  Stack.Screen = function Screen() {
    return null;
  };
  return {
    DarkTheme: { dark: true, colors: {} },
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
    Stack,
    get router() {
      return mockRouter;
    },
  };
});

import RootLayout, { ErrorBoundary, SPLASH_FAILSAFE_MS, unstable_settings } from '../../app/_layout';
import { forceHideAppSplash } from '@/components/splash';

beforeEach(() => {
  mockFonts = [false, null];
  mockStackProps.current = null;
  mockRouter.dismissTo.mockClear();
  jest.mocked(forceHideAppSplash).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('launch', () => {
  it('waits (under the splash) while the fonts load', async () => {
    await render(<RootLayout />);
    expect(screen.queryByTestId('root-stack')).toBeNull();
  });

  it('renders with the system face when the fonts fail to load, instead of hanging', async () => {
    mockFonts = [false, new Error('font download failed')];
    await render(<RootLayout />);
    expect(screen.getByTestId('root-stack')).toBeTruthy();
  });

  it('lifts the splash on a failsafe timer if the first screen never settles', async () => {
    jest.useFakeTimers();
    await render(<RootLayout />);
    expect(forceHideAppSplash).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(SPLASH_FAILSAFE_MS - 1);
    });
    expect(forceHideAppSplash).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(forceHideAppSplash).toHaveBeenCalledTimes(1);
    expect(SPLASH_FAILSAFE_MS).toBeLessThanOrEqual(3_000);
  });

  it('keeps the tabs under any deep-linked screen', () => {
    expect(unstable_settings.initialRouteName).toBe('(tabs)');
  });
});

describe('error boundaries', () => {
  it('a screen error offers a retry and a way back to Learn', async () => {
    mockFonts = [true, null];
    await render(<RootLayout />);
    const ScreenBoundary = mockStackProps.current?.unstable_screenErrorBoundary as ComponentType<{
      error: Error;
      retry: () => Promise<void>;
    }>;
    expect(ScreenBoundary).toBeDefined();

    const retry = jest.fn(() => Promise.resolve());
    await render(<ScreenBoundary error={new Error('render failed')} retry={retry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Learn' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('a root error (above the navigator) offers a retry only', async () => {
    const retry = jest.fn(() => Promise.resolve());
    await render(<ErrorBoundary error={new Error('content DB failed to open')} retry={retry} />);
    expect(screen.getByRole('header', { name: 'This screen hit a snag' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back to Learn' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
