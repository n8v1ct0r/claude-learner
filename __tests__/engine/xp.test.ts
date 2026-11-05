import { describe, expect, it } from '@jest/globals';

import {
  BASE_LESSON_XP,
  BOOST_DURATION_MS,
  BOOST_MULTIPLIER,
  GOLD_REPLAY_XP,
  LEGENDARY_XP,
  MAX_COMBO_BONUS,
  UNIT_COMPLETE_XP,
  applyBoost,
  comboBonus,
  computeLessonXp,
  isBoostActive,
} from '@/engine/xp';
import type { BoostWindow, ExplainBackGrade } from '@/engine/xp';

describe('comboBonus', () => {
  it('is 0 with no running combo (0 or 1 correct)', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(1)).toBe(0);
  });
  it('rises one XP per additional correct answer', () => {
    expect(comboBonus(2)).toBe(1);
    expect(comboBonus(4)).toBe(3);
    expect(comboBonus(6)).toBe(5);
  });
  it('caps at MAX_COMBO_BONUS', () => {
    expect(comboBonus(50)).toBe(MAX_COMBO_BONUS);
    expect(MAX_COMBO_BONUS).toBe(5);
  });
});

describe('boost windows', () => {
  const window: BoostWindow = { startedAt: 1_000 };

  it('is inactive with no window', () => {
    expect(isBoostActive(null, 1_000)).toBe(false);
    expect(isBoostActive(undefined, 1_000)).toBe(false);
    expect(applyBoost(null, 1_000)).toBe(1);
  });
  it('is active at the exact start edge (inclusive)', () => {
    expect(isBoostActive(window, 1_000)).toBe(true);
    expect(applyBoost(window, 1_000)).toBe(BOOST_MULTIPLIER);
  });
  it('is active one ms before the end', () => {
    expect(isBoostActive(window, 1_000 + BOOST_DURATION_MS - 1)).toBe(true);
  });
  it('is inactive at the exact end edge (exclusive)', () => {
    expect(isBoostActive(window, 1_000 + BOOST_DURATION_MS)).toBe(false);
    expect(applyBoost(window, 1_000 + BOOST_DURATION_MS)).toBe(1);
  });
  it('is inactive before the start', () => {
    expect(isBoostActive(window, 999)).toBe(false);
  });
  it('honors a custom duration', () => {
    const short: BoostWindow = { startedAt: 0, durationMs: 100 };
    expect(isBoostActive(short, 99)).toBe(true);
    expect(isBoostActive(short, 100)).toBe(false);
  });
});

describe('computeLessonXp', () => {
  it('awards the flat base for a plain lesson completion', () => {
    const r = computeLessonXp({});
    expect(r.base).toBe(BASE_LESSON_XP);
    expect(r.total).toBe(10);
    expect(r.multiplier).toBe(1);
  });

  it('adds the in-lesson combo bonus', () => {
    expect(computeLessonXp({ bestComboStreak: 6 }).total).toBe(10 + 5);
  });

  it('adds unit-complete and legendary bonuses', () => {
    const r = computeLessonXp({ unitCompleted: true, legendary: true });
    expect(r.unit).toBe(UNIT_COMPLETE_XP);
    expect(r.legendary).toBe(LEGENDARY_XP);
    expect(r.total).toBe(10 + 20 + 40);
  });

  it('decays a gold replay to a flat GOLD_REPLAY_XP with no other bonuses', () => {
    const r = computeLessonXp({
      replayOfCompleted: true,
      bestComboStreak: 10,
      unitCompleted: true,
      legendary: true,
    });
    expect(r.base).toBe(GOLD_REPLAY_XP);
    expect(r.combo).toBe(0);
    expect(r.unit).toBe(0);
    expect(r.legendary).toBe(0);
    expect(r.total).toBe(5);
  });

  it('doubles the subtotal inside a live boost window', () => {
    const boost = { window: { startedAt: 0 } as BoostWindow, now: 60_000 };
    expect(computeLessonXp({ bestComboStreak: 6, boost }).total).toBe((10 + 5) * 2);
  });

  it('does not boost outside the window', () => {
    const boost = { window: { startedAt: 0 } as BoostWindow, now: BOOST_DURATION_MS };
    expect(computeLessonXp({ boost }).total).toBe(10);
  });

  it('boosts a gold replay too', () => {
    const boost = { window: { startedAt: 0 } as BoostWindow, now: 1 };
    expect(computeLessonXp({ replayOfCompleted: true, boost }).total).toBe(5 * 2);
  });

  // CRITICAL contract (GC-04 / task item 1): explain-back XP is identical regardless of the grading
  // outcome or connectivity. Grading only ever touches the coverage meter/hints — never the XP.
  describe('explain-back XP is grading- and connectivity-independent', () => {
    const grades: ExplainBackGrade[] = ['covered', 'partial', 'missed', 'offline', 'degraded'];
    const baseline = computeLessonXp({ bestComboStreak: 3 }).total;

    it.each(grades)('grade "%s" yields the same XP as a completed explain-back', (grade) => {
      const withExplain = computeLessonXp({
        bestComboStreak: 3,
        explainBack: { completed: true, grade },
      });
      expect(withExplain.total).toBe(baseline);
    });

    it('skipping explain-back does not change XP either', () => {
      expect(computeLessonXp({ bestComboStreak: 3, explainBack: { completed: false } }).total).toBe(
        baseline,
      );
    });
  });
});
