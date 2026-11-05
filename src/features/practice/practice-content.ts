// src/features/practice/practice-content.ts
//
// Pure content helpers for the Practice Hub — NO react-native / expo imports, so they are trivially
// unit-testable and shared by the hub UI + the review player. They turn the hydrated content tree
// into the three things the hub needs:
//   • byId          — every lesson question indexed by id, so an SRS card (which stores only ids) can
//                     be resolved back to a full Question for the renderer. Exam-register questions
//                     are not lesson exercises; indexDeckQuestions adds the ones the deck points at.
//   • scenarioPool  — realistic architecture decisions drawn from the six production scenario
//                     families, always available even for a fresh deck.
//   • conceptLabels — conceptId → human label (the lesson title), for the per-concept review decks.
//                     Each lesson maps 1:1 to a concept (zod enforces explainBack/concept conceptId
//                     equality), so the lesson title is the concept's name.
//
// Ordering is deterministic (content spine order + insertion order) so the hub renders identically
// across runs — no Math.random, no clock.

import type { SrsCard } from '@/engine/srs';

import type { Course, Question } from '../../../content/schema/types';

/** A launchable practice session handed from the hub to the review player. */
export interface PracticeSession {
  kind: 'review' | 'scenario' | 'welcome-back' | 'concept';
  /** Warm, no-shame title shown in the player header. */
  title: string;
  /** The already-capped questions to present (never a "due count"). */
  questions: Question[];
  /** The presentation budget that produced `questions` (a display cap, not a backlog count). */
  cap: number;
}

/** The collected, indexed content the hub reads. */
export interface PracticeContent {
  byId: Map<string, Question>;
  scenarioPool: Question[];
  conceptLabels: Map<string, string>;
  /** ConceptIds in content-spine order (course → unit → lesson) for stable deck ordering. */
  conceptOrder: string[];
}

/** An exam-relevant production decision rather than a recall-only speed check. */
function isScenarioDecision(question: Question): boolean {
  return Boolean(question.scenarioId) || question.variant === 'scenario' || question.variant === 'spot-bug';
}

/** Walk the hydrated course tree once, building the id index, scenario pool, and concept labels. */
export function collectPracticeContent(courses: readonly Course[]): PracticeContent {
  const byId = new Map<string, Question>();
  const conceptLabels = new Map<string, string>();
  const conceptOrder: string[] = [];
  const scenarioPool: Question[] = [];

  for (const course of courses) {
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        const conceptId = lesson.concept.conceptId;
        if (!conceptLabels.has(conceptId)) {
          conceptLabels.set(conceptId, lesson.title);
          conceptOrder.push(conceptId);
        }
        for (const question of lesson.exercises) {
          if (!byId.has(question.id)) {
            byId.set(question.id, question);
            if (isScenarioDecision(question)) scenarioPool.push(question);
          }
        }
      }
    }
  }

  return { byId, scenarioPool, conceptLabels, conceptOrder };
}

/**
 * A deterministic daily scenario drill. Rotation prevents the same opening questions every day;
 * scenario-family de-duplication keeps a short session broad before any family repeats.
 */
export function selectScenarioQuestions(
  pool: readonly Question[],
  limit: number,
  rotationSeed: number,
): Question[] {
  const capped = Math.max(0, Math.min(limit, pool.length));
  if (capped === 0) return [];

  const start = Math.abs(Math.trunc(rotationSeed)) % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const selected: Question[] = [];
  const seenScenarios = new Set<string>();

  for (const question of rotated) {
    if (selected.length >= capped) break;
    const scenario = question.scenarioId;
    if (scenario && seenScenarios.has(scenario)) continue;
    selected.push(question);
    if (scenario) seenScenarios.add(scenario);
  }

  if (selected.length < capped) {
    const selectedIds = new Set(selected.map((question) => question.id));
    for (const question of rotated) {
      if (selected.length >= capped) break;
      if (!selectedIds.has(question.id)) selected.push(question);
    }
  }

  return selected;
}

/**
 * Index every question the SRS deck points at (FT-1). Lesson exercises come from the course tree
 * (`byId`); any other id — the standalone exam-register questions that mocks and minis capture as
 * misses — resolves through `lookup` (the content reader's getQuestion). An id that resolves nowhere
 * (a feynman item, a retired question) stays out of the index, so `index.has(card.id)` means
 * "Practice can open this card".
 */
export function indexDeckQuestions(
  byId: ReadonlyMap<string, Question>,
  cardIds: Iterable<string>,
  lookup: (id: string) => Question | undefined,
): Map<string, Question> {
  const index = new Map(byId);
  for (const id of cardIds) {
    if (index.has(id)) continue;
    const question = lookup(id);
    if (question) index.set(id, question);
  }
  return index;
}

/** Resolve engine cards to full Questions in order, dropping any that don't resolve (e.g. feynman). */
export function resolveSessionQuestions(
  cards: readonly SrsCard[],
  byId: ReadonlyMap<string, Question>,
): Question[] {
  const out: Question[] = [];
  for (const card of cards) {
    const question = byId.get(card.id);
    if (question) out.push(question);
  }
  return out;
}

/** Total order for a concept deck: least-confident first, then most-overdue, then id (deterministic). */
function byLeastConfident(a: SrsCard, b: SrsCard): number {
  return a.stability - b.stability || a.due - b.due || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * The unique conceptIds the learner has cards for, in content-spine order (weakest-topics surface).
 * Given the deck's question index, a concept counts only when at least one of its cards can be opened,
 * so a topic row never launches an empty deck.
 */
export function conceptsWithCards(
  cards: readonly SrsCard[],
  conceptOrder: readonly string[],
  questions?: ReadonlyMap<string, Question>,
): string[] {
  const present = new Set(
    cards.filter((c) => questions === undefined || questions.has(c.id)).map((c) => c.conceptId),
  );
  return conceptOrder.filter((id) => present.has(id));
}

/**
 * A per-concept drill deck: this concept's cards, least-confident first, capped and resolved to
 * Questions. Unlike the main review it does NOT require cards to be due — a concept deck is an
 * always-available, energy-free "practice this topic" surface.
 */
export function selectConceptDeck(
  cards: readonly SrsCard[],
  conceptId: string,
  byId: ReadonlyMap<string, Question>,
  cap: number,
): Question[] {
  const deck = cards.filter((c) => c.conceptId === conceptId).sort(byLeastConfident);
  const out: Question[] = [];
  for (const card of deck) {
    if (out.length >= cap) break;
    const question = byId.get(card.id);
    if (question) out.push(question);
  }
  return out;
}
