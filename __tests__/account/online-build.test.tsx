// __tests__/account/online-build.test.tsx
//
// A build that DOES carry EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_KEY (a developer build, or a
// later online release) keeps every online path: the account card with its status, queue counter and
// sync action, and the grader's quiet "Checking…" caption during explain-back. The About footer still
// carries the affiliation line but drops the on-device storage note, because sync is on.
// __tests__/account/local-only-build.test.tsx covers the App Store v1.0 build without the config.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// A configured build. The real module stays in place (no env, so no client is created in tests);
// only the build-time flag flips.
jest.mock('@/api/supabase', () => ({
  ...(jest.requireActual('@/api/supabase') as object),
  isSupabaseConfigured: true,
}));

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('@/db/content-provider', () => ({
  useContentDb: () => ({
    listCourses: () => [],
    getCourse: () => undefined,
    listExams: () => [],
  }),
}));

import { AboutFooter } from '../../src/features/account/AboutFooter';
import { AccountSyncCard } from '../../src/features/account/AccountSyncCard';
import { isLocalOnlyBuild } from '../../src/features/account/local-only';
import { ExamHub } from '../../src/features/exams/ExamHub';
import { ExplainBack } from '../../src/features/lesson-player/ExplainBack';
import { useExamAttemptStore } from '../../src/state/exam-attempt';
import { useSessionMetaStore } from '../../src/state/session-meta';

const keyPoints = [
  { id: 'kp-online-1', text: 'A workflow follows steps fixed in code.' },
  { id: 'kp-online-2', text: 'An agent chooses its own next step.' },
];

const noop = () => undefined;

beforeEach(() => useSessionMetaStore.getState().reset());

describe('online build (Supabase config present)', () => {
  it('is not local-only', () => {
    expect(isLocalOnlyBuild).toBe(false);
  });

  it('shows the account card with its status, queued count and sync action', async () => {
    useSessionMetaStore.getState().setSyncMeta({
      backendConfigured: true,
      accountState: 'anonymous',
      syncState: 'idle',
      pendingSyncCount: 3,
    });
    await render(<AccountSyncCard />);
    expect(screen.getByText('Account & backup')).toBeTruthy();
    expect(screen.getByText('INSTANT PROFILE')).toBeTruthy();
    expect(screen.getByText('3 queued')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeTruthy();
    expect(screen.getByLabelText('Email address for saving this profile')).toBeTruthy();
  });

  it('reads "connecting" before the sync runtime reports an account, never the unconfigured copy', async () => {
    await render(<AccountSyncCard />);
    expect(screen.getByText('CONNECTING')).toBeTruthy();
    expect(screen.queryByText(/configured/i)).toBeNull();
  });

  it('keeps the grader "Checking…" caption while a verdict is in flight', async () => {
    await render(
      <ExplainBack
        prompt="Explain the difference between a workflow and an agent."
        keyPoints={keyPoints}
        status="submitted"
        coveredIds={[]}
        grading="pending"
        coachingHint={null}
        canRefine={false}
        onSubmit={noop}
        onRefine={noop}
        onToggleCovered={noop}
        onFinish={noop}
        onSkip={noop}
      />,
    );
    expect(screen.getByLabelText('Checking your explanation')).toBeTruthy();
  });

  it('keeps the affiliation line in the About footer and drops the on-device note', async () => {
    await render(<AboutFooter />);
    expect(screen.getByRole('header', { name: 'Claude Learners' })).toBeTruthy();
    expect(screen.getByText('Independent project. Not affiliated with Anthropic.')).toBeTruthy();
    expect(screen.queryByText('Your progress is saved on this device.')).toBeNull();
  });

  it('keeps "saved offline" on an exam in progress, which syncs once back online', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'simulation',
      questionIds: ['exam-q1', 'exam-q2', 'exam-q3'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<ExamHub activeAttempt={attempt} onStart={noop} onResume={noop} />);
    expect(screen.getByText('SAVED OFFLINE')).toBeTruthy();
    expect(screen.queryByText('SAVED ON THIS DEVICE')).toBeNull();
  });
});
