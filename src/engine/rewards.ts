export type ChestTier = 'bronze' | 'silver' | 'gold' | 'bonus';
export type RewardDrop = 'agent-hard-hat' | 'blueprint-skin' | 'xp-boost' | null;

export interface RewardRule {
  minGems: number;
  maxGems: number;
  cosmeticChance: number;
  boostChance: number;
}

export const REWARD_RULES: Record<ChestTier, RewardRule> = {
  bronze: { minGems: 5, maxGems: 10, cosmeticChance: 0.04, boostChance: 0.06 },
  silver: { minGems: 10, maxGems: 18, cosmeticChance: 0.08, boostChance: 0.1 },
  gold: { minGems: 20, maxGems: 35, cosmeticChance: 0.15, boostChance: 0.15 },
  bonus: { minGems: 12, maxGems: 20, cosmeticChance: 0.1, boostChance: 0.15 },
};

export const GEM_SINKS = {
  streakFreeze: { id: 'streak-freeze', label: 'Streak freeze', price: 40 },
  agentHardHat: { id: 'agent-hard-hat', label: 'Agent hard hat', price: 60 },
  blueprintSkin: { id: 'blueprint-skin', label: 'Blueprint trail', price: 60 },
  xpBoost: { id: 'xp-boost', label: '15-minute 2× XP boost', price: 80 },
} as const;

function unit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.999999, value));
}

export function openChest(tier: ChestTier, gemRoll: number, dropRoll: number): {
  tier: ChestTier;
  gems: number;
  drop: RewardDrop;
} {
  const rule = REWARD_RULES[tier];
  const gems = rule.minGems + Math.floor(unit(gemRoll) * (rule.maxGems - rule.minGems + 1));
  const roll = unit(dropRoll);
  const drop: RewardDrop =
    roll < rule.cosmeticChance / 2
      ? 'agent-hard-hat'
      : roll < rule.cosmeticChance
        ? 'blueprint-skin'
        : roll < rule.cosmeticChance + rule.boostChance
          ? 'xp-boost'
          : null;
  return { tier, gems, drop };
}

export function canAfford(balance: number, price: number): boolean {
  return balance >= price && price >= 0;
}

/** Guaranteed daily quest floors total 47 gems, so every sink is earnable within two normal days. */
export const GUARANTEED_DAILY_QUEST_GEMS =
  REWARD_RULES.bronze.minGems + REWARD_RULES.silver.minGems + REWARD_RULES.gold.minGems + REWARD_RULES.bonus.minGems;
