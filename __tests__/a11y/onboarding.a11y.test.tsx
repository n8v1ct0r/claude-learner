// Accessibility audit for the first-run onboarding surface (GC-10). Verifies each step exposes a
// header role, that every choice is a labelled button (Button3D enforces role + ≥44pt), and that the
// step-progress affordance carries a screen-reader label. Dynamic Type is honored automatically via
// AppText (no allowFontScaling={false} anywhere in this surface — see the source scan below).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

jest.mock('@/db/content-provider', () => ({
  useContentDbWhenReady: () => ({ reader: { getFirstLesson: () => ({ id: 'c1-u1-l1' }) }, ready: async () => ({}) }),
}));

import OnboardingScreen from '../../app/onboarding/index';
import { useSettingsStore } from '../../src/state/settings';

beforeEach(() => useSettingsStore.getState().reset());

describe('onboarding accessibility', () => {
  it('exam-date step: header role + one labelled button per choice', async () => {
    await render(<OnboardingScreen />);
    expect(screen.getByRole('header', { name: 'When is your exam?' })).toBeTruthy();
    for (const name of ['About 2 weeks away', 'About 1 month away', 'About 3 months away', 'Just exploring for now']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    // Skip-forward is always reachable and labelled.
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    // Step progress is announced.
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy();
  });

  it('daily-goal step: header role + one labelled button per goal option', async () => {
    useSettingsStore.getState().setOnboardingStep('daily-goal');
    await render(<OnboardingScreen />);
    expect(screen.getByRole('header', { name: 'How much time feels good each day?' })).toBeTruthy();
    for (const minutes of [5, 10, 15, 20]) {
      expect(screen.getByRole('button', { name: `${minutes} minutes a day` })).toBeTruthy();
    }
    expect(screen.getByLabelText('Step 2 of 2')).toBeTruthy();
  });

  it('never disables font scaling on the onboarding surface (Dynamic Type honored)', () => {
    const source = readFileSync(join(__dirname, '../../app/onboarding/index.tsx'), 'utf8');
    expect(source).not.toMatch(/allowFontScaling\s*=\s*\{?\s*false/);
  });
});
