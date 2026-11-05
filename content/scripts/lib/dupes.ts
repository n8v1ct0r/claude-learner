// content/scripts/lib/dupes.ts
//
// Normalized-stem trigram similarity — the ONE implementation shared by content:validate (GC-01
// duplicate gate, check (h)) and content:calibrate (the distribution printer that a human/agent uses
// to pick the threshold). Keeping both scripts on this module guarantees the number the calibrator
// prints is the number the validator enforces.
//
// Method (blueprint.dupe_detection.method = "normalized-stem trigram similarity"):
//   normalize  → lowercase, strip punctuation, drop stopwords, collapse whitespace
//   trigrams   → the set of character 3-grams of the normalized string
//   similarity → Jaccard( trigrams(a), trigrams(b) )  in [0, 1]
//
// Two questions above the threshold are a duplicate UNLESS they are declared siblings via `variantOf`
// (the reviewed escape hatch). Exams reuse questions BY ID (they carry no stems), so exam reuse is
// never a duplicate — only authored question stems are compared here.

import type { Question } from '../../schema/types';

// A compact, deliberately small English stopword set. The goal is to remove connective words that
// inflate similarity between two genuinely different scenario stems, without erasing the technical
// nouns/verbs that actually distinguish exam questions (agent, tool, workflow, cache, ...).
const STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'of', 'to', 'in', 'into', 'on', 'onto',
  'for', 'with', 'without', 'as', 'by', 'at', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'which', 'that', 'this', 'these', 'those', 'it', 'its', 'you', 'your', 'they', 'them', 'their',
  'he', 'she', 'his', 'her', 'we', 'our', 'us', 'i', 'me', 'my', 'do', 'does', 'did', 'has', 'have',
  'had', 'will', 'would', 'should', 'can', 'could', 'may', 'might', 'must', 'so', 'than', 'when',
  'while', 'what', 'why', 'how', 'who', 'whom', 'where', 'not', 'no', 'yes', 'up', 'down', 'out',
]);

const TRIGRAM_SIZE = 3;

/** lowercase → strip punctuation → drop stopwords → collapse whitespace. Pure and deterministic. */
export function normalizeStem(stem: string): string {
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ') // punctuation and symbols become word breaks
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.has(word))
    .join(' ')
    .trim();
}

/** The set of character trigrams of a (normalized) string. Whitespace is preserved as a signal. */
export function trigrams(normalized: string): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i + TRIGRAM_SIZE <= normalized.length; i += 1) {
    grams.add(normalized.slice(i, i + TRIGRAM_SIZE));
  }
  return grams;
}

/** Jaccard overlap of two trigram sets. Two empty sets (ultra-short stems) score 0, never 1. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) if (b.has(gram)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** trigrams(normalizeStem(stem)) — the fingerprint compared across the whole question bank. */
export function stemFingerprint(stem: string): Set<string> {
  return trigrams(normalizeStem(stem));
}

/**
 * Are two questions declared siblings (an intentional near-duplicate pair)? True when one names the
 * other in `variantOf`, or both point at the same `variantOf` root. This is the human-reviewed escape
 * hatch that keeps a legitimate "same idea, harder framing" pair from tripping the dupe gate.
 */
export function areVariantSiblings(a: Question, b: Question): boolean {
  if (a.id === b.id) return true;
  if (a.variantOf === b.id) return true;
  if (b.variantOf === a.id) return true;
  if (a.variantOf !== undefined && a.variantOf === b.variantOf) return true;
  return false;
}

export interface SimilarityPair {
  a: Question;
  b: Question;
  similarity: number;
  variantLinked: boolean;
}

/**
 * Every question pair with its similarity, most-similar first. O(n^2) over the bank (fine for the
 * low-thousands the contract targets); fingerprints are computed once per question. Used by both the
 * validator (filter to >= threshold) and the calibrator (print the whole distribution).
 */
export function pairwiseSimilarities(questions: readonly Question[]): SimilarityPair[] {
  const fingerprints = questions.map((q) => stemFingerprint(q.stem));
  const pairs: SimilarityPair[] = [];
  for (let i = 0; i < questions.length; i += 1) {
    for (let j = i + 1; j < questions.length; j += 1) {
      pairs.push({
        a: questions[i],
        b: questions[j],
        similarity: jaccard(fingerprints[i], fingerprints[j]),
        variantLinked: areVariantSiblings(questions[i], questions[j]),
      });
    }
  }
  pairs.sort((x, y) => y.similarity - x.similarity);
  return pairs;
}
