// __tests__/practice/practice-content.test.ts
//
// The pure Practice-Hub content helpers (src/features/practice/practice-content.ts) — no RN, no clock.
// Driven against the REAL pilot lesson so the indexing/labelling matches production content exactly.

import { describe, expect, it } from '@jest/globals';

import type { SrsCard } from '@/engine/srs';
import {
  collectPracticeContent,
  conceptsWithCards,
  resolveSessionQuestions,
  selectConceptDeck,
  selectScenarioQuestions,
} from '@/features/practice/practice-content';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';
import type { Course } from '../../content/schema/types';

const course: Course = {
  id: 'c1',
  domain: 'd1',
  title: 'Agentic Architecture',
  description: 'Course under test',
  order: 0,
  units: [{ id: 'c1-u1', title: 'Unit 1', order: 0, lessons: [l1WorkflowsVsAgents] }],
};

const conceptId = l1WorkflowsVsAgents.concept.conceptId;

function makeCard(id: string, conceptId: string, stability: number): SrsCard {
  return {
    id,
    conceptId,
    itemType: 'question',
    stability,
    difficulty: 5,
    due: 0,
    reps: 1,
    lapses: 0,
    lastReview: 0,
    state: 'review',
  };
}

describe('collectPracticeContent', () => {
  const content = collectPracticeContent([course]);

  it('indexes every lesson question by id', () => {
    for (const q of l1WorkflowsVsAgents.exercises) {
      expect(content.byId.get(q.id)).toBe(q);
    }
  });

  it('labels the concept with the lesson title and records spine order', () => {
    expect(content.conceptLabels.get(conceptId)).toBe(l1WorkflowsVsAgents.title);
    expect(content.conceptOrder).toEqual([conceptId]);
  });

  it('collects only production scenario decisions into the scenario pool', () => {
    expect(content.scenarioPool.length).toBeGreaterThan(0);
    for (const q of content.scenarioPool) {
      expect(Boolean(q.scenarioId) || q.variant === 'scenario' || q.variant === 'spot-bug').toBe(true);
    }
  });
});

describe('resolveSessionQuestions', () => {
  const content = collectPracticeContent([course]);

  it('resolves known card ids to Questions and drops unknown ids', () => {
    const known = l1WorkflowsVsAgents.exercises[0].id;
    const cards = [makeCard(known, conceptId, 1), makeCard('ghost-id', conceptId, 1)];
    const resolved = resolveSessionQuestions(cards, content.byId);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe(known);
  });
});

describe('selectConceptDeck', () => {
  const content = collectPracticeContent([course]);

  it('orders least-confident (lowest stability) first and honors the cap', () => {
    const [a, b] = l1WorkflowsVsAgents.exercises;
    const cards = [makeCard(b.id, conceptId, 9), makeCard(a.id, conceptId, 1)];
    const deck = selectConceptDeck(cards, conceptId, content.byId, 5);
    expect(deck.map((q) => q.id)).toEqual([a.id, b.id]); // lower stability (a) first
    expect(selectConceptDeck(cards, conceptId, content.byId, 1)).toHaveLength(1);
  });

  it('ignores cards from other concepts', () => {
    const known = l1WorkflowsVsAgents.exercises[0].id;
    const cards = [makeCard(known, conceptId, 1), makeCard('other', 'concept-z', 1)];
    expect(selectConceptDeck(cards, 'concept-z', content.byId, 5)).toHaveLength(0);
  });
});

describe('conceptsWithCards', () => {
  it('returns unique concepts the learner has cards for, in spine order', () => {
    const content = collectPracticeContent([course]);
    const cards = [makeCard('q1', conceptId, 1), makeCard('q2', conceptId, 1)];
    expect(conceptsWithCards(cards, content.conceptOrder)).toEqual([conceptId]);
    expect(conceptsWithCards([], content.conceptOrder)).toEqual([]);
  });
});

describe('selectScenarioQuestions', () => {
  it('rotates deterministically, honors the cap, and avoids duplicate questions', () => {
    const content = collectPracticeContent([course]);
    const two = selectScenarioQuestions(content.scenarioPool, 2, 7);
    expect(two.length).toBeLessThanOrEqual(2);
    expect(new Set(two.map((question) => question.id)).size).toBe(two.length);
    expect(selectScenarioQuestions(content.scenarioPool, 2, 7)).toEqual(two);
    expect(selectScenarioQuestions(content.scenarioPool, 0, 7)).toEqual([]);
  });
});
