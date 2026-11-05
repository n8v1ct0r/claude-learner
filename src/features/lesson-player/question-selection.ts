// A lesson owns a broad question bank for review and exam generation, but serving every near-variant
// in one sitting makes the learning loop repetitive. This selector builds a short, stable decision
// set: establish the concept once, then apply it through scenario, diagnosis, multi-response, and an
// interactive format where the authored bank supports those slots.

import type { Question } from '../../../content/schema/types';

export const LESSON_DECISION_SET_SIZE = 5;

function addFirst(
  selected: Question[],
  questions: readonly Question[],
  predicate: (question: Question) => boolean,
): void {
  const match = questions.find((question) => !selected.some((item) => item.id === question.id) && predicate(question));
  if (match) selected.push(match);
}

function applicationScore(question: Question): number {
  let score = question.difficulty * 3;
  if (question.variant === 'scenario') score += 8;
  if (question.variant === 'spot-bug') score += 7;
  if (question.scenarioId) score += 5;
  if (question.type === 'multi') score += 4;
  if (question.type === 'match' || question.type === 'order' || question.type === 'cloze') score += 3;
  if (question.misconceptionTag) score += 1;
  if (question.variant === 'tf-speed') score -= 8;
  return score;
}

function rankedForApplication(questions: readonly Question[]): Question[] {
  return [...questions].sort((a, b) => applicationScore(b) - applicationScore(a) || a.id.localeCompare(b.id));
}

/** Stable across launches so persisted question IDs always resolve to the same lesson decision set. */
export function selectLessonDecisionSet(
  questions: readonly Question[],
  limit = LESSON_DECISION_SET_SIZE,
): Question[] {
  if (questions.length <= limit) return [...questions];

  const selected: Question[] = [];
  const ranked = rankedForApplication(questions);

  // Start with the earliest authored, non-variant concept check. It is the bridge from the concept
  // card into application and avoids opening a lesson at maximum difficulty without calibration.
  addFirst(selected, questions, (question) => question.variant === undefined && question.difficulty <= 2);
  addFirst(selected, ranked, (question) => question.variant === 'scenario');
  addFirst(selected, ranked, (question) => question.variant === 'spot-bug');
  addFirst(selected, ranked, (question) => question.type === 'multi');
  addFirst(
    selected,
    ranked,
    (question) => question.type === 'match' || question.type === 'order' || question.type === 'cloze',
  );

  for (const question of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.id === question.id)) selected.push(question);
  }

  return selected.slice(0, limit);
}
