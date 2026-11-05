// src/features/lesson-player/renderers/presentation-order.ts
//
// Deterministic, seeded presentation order for the order and match renderers (CS-4). Authored order
// questions key the steps in their written order, and the match key pairs each prompt with the answer
// written next to it, so showing items in the authored order (or its exact reverse, the old trick)
// hands the learner the answer pattern. Instead each question gets its own shuffle, seeded by its ID:
//
//   • deterministic — the same question always renders the same layout, so a resumed lesson looks the
//     same after a cold kill and tests can pin it down;
//   • never the key order and never its exact reverse — both are rejected, so "tap top to bottom" or
//     "tap bottom to top" can never be the answer;
//   • presentation only — the renderers still grade the learner's placed sequence against the
//     question's answer key, so grading is untouched.
//
// The schema guarantees at least 3 items (order steps 3-7, match pairs 3-6). With n >= 3 there is always
// an allowed layout, and the final fallback (the key rotated by one place) is allowed for every n >= 3.

/** FNV-1a 32-bit hash (the same family content/src/index.ts uses to rank answer options). */
function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32: a tiny seeded PRNG returning floats in [0, 1). */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sameSequence(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Up to this many seeded shuffles are tried before the rotation fallback (a miss is ~2/n! each). */
const MAX_SHUFFLES = 12;

/**
 * A permutation of the indices in `key`, seeded by `seed` (the question ID), that is neither `key`
 * itself nor `key` reversed. `key` is the answer order the layout must not give away: an order
 * question's answerKey, or the identity for the right-hand column of a match question.
 */
export function seededPresentationOrder(seed: string, key: readonly number[]): number[] {
  const reversed = [...key].reverse();
  const allowed = (order: readonly number[]): boolean =>
    !sameSequence(order, key) && !sameSequence(order, reversed);

  const random = seededRandom(hashSeed(seed));
  for (let attempt = 0; attempt < MAX_SHUFFLES; attempt += 1) {
    const order = [...key];
    // Fisher-Yates shuffle driven by the seeded generator.
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (allowed(order)) return order;
  }
  // Rotating the key by one place is never the key and, for n >= 3, never its reverse either.
  return [...key.slice(1), ...key.slice(0, 1)];
}

/** Step indices of an order question in the order its chips are shown. */
export function orderStepPresentation(question: { id: string; answerKey: readonly number[] }): number[] {
  return seededPresentationOrder(question.id, question.answerKey);
}

/** Pair indices of a match question's right-hand column, top to bottom. */
export function matchAnswerPresentation(question: { id: string; pairs: readonly unknown[] }): number[] {
  const identity = question.pairs.map((_, index) => index);
  return seededPresentationOrder(`${question.id}:match-right`, identity);
}
