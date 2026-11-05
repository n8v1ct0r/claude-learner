// content/scripts/calibrate-dupes.ts — content:calibrate
//
// Prints the full pairwise normalized-stem trigram-similarity distribution across the whole question
// bank so a human/agent can pick the dupe-detection threshold T that SEPARATES intentional variantOf
// siblings (should sit high) from genuinely distinct questions (should sit low). It uses the exact
// same similarity function content:validate enforces (./lib/dupes), so the number you read here is the
// number the gate applies. Purely informational — never wired into evals/run.sh.
//
// Read the output like this: the ideal T is a gap in the histogram ABOVE the highest distinct-pair
// score and BELOW the lowest intentional-sibling score. Sibling pairs are marked [variantOf].

import { loadCatalog } from './lib/load-catalog';
import { pairwiseSimilarities } from './lib/dupes';
import blueprint from '../blueprint.json';

const TOP_N = 30;
const BUCKETS = 10; // 0.0-0.1, 0.1-0.2, … 0.9-1.0

async function main(): Promise<void> {
  console.log('content:calibrate — normalized-stem trigram similarity distribution');
  const { catalog } = await loadCatalog();
  const questions = catalog.questions;

  if (questions.length < 2) {
    console.log(`  only ${questions.length} question(s) in the catalog — nothing to calibrate yet.`);
    console.log('  Author the pilot siblings first, then re-run to pick a threshold.');
    process.exit(2);
  }

  const pairs = pairwiseSimilarities(questions);
  const totalPairs = pairs.length;
  console.log(`  ${questions.length} questions → ${totalPairs} pairs. Current blueprint T=${blueprint.dupe_detection.threshold}.`);

  // Histogram over the whole distribution.
  const histogram = new Array<number>(BUCKETS).fill(0);
  for (const p of pairs) {
    const idx = Math.min(BUCKETS - 1, Math.floor(p.similarity * BUCKETS));
    histogram[idx] += 1;
  }
  console.log('\n  distribution (all pairs):');
  for (let b = 0; b < BUCKETS; b += 1) {
    const lo = (b / BUCKETS).toFixed(1);
    const hi = ((b + 1) / BUCKETS).toFixed(1);
    const count = histogram[b];
    const bar = '#'.repeat(Math.min(50, count));
    console.log(`    ${lo}-${hi}  ${String(count).padStart(6)}  ${bar}`);
  }

  // The separation the threshold must respect: siblings should be the high end.
  const siblingPairs = pairs.filter((p) => p.variantLinked);
  const distinctPairs = pairs.filter((p) => !p.variantLinked);
  const maxDistinct = distinctPairs.length ? distinctPairs[0].similarity : 0;
  const minSibling = siblingPairs.length ? siblingPairs[siblingPairs.length - 1].similarity : NaN;

  console.log(`\n  top ${Math.min(TOP_N, totalPairs)} most-similar pairs:`);
  for (const p of pairs.slice(0, TOP_N)) {
    const tag = p.variantLinked ? ' [variantOf sibling]' : '';
    console.log(`    ${p.similarity.toFixed(3)}  ${p.a.id}  ~  ${p.b.id}${tag}`);
  }

  console.log('\n  separation summary:');
  console.log(`    highest DISTINCT-pair similarity   : ${maxDistinct.toFixed(3)}`);
  if (siblingPairs.length) {
    console.log(`    lowest  SIBLING-pair similarity    : ${minSibling.toFixed(3)}  (${siblingPairs.length} sibling pair(s))`);
    if (minSibling > maxDistinct) {
      const suggested = (maxDistinct + minSibling) / 2;
      console.log(`    → clean gap: any T in (${maxDistinct.toFixed(3)}, ${minSibling.toFixed(3)}) separates them; midpoint T≈${suggested.toFixed(3)}`);
    } else {
      console.log('    → NO clean gap: some distinct pairs score as high as siblings. Rewrite the');
      console.log('      overlapping distinct stems or add variantOf, then re-run.');
    }
  } else {
    console.log('    no variantOf sibling pairs authored — add intentional siblings to calibrate against.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('content:calibrate crashed:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
