import type { ChestTier } from './rewards';

export type QuestMetric = 'xp' | 'lessons' | 'correct' | 'combo' | 'minutes';
export interface DailyQuest {
  id: string;
  metric: QuestMetric;
  label: string;
  target: number;
  progress: number;
  chestTier: Exclude<ChestTier, 'bonus'>;
  claimed: boolean;
}

const ROTATIONS: readonly (readonly QuestMetric[])[] = [
  ['xp', 'lessons', 'correct'],
  ['minutes', 'xp', 'combo'],
  ['correct', 'minutes', 'lessons'],
];

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

function questFor(metric: QuestMetric, difficulty: 0 | 1 | 2, dailyGoalMinutes: number, date: string): DailyQuest {
  const targets: Record<QuestMetric, number[]> = {
    xp: [20, 40, 70],
    lessons: [1, 2, 3],
    correct: [5, 12, 20],
    combo: [3, 5, 8],
    minutes: [Math.max(5, Math.round(dailyGoalMinutes / 2)), dailyGoalMinutes, Math.round(dailyGoalMinutes * 1.5)],
  };
  const verbs: Record<QuestMetric, string> = {
    xp: 'Earn XP', lessons: 'Complete lessons', correct: 'Answer correctly', combo: 'Build a combo', minutes: 'Spend time learning',
  };
  const tiers = ['bronze', 'silver', 'gold'] as const;
  return { id: `${date}:${difficulty}:${metric}`, metric, label: verbs[metric], target: targets[metric][difficulty], progress: 0, chestTier: tiers[difficulty], claimed: false };
}

export function createDailyQuests(date: string, dailyGoalMinutes: number): DailyQuest[] {
  const rotation = ROTATIONS[Math.abs(dayNumber(date)) % ROTATIONS.length];
  return rotation.map((metric, index) => questFor(metric, index as 0 | 1 | 2, dailyGoalMinutes, date));
}

export function advanceQuests(quests: readonly DailyQuest[], gains: Partial<Record<QuestMetric, number>>): DailyQuest[] {
  return quests.map((quest) => ({
    ...quest,
    progress: Math.min(quest.target, quest.progress + Math.max(0, gains[quest.metric] ?? 0)),
  }));
}

export function claimableQuests(quests: readonly DailyQuest[]): DailyQuest[] {
  return quests.filter((quest) => quest.progress >= quest.target && !quest.claimed);
}

export function allThreeComplete(quests: readonly DailyQuest[]): boolean {
  return quests.length === 3 && quests.every((quest) => quest.progress >= quest.target);
}
