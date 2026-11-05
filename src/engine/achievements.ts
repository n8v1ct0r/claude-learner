export type AchievementMetric = 'lessons' | 'xp' | 'streak' | 'exams' | 'perfectLessons';
export interface AchievementStats { lessons: number; xp: number; streak: number; exams: number; perfectLessons: number }
export interface AchievementDefinition { id: string; title: string; metric: AchievementMetric; threshold: number; tier: 1 | 2 | 3 }

const TRACKS: readonly [AchievementMetric, string, readonly number[]][] = [
  ['lessons', 'Pathfinder', [1, 10, 30]],
  ['xp', 'XP Architect', [100, 1_000, 5_000]],
  ['streak', 'Steady Builder', [7, 30, 100]],
  ['exams', 'Exam Explorer', [1, 5, 10]],
  ['perfectLessons', 'Precision Builder', [1, 5, 20]],
];

export const ACHIEVEMENTS: AchievementDefinition[] = TRACKS.flatMap(([metric, title, thresholds]) =>
  thresholds.map((threshold, index) => ({ id: `${metric}-${index + 1}`, title, metric, threshold, tier: (index + 1) as 1 | 2 | 3 })),
);

export function newlyUnlocked(stats: AchievementStats, unlockedIds: readonly string[]): AchievementDefinition[] {
  const unlocked = new Set(unlockedIds);
  return ACHIEVEMENTS.filter((achievement) => !unlocked.has(achievement.id) && stats[achievement.metric] >= achievement.threshold);
}

export interface MonthlyBadgeState { month: string; completedQuests: number; awarded: boolean }
export const MONTHLY_BADGE_TARGET = 30;

export function updateMonthlyBadge(state: MonthlyBadgeState | null, month: string, newlyCompleted: number): MonthlyBadgeState {
  const current = state?.month === month ? state : { month, completedQuests: 0, awarded: false };
  const completedQuests = current.completedQuests + Math.max(0, newlyCompleted);
  return { month, completedQuests, awarded: current.awarded || completedQuests >= MONTHLY_BADGE_TARGET };
}
