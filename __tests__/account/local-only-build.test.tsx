// __tests__/account/local-only-build.test.tsx
//
// Claude Learners v1.0 on the App Store is LOCAL-ONLY: the store build ships without
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY. This suite pins that mode at the config
// boundary (src/api/supabase) and proves what the learner sees:
//   - Profile has no account card, no backend status copy and no sync-queue counter, even while the
//     never-flushed local outbox reports queued items and the runtime left its unconfigured message;
//   - the About footer carries the product name, the exact affiliation line and where progress lives;
//   - explain-back presents self-assessment as the feature: no grader "Checking…" state;
//   - an exam in progress is "saved on this device", never "saved offline" (nothing is ever online).
// __tests__/account/online-build.test.tsx renders the same surfaces with the config present.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The store build: no public Supabase config, therefore no client.
jest.mock('@/api/supabase', () => ({
  isSupabaseConfigured: false,
  configuredSupabaseUrl: null,
  supabase: null,
  requireSupabaseClient: () => {
    throw new Error('Online backup is not configured on this build yet. Your study progress remains on this device.');
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

// Profile's reminders card reads the notification permission on mount; keep the native module out.
jest.mock('@/services/local-notifications', () => ({
  enableLocalReminders: jest.fn(() => Promise.resolve('granted')),
  readReminderPermission: jest.fn(() => Promise.resolve('ask')),
  turnRemindersBackOn: jest.fn(() => Promise.resolve()),
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

import ProfileScreen from '../../app/(tabs)/profile';
import { AccountSyncCard } from '../../src/features/account/AccountSyncCard';
import { isLocalOnlyBuild } from '../../src/features/account/local-only';
import { ExamHub } from '../../src/features/exams/ExamHub';
import { ExplainBack } from '../../src/features/lesson-player/ExplainBack';
import { useExamAttemptStore } from '../../src/state/exam-attempt';
import { useSessionMetaStore } from '../../src/state/session-meta';

const AFFILIATION = 'Independent project. Not affiliated with Anthropic.';

const keyPoints = [
  { id: 'kp-local-only-1', text: 'A workflow follows steps fixed in code.' },
  { id: 'kp-local-only-2', text: 'An agent chooses its own next step.' },
];

const noop = () => undefined;

beforeEach(() => {
  useSessionMetaStore.getState().reset();
  // What a local-only install accumulates: the outbox keeps queueing, and syncNow() leaves its
  // unconfigured-backend message behind. None of it may reach the screen.
  useSessionMetaStore.getState().setSyncMeta({
    pendingSyncCount: 4,
    syncMessage: 'Progress is stored on this device until online backup is configured.',
  });
});

describe('local-only v1 build (no Supabase config)', () => {
  it('derives local-only mode from the missing Supabase config', () => {
    expect(isLocalOnlyBuild).toBe(true);
  });

  it('renders no account card at all', async () => {
    const view = await render(<AccountSyncCard />);
    expect(view.toJSON()).toBeNull();
  });

  it('shows Profile without backend status, sync queue or account copy, and ends with the About footer', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByRole('header', { name: 'Keep building' })).toBeTruthy();

    expect(screen.queryByText('Account & backup')).toBeNull();
    expect(screen.queryByText(/queued/i)).toBeNull();
    expect(screen.queryByText(/configured/i)).toBeNull();
    expect(screen.queryByText(/online backup/i)).toBeNull();
    expect(screen.queryByText(/sync/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
    expect(screen.queryByLabelText('Email address for saving this profile')).toBeNull();

    expect(screen.getByRole('header', { name: 'Claude Learners' })).toBeTruthy();
    expect(screen.getByText(AFFILIATION)).toBeTruthy();
    expect(screen.getByText('Your progress is saved on this device.')).toBeTruthy();
  });

  it('presents explain-back self-assessment as the feature, with no grader "Checking…" state', async () => {
    // Even if the lesson store is mid-way through its (instant, no-server) grading attempt.
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
    expect(screen.getByText(/^Self-check your explanation\./)).toBeTruthy();
    expect(screen.getByText('Coverage: 0 of 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'See how I did' })).toBeTruthy();
    expect(screen.queryByText('Checking…')).toBeNull();
    expect(screen.queryByLabelText('Checking your explanation')).toBeNull();
  });

  it('says an exam in progress is saved on this device, never "offline"', async () => {
    const attempt = useExamAttemptStore.getState().start({
      examId: 'mini-d1',
      mode: 'simulation',
      questionIds: ['exam-q1', 'exam-q2', 'exam-q3'],
      timeLimitMinutes: 25,
      now: Date.now(),
    });
    await render(<ExamHub activeAttempt={attempt} onStart={noop} onResume={noop} />);
    expect(screen.getByText('Resume where you stopped')).toBeTruthy();
    expect(screen.getByText('SAVED ON THIS DEVICE')).toBeTruthy();
    expect(screen.queryByText(/offline/i)).toBeNull();
  });
});
