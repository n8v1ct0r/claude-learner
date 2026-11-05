// __tests__/path/path-model.test.ts
//
// The Duolingo path-model (src/features/path/path-model.ts) is a PURE function of a hydrated course +
// the progress ledger, so it is tested directly with synthetic fixtures — no React, no content db.
// Covers: lesson locked/current/completed states from progress; exactly-one 'current'; chest/
// legendary/review placement; and reward-node unlock rules.

import { describe, expect, it } from '@jest/globals';

import { buildPathModel, type PathNode } from '@/features/path/path-model';

import type { Course, Lesson, Unit } from '../../content/schema/types';

// --- minimal fixtures ------------------------------------------------------------------------------
// buildPathModel only reads ids/titles/units/lessons, so a structural fixture (cast once at the
// boundary) keeps these tests readable without hand-authoring full Question/Concept payloads.

function lesson(id: string, title: string, order: number): Lesson {
  return { id, title, order, exercises: [] } as unknown as Lesson;
}

function unit(id: string, title: string, lessons: Lesson[]): Unit {
  return { id, title, order: 0, lessons } as unknown as Unit;
}

function course(units: Unit[]): Course {
  return { id: 'c1', domain: 'd1', title: 'Course One', description: '', order: 0, units } as unknown as Course;
}

const U1 = unit('u1', 'Unit One', [
  lesson('l1', 'Lesson One', 0),
  lesson('l2', 'Lesson Two', 1),
  lesson('l3', 'Lesson Three', 2),
]);

const byKey = (nodes: PathNode[], key: string): PathNode => {
  const node = nodes.find((n) => n.key === key);
  if (!node) throw new Error(`no node with key ${key}`);
  return node;
};

describe('buildPathModel — lesson states from progress', () => {
  it('marks completed lessons completed, the target current, and the rest locked', () => {
    const nodes = buildPathModel({
      course: course([U1]),
      completedLessonIds: ['l1'],
      currentLessonId: 'l2',
    });
    expect(byKey(nodes, 'lesson:l1').status).toBe('completed');
    expect(byKey(nodes, 'lesson:l2').status).toBe('current');
    expect(byKey(nodes, 'lesson:l3').status).toBe('locked');
  });

  it('has exactly one current node across the whole path', () => {
    const nodes = buildPathModel({
      course: course([U1]),
      completedLessonIds: ['l1'],
      currentLessonId: 'l2',
    });
    expect(nodes.filter((n) => n.status === 'current')).toHaveLength(1);
  });

  it('makes the very first lesson current for a brand-new learner', () => {
    const nodes = buildPathModel({
      course: course([U1]),
      completedLessonIds: [],
      currentLessonId: 'l1',
    });
    expect(byKey(nodes, 'lesson:l1').status).toBe('current');
    expect(byKey(nodes, 'lesson:l2').status).toBe('locked');
  });

  it('exposes the 1-based lesson number for each lesson node', () => {
    const nodes = buildPathModel({ course: course([U1]), completedLessonIds: [], currentLessonId: 'l1' });
    expect(byKey(nodes, 'lesson:l1').lessonNumber).toBe(1);
    expect(byKey(nodes, 'lesson:l3').lessonNumber).toBe(3);
  });
});

describe('buildPathModel — chest / legendary / review placement', () => {
  it('emits one meaningful reward checkpoint instead of a chest after every lesson', () => {
    const nodes = buildPathModel({ course: course([U1]), completedLessonIds: [], currentLessonId: 'l1' });
    expect(nodes.map((n) => n.type)).toEqual([
      'lesson',
      'lesson',
      'chest',
      'lesson',
      'legendary',
      'review',
    ]);
  });

  it('places a chest at the configured cadence and none after the last lesson', () => {
    const nodes = buildPathModel({ course: course([U1]), completedLessonIds: [], currentLessonId: 'l1' });
    const chests = nodes.filter((n) => n.type === 'chest');
    expect(chests).toHaveLength(1);
    // The chest after the final lesson would have key chest:u1:l3 — it must not exist.
    expect(nodes.some((n) => n.key === 'chest:u1:l3')).toBe(false);
  });

  it('unlocks a chest only once the lesson before it is completed', () => {
    const locked = buildPathModel({ course: course([U1]), completedLessonIds: [], currentLessonId: 'l1' });
    expect(byKey(locked, 'chest:u1:l2').status).toBe('locked');

    const unlocked = buildPathModel({ course: course([U1]), completedLessonIds: ['l1'], currentLessonId: 'l2' });
    expect(byKey(unlocked, 'chest:u1:l2').status).toBe('locked'); // l2 not done yet

    const afterSecond = buildPathModel({
      course: course([U1]),
      completedLessonIds: ['l1', 'l2'],
      currentLessonId: 'l3',
    });
    expect(byKey(afterSecond, 'chest:u1:l2').status).toBe('completed');
  });

  it('locks the legendary node until every lesson in the unit is completed', () => {
    const partial = buildPathModel({ course: course([U1]), completedLessonIds: ['l1', 'l2'], currentLessonId: 'l3' });
    expect(byKey(partial, 'legendary:u1').status).toBe('locked');

    const full = buildPathModel({ course: course([U1]), completedLessonIds: ['l1', 'l2', 'l3'], currentLessonId: null });
    expect(byKey(full, 'legendary:u1').status).toBe('completed');
  });

  it('locks the review node until at least one lesson is completed, then unlocks it', () => {
    const none = buildPathModel({ course: course([U1]), completedLessonIds: [], currentLessonId: 'l1' });
    expect(byKey(none, 'review:u1').status).toBe('locked');
    expect(byKey(none, 'review:u1').targetUnitId).toBe('u1');

    const some = buildPathModel({ course: course([U1]), completedLessonIds: ['l1'], currentLessonId: 'l2' });
    expect(byKey(some, 'review:u1').status).toBe('completed');
  });

  it('review is always the final node of its unit', () => {
    const nodes = buildPathModel({ course: course([U1]), completedLessonIds: [], currentLessonId: 'l1' });
    expect(nodes[nodes.length - 1].type).toBe('review');
  });
});

describe('buildPathModel — multiple units are data-driven', () => {
  const U2 = unit('u2', 'Unit Two', [lesson('l4', 'Lesson Four', 0), lesson('l5', 'Lesson Five', 1)]);

  it('lays out every unit in order, each ending with its own legendary + review', () => {
    const nodes = buildPathModel({
      course: course([U1, U2]),
      completedLessonIds: ['l1', 'l2', 'l3'],
      currentLessonId: 'l4',
    });

    // All of unit one's nodes precede all of unit two's nodes.
    const firstU2Index = nodes.findIndex((n) => n.unitId === 'u2');
    const lastU1Index = nodes.map((n) => n.unitId).lastIndexOf('u1');
    expect(lastU1Index).toBeLessThan(firstU2Index);

    // Unit one is fully done -> its legendary unlocked; unit two's legendary still locked.
    expect(byKey(nodes, 'legendary:u1').status).toBe('completed');
    expect(byKey(nodes, 'legendary:u2').status).toBe('locked');

    // The frontier is in unit two.
    expect(byKey(nodes, 'lesson:l4').status).toBe('current');
    expect(byKey(nodes, 'lesson:l5').status).toBe('locked');
  });
});
