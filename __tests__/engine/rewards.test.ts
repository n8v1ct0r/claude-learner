import { describe, expect, it } from '@jest/globals';
import { canAfford, GEM_SINKS, GUARANTEED_DAILY_QUEST_GEMS, openChest, REWARD_RULES } from '../../src/engine/rewards';

describe('transparent reward economy', () => {
  it('always pays each guaranteed floor and never exceeds the published range', () => {
    for (const tier of ['bronze', 'silver', 'gold', 'bonus'] as const) {
      expect(openChest(tier, -10, 1).gems).toBe(REWARD_RULES[tier].minGems);
      expect(openChest(tier, 999, 1).gems).toBe(REWARD_RULES[tier].maxGems);
      for (let i = 0; i < 100; i += 1) {
        const payout = openChest(tier, i / 100, (100 - i) / 100);
        expect(payout.gems).toBeGreaterThanOrEqual(REWARD_RULES[tier].minGems);
        expect(payout.gems).toBeLessThanOrEqual(REWARD_RULES[tier].maxGems);
      }
    }
  });

  it('keeps every sink within two normal days of guaranteed quest earnings', () => {
    const twoDays = GUARANTEED_DAILY_QUEST_GEMS * 2;
    expect(Object.values(GEM_SINKS).every((sink) => sink.price <= twoDays)).toBe(true);
    expect(canAfford(40, GEM_SINKS.streakFreeze.price)).toBe(true);
    expect(canAfford(39, GEM_SINKS.streakFreeze.price)).toBe(false);
  });

  it('uses additive drops without reducing the gem payout', () => {
    expect(openChest('gold', 0, 0)).toEqual({ tier: 'gold', gems: 20, drop: 'agent-hard-hat' });
    expect(openChest('gold', 0, 0.99)).toEqual({ tier: 'gold', gems: 20, drop: null });
  });
});
