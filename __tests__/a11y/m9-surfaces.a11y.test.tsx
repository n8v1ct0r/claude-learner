import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The account card below only exists in builds that carry the public Supabase config; the App Store
// v1.0 build is local-only and renders no card (see __tests__/account/local-only-build.test.tsx).
jest.mock('@/api/supabase', () => ({
  ...(jest.requireActual('@/api/supabase') as object),
  isSupabaseConfigured: true,
}));

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/db/content-provider', () => {
  const lessons = Array.from({ length: 4 }, (_, index) => ({ id: `c1-u1-l${index + 1}` }));
  const course = {
    id: 'c1',
    domain: 'd1',
    title: 'Agentic Architecture & Orchestration',
    units: [{ id: 'c1-u1', lessons }],
  };
  return {
    useContentDb: () => ({
      listCourses: () => [{ id: 'c1', domain: 'd1' }],
      getCourse: () => course,
      listExams: () => [],
    }),
  };
});

import LeaderboardScreen from '../../app/(tabs)/leaderboard';
import { AccountSyncCard } from '../../src/features/account/AccountSyncCard';
import { useSessionMetaStore } from '../../src/state/session-meta';

beforeEach(() => useSessionMetaStore.getState().reset());

describe('M9 account and readiness accessibility', () => {
  it('keeps the readiness screen useful and truthful before a first mock', async () => {
    await render(<LeaderboardScreen />);
    expect(screen.getByRole('header', { name: 'Know what to study next' })).toBeTruthy();
    expect(screen.getByText(/No mock evidence yet/i)).toBeTruthy();
    expect(screen.getByText('Blueprint coverage')).toBeTruthy();
  });

  it('labels the anonymous account upgrade fields and one obvious next action', async () => {
    useSessionMetaStore.getState().setSyncMeta({ backendConfigured: true, accountState: 'anonymous', syncState: 'synced' });
    await render(<AccountSyncCard />);
    expect(screen.getByLabelText('Email address for saving this profile')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Email me a 6-digit code' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeTruthy();
  });
});
