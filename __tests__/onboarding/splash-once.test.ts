// __tests__/onboarding/splash-once.test.ts  (IB-5)
//
// Several places may ask for the splash to lift (the first-run gate, the not-found and error screens);
// only the first request reaches the native module, while the root layout's failsafe always does.

import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
}));

import * as SplashScreen from 'expo-splash-screen';

import { forceHideAppSplash, hideAppSplash } from '@/components/splash';

describe('splash control', () => {
  it('hides once on request, and again only through the failsafe', () => {
    const hideAsync = jest.mocked(SplashScreen.hideAsync);
    hideAppSplash();
    hideAppSplash();
    expect(hideAsync).toHaveBeenCalledTimes(1);
    forceHideAppSplash();
    expect(hideAsync).toHaveBeenCalledTimes(2);
  });

  it('survives a native module that rejects or throws', () => {
    const hideAsync = jest.mocked(SplashScreen.hideAsync);
    hideAsync.mockRejectedValueOnce(new Error('no splash registered'));
    expect(() => forceHideAppSplash()).not.toThrow();
    hideAsync.mockImplementationOnce(() => {
      throw new Error('native module missing');
    });
    expect(() => forceHideAppSplash()).not.toThrow();
  });
});
