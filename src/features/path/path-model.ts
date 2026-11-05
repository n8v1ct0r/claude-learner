// src/features/path/path-model.ts
//
// The PURE path-model: turns a hydrated Course + the durable progress into an ordered, data-driven
// list of PathNodes (the Duolingo "trail"). It has ZERO React/expo imports so it is unit-tested
// directly and the Path screen (app/(tabs)/index.tsx) is a thin renderer over it. Adding units or
// whole courses later needs NO screen changes — the model derives every node from the content tree.
//
// Node types (PLAN-rev2 §3.1):
//   • lesson     — a normal Feynman lesson.
//   • chest      — a reward node placed BETWEEN lessons (opened as you progress).
//   • legendary  — the end-of-unit hard node (a harder pass over the whole unit).
//   • review     — the unit review (re-serve the unit's questions, energy-free).
//
// Status semantics (three states, matching the progress ledger):
//   • 'completed' — for a LESSON: finished at least once. For a CHEST/LEGENDARY/REVIEW node: the node
//                   is UNLOCKED / available to open (its gating lessons are done). Reward/checkpoint
//                   nodes are never the frontier, so "available" collapses onto 'completed'.
//   • 'current'   — the single frontier node the primary CTA points at (always a LESSON). Exactly one
//                   node in the whole path can be 'current' (the resolved Continue target).
//   • 'locked'    — not yet reachable.
//
// Only ONE node is ever 'current' (the resolved Continue target), so exactly one node pulses.

import type { Course, Unit } from '../../../content/schema/types';

export type PathNodeType = 'lesson' | 'chest' | 'legendary' | 'review';
export type PathNodeStatus = 'locked' | 'current' | 'completed';

export interface PathNode {
  /** Stable unique key (React lists + test lookups). */
  key: string;
  type: PathNodeType;
  status: PathNodeStatus;
  /** The unit this node belongs to (drives the section header + review target). */
  unitId: string;
  unitTitle: string;
  /** Primary label shown on/next to the node. */
  title: string;
  /** Secondary hint line (e.g. "Up next", "Completed", "Locked"). */
  subtitle: string;
  /** LESSON nodes only — the lesson the node opens. */
  lessonId?: string;
  /** LEGENDARY / REVIEW nodes only — the unit they act on. */
  targetUnitId?: string;
  /** LESSON nodes only — the 1-based lesson number within its unit (the node glyph). */
  lessonNumber?: number;
}

export interface PathModelInput {
  /** A fully hydrated course (units → lessons). */
  course: Course;
  /** Lesson IDs completed at least once (progress ledger). */
  completedLessonIds: readonly string[];
  /** The lesson the single Continue CTA points at (from resolveContinueTarget), or null. */
  currentLessonId: string | null;
}

/**
 * A chest is emitted after each lesson whose 1-based position within its unit is a multiple of this
 * cadence, EXCEPT after the unit's last lesson (the unit ends with the legendary + review nodes).
 * `2` ⇒ a checkpoint after every second lesson (when it is not the unit ending). Kept a named
 * constant so the trail's reward rhythm is tunable in one place without flooding the syllabus.
 */
export const CHEST_CADENCE = 2;

function lessonStatus(
  lessonId: string,
  completed: ReadonlySet<string>,
  currentLessonId: string | null,
): PathNodeStatus {
  if (completed.has(lessonId)) return 'completed';
  if (lessonId === currentLessonId) return 'current';
  return 'locked';
}

function lessonSubtitle(status: PathNodeStatus): string {
  if (status === 'completed') return 'Completed';
  if (status === 'current') return 'Up next';
  return 'Unlocks when you reach it';
}

function buildUnitNodes(
  unit: Unit,
  completed: ReadonlySet<string>,
  currentLessonId: string | null,
): PathNode[] {
  const nodes: PathNode[] = [];
  const lessonIds = unit.lessons.map((l) => l.id);
  const completedInUnit = lessonIds.filter((id) => completed.has(id)).length;
  const allLessonsDone = lessonIds.length > 0 && completedInUnit === lessonIds.length;

  unit.lessons.forEach((lesson, index) => {
    const status = lessonStatus(lesson.id, completed, currentLessonId);
    nodes.push({
      key: `lesson:${lesson.id}`,
      type: 'lesson',
      status,
      unitId: unit.id,
      unitTitle: unit.title,
      title: lesson.title,
      subtitle: lessonSubtitle(status),
      lessonId: lesson.id,
      lessonNumber: index + 1,
    });

    // Chest BETWEEN lessons — never after the unit's final lesson. It is available once the lesson
    // that precedes it is completed.
    const isLastLessonInUnit = index === unit.lessons.length - 1;
    if (!isLastLessonInUnit && (index + 1) % CHEST_CADENCE === 0) {
      const chestUnlocked = completed.has(lesson.id);
      nodes.push({
        key: `chest:${unit.id}:${lesson.id}`,
        type: 'chest',
        status: chestUnlocked ? 'completed' : 'locked',
        unitId: unit.id,
        unitTitle: unit.title,
        title: 'Reward chest',
        subtitle: chestUnlocked ? 'Tap to peek at your reward' : 'Finish the lesson before it',
      });
    }
  });

  // Legendary — the end-of-unit hard node. Unlocked once every lesson in the unit is complete.
  nodes.push({
    key: `legendary:${unit.id}`,
    type: 'legendary',
    status: allLessonsDone ? 'completed' : 'locked',
    unitId: unit.id,
    unitTitle: unit.title,
    title: 'Legendary challenge',
    subtitle: allLessonsDone ? 'A tougher pass over the whole unit' : 'Finish every lesson to unlock',
    targetUnitId: unit.id,
  });

  // Review — re-serve the unit's questions (energy-free). Available once at least one lesson is done.
  const reviewUnlocked = completedInUnit >= 1;
  nodes.push({
    key: `review:${unit.id}`,
    type: 'review',
    status: reviewUnlocked ? 'completed' : 'locked',
    unitId: unit.id,
    unitTitle: unit.title,
    title: 'Review this unit',
    subtitle: reviewUnlocked ? 'Practice the whole unit — no energy needed' : 'Finish a lesson to unlock review',
    targetUnitId: unit.id,
  });

  return nodes;
}

/**
 * Build the full, ordered path-model for a course: for each unit, its lessons (with chests between
 * them), then the legendary node, then the review node.
 */
export function buildPathModel(input: PathModelInput): PathNode[] {
  const completed = new Set(input.completedLessonIds);
  return input.course.units.flatMap((unit) => buildUnitNodes(unit, completed, input.currentLessonId));
}
