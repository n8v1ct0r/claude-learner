import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { createEnergyState } from '../../src/engine/energy';
import { createDailyQuests } from '../../src/engine/quests';
import { createCard } from '../../src/engine/srs';
import { createStreakState } from '../../src/engine/streak';
import { useExamAttemptStore, type ExamAttempt } from '../../src/state/exam-attempt';
import { useGameStore } from '../../src/state/game';
import { useProgressStore } from '../../src/state/progress';
import { useSettingsStore } from '../../src/state/settings';
import { useSrsStore } from '../../src/state/srs';
import { applyRemoteState, type RemoteStateSnapshot } from '../../src/sync/pull';

beforeEach(() => {
  useProgressStore.getState().reset();
  useSrsStore.getState().reset();
  useGameStore.getState().reset();
  useExamAttemptStore.getState().reset();
  useSettingsStore.getState().reset();
});

describe('two-way LWW state merge', () => {
  it('restores newer server progress, SRS, quests, achievements, exams, and privacy preference', () => {
    const quest = createDailyQuests('2026-07-15', 10)[0];
    useGameStore.setState({ quests: [quest], questUpdatedAt: { [quest.id]: 5 } });
    useProgressStore.setState({
      energy: createEnergyState(1, 2),
      energyUpdatedAt: 10,
      streakUpdatedAt: 10,
      totalXp: 10,
    });
    useSettingsStore.setState({ leaderboardOptOut: false, leaderboardOptOutUpdatedAt: 10 });

    const remoteCard = { ...createCard('q-remote', 'concept-1', 'question', 20), reps: 2 };
    const remoteAttempt: ExamAttempt = {
      attemptId: 'mock-1:20:1',
      examId: 'mock-1',
      mode: 'simulation',
      questionIds: ['q-remote'],
      timeLimitMinutes: 120,
      startedAt: 20,
      deadlineAt: 7_200_020,
      cursor: 0,
      answers: {},
      flaggedQuestionIds: [],
      completedAt: 40,
      submittedReason: 'completed',
      mistakesCapturedAt: 45,
      result: { rawScore: 1, scaledScore: 1000, passed: true, domainScores: { d1: { percent: 100 } }, durationSeconds: 20 },
      updatedAt: 50,
    };
    const remoteStreak = { ...createStreakState(), current: 4, longest: 4, freezesUsed: 1 };
    const snapshot: RemoteStateSnapshot = {
      progress: {
        lessons: [{ lessonId: 'lesson-remote', updatedAt: 30 }],
        totalXp: 90,
        energy: { state: createEnergyState(30, 5), updatedAt: 30 },
        streak: { state: remoteStreak, updatedAt: 30 },
      },
      srs: [{ card: remoteCard, lastGrade: 3, updatedAt: 30 }],
      quests: [{ questId: quest.id, progress: quest.target, claimed: true, updatedAt: 30 }],
      achievements: [{ achievementId: 'lessons-1', unlockedAt: 30 }],
      exams: [remoteAttempt],
      leaderboard: { optOut: true, updatedAt: 30 },
    };

    applyRemoteState(snapshot);

    expect(useProgressStore.getState()).toMatchObject({
      completedLessonIds: ['lesson-remote'],
      totalXp: 90,
      energy: { energy: 5 },
      streak: { current: 4, freezesUsed: 1 },
    });
    expect(useSrsStore.getState().cards['q-remote']).toEqual(remoteCard);
    expect(useGameStore.getState().quests[0]).toMatchObject({ progress: quest.target, claimed: true });
    expect(useGameStore.getState().unlockedAchievementIds).toContain('lessons-1');
    expect(useExamAttemptStore.getState().history[0]).toMatchObject({ attemptId: remoteAttempt.attemptId, result: { passed: true } });
    expect(useSettingsStore.getState().leaderboardOptOut).toBe(true);
  });

  it('keeps newer local rows when an older server snapshot arrives', () => {
    useProgressStore.setState({
      energy: createEnergyState(100, 3),
      energyUpdatedAt: 100,
      streak: { ...createStreakState(), current: 7 },
      streakUpdatedAt: 100,
    });
    useProgressStore.getState().mergeRemote({
      lessons: [],
      totalXp: 0,
      energy: { state: createEnergyState(10, 1), updatedAt: 10 },
      streak: { state: { ...createStreakState(), current: 1 }, updatedAt: 10 },
    });
    expect(useProgressStore.getState().energy.energy).toBe(3);
    expect(useProgressStore.getState().streak.current).toBe(7);
  });
});
