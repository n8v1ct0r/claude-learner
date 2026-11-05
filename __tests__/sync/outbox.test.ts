import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { createEnergyState } from '../../src/engine/energy';
import { createStreakState } from '../../src/engine/streak';
import { createClientEventId, useOutboxStore } from '../../src/sync/outbox';

beforeEach(() => useOutboxStore.getState().reset());

describe('offline outbox', () => {
  it('queues stable UUID-shaped XP, progress, and SRS work while offline', () => {
    const id = useOutboxStore.getState().queueXp({ amount: 10, source: 'lesson', sourceId: 'lesson-1', occurredAt: 1_000 });
    useOutboxStore.getState().queueProgress({ lessonId: 'lesson-1', bestScore: 100, updatedAt: 1_000 });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(useOutboxStore.getState().items).toHaveLength(2);
  });

  it('generates distinct client event ids', () => {
    expect(createClientEventId(1_000, 0.5)).not.toBe(createClientEventId(1_000, 0.5));
  });

  it('coalesces LWW rows while preserving every XP event', () => {
    const outbox = useOutboxStore.getState();
    outbox.queueXp({ amount: 10, source: 'lesson', sourceId: 'l1', occurredAt: 1 });
    outbox.queueXp({ amount: 10, source: 'lesson', sourceId: 'l1', occurredAt: 2 });
    outbox.queueEnergy({ state: createEnergyState(1, 4), updatedAt: 1 });
    outbox.queueEnergy({ state: createEnergyState(2, 3), updatedAt: 2 });
    outbox.queueStreak({ state: createStreakState(), updatedAt: 1 });
    outbox.queueStreak({ state: { ...createStreakState(), current: 1 }, updatedAt: 2 });
    outbox.queueProfile({ leaderboardOptOut: false, updatedAt: 1 });
    outbox.queueProfile({ leaderboardOptOut: true, updatedAt: 2 });

    const items = useOutboxStore.getState().items;
    expect(items.filter((item) => item.kind === 'xp')).toHaveLength(2);
    expect(items.filter((item) => item.kind === 'energy')).toHaveLength(1);
    expect(items.filter((item) => item.kind === 'streak')).toHaveLength(1);
    expect(items.filter((item) => item.kind === 'profile')).toHaveLength(1);
    expect(items.find((item) => item.kind === 'profile')?.payload.leaderboardOptOut).toBe(true);
  });
});
