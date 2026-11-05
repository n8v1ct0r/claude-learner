// content/scripts/validate.ts — content:validate (GC-01 + GC-13 + GC-15d)
//
// Loads the full catalog via the registry (content/src/index.ts), then runs, in order, the content
// checks (a→j) defined in ./lib/validators.ts, printing a per-check count and, on failure,
// actionable per-entity messages. Exit codes:
//   0 — content present and every check passes
//   1 — content present and at least one check failed (or a module threw at import)
//   2 — the catalog is empty (no pilot content yet): honest "0 courses", fail-closed
//
// Flags:
//   --check-liveness    additionally probe every sourceUrl over the network (offline => warn, never
//                       fail); off by default (the plan rejects recurring liveness CI).
//   --update-registry   append newly-seen ids to content/id-registry.json (the only writer of it).

import {
  checkZod,
  checkAnswerKeys,
  checkAnswerPositionBalance,
  checkCitations,
  checkBannedCopy,
  checkLessonBudget,
  checkKeyPointRoundTrip,
  checkIdRegistry,
  checkDuplicates,
  checkTimedContent,
  checkLengthCue,
  lengthCueStats,
  currentEntityEntries,
  constants,
  type Violation,
} from './lib/validators';
import { loadCatalog, readRegistry, writeRegistry, paths } from './lib/load-catalog';
import { checkLiveness } from './lib/liveness';

const args = process.argv.slice(2);
const CHECK_LIVENESS = args.includes('--check-liveness');
const UPDATE_REGISTRY = args.includes('--update-registry');

function printViolations(violations: readonly Violation[], limit = 25): void {
  for (const bad of violations.slice(0, limit)) {
    const where = bad.path ? ` [${bad.path}]` : '';
    console.error(`      - ${bad.entityKind} "${bad.entityId}"${where}: ${bad.message}`);
  }
  if (violations.length > limit) {
    console.error(`      … and ${violations.length - limit} more`);
  }
}

function report(label: string, subjectCount: number, unit: string, violations: readonly Violation[]): boolean {
  const ok = violations.length === 0;
  if (ok) {
    console.log(`  PASS  ${label} — ${subjectCount} ${unit} checked`);
  } else {
    console.error(`  FAIL  ${label} — ${violations.length} violation(s) across ${subjectCount} ${unit}`);
    printViolations(violations);
  }
  return ok;
}

async function main(): Promise<void> {
  console.log('content:validate — GC-01 / GC-13 / GC-15d');

  const { catalog, loadErrors, moduleCount } = await loadCatalog();

  // Modules that threw at import (invalid zod / D3 conflict) are hard failures.
  if (loadErrors.length > 0) {
    console.error(`  FAIL  load — ${loadErrors.length} content module(s) threw at import:`);
    for (const e of loadErrors) console.error(`      - ${e.file}: ${e.error}`);
  }

  // Fail-closed honesty: no content authored yet. This is the expected pre-pilot state.
  if (catalog.courses.length === 0 && loadErrors.length === 0) {
    console.log(`  0 courses in catalog (scanned ${moduleCount} module(s)).`);
    console.log('  Pilot content has not landed yet — exiting 2 (fail-closed) until it does.');
    process.exit(2);
  }

  const { courses, units, lessons, questions, exams } = catalog;
  console.log(
    `  catalog: ${courses.length} courses, ${units.length} units, ${lessons.length} lessons, ` +
      `${questions.length} questions, ${exams.length} exams`,
  );

  let allGreen = loadErrors.length === 0;

  // (a) zod
  allGreen = report('(a) zod', courses.length + units.length + lessons.length + questions.length + exams.length, 'entities', checkZod(catalog)) && allGreen;

  // (b) answer-key structural
  allGreen = report('(b) answer-key', questions.length, 'questions', checkAnswerKeys(questions)) && allGreen;

  // (b2) correct-button position balance — prevents answer-order pattern learning.
  allGreen = report('(b2) answer-position', questions.length, 'questions', checkAnswerPositionBalance(catalog)) && allGreen;

  // (c) citation structure (host allowlist + https)
  allGreen = report('(c) citations', questions.length, 'questions', checkCitations(questions)) && allGreen;

  // (d) banned-copy
  allGreen = report('(d) banned-copy', courses.length + units.length + lessons.length + questions.length + exams.length, 'entities', checkBannedCopy(catalog)) && allGreen;

  // (e) lesson time budget (GC-02 ADHD ≤5-min gate)
  allGreen = report(`(e) lesson-budget (<=${constants.LESSON_TIME_BUDGET_SECONDS}s)`, lessons.length, 'lessons', checkLessonBudget(lessons)) && allGreen;

  // (f) key-point round-trip (GC-15d)
  allGreen = report('(f) key-points (GC-15d)', lessons.length, 'lessons', checkKeyPointRoundTrip(lessons)) && allGreen;

  // (g) ID registry (append-only ledger, D3)
  const currentEntries = currentEntityEntries(catalog);
  const registry = readRegistry();
  const idResult = checkIdRegistry(currentEntries, registry, { update: UPDATE_REGISTRY });
  const idGreen = report('(g) id-registry (D3)', currentEntries.length, 'ids', idResult.violations);
  allGreen = idGreen && allGreen;
  if (UPDATE_REGISTRY && idResult.appended.length > 0 && idResult.violations.length === 0) {
    writeRegistry(idResult.nextEntries);
    console.log(`        recorded ${idResult.appended.length} new id(s) in ${paths.REGISTRY_FILE}`);
  } else if (UPDATE_REGISTRY && idResult.violations.length > 0) {
    console.error(`        NOT writing ${paths.REGISTRY_FILE}: resolve the D3 violation(s) above first`);
  }

  // (h) duplicate detection (normalized-stem trigram Jaccard)
  const dupeResult = checkDuplicates(questions, constants.DUPE_THRESHOLD);
  const dupeGreen = report(`(h) dupes (T=${constants.DUPE_THRESHOLD})`, questions.length, 'questions', dupeResult.violations);
  allGreen = dupeGreen && allGreen;
  if (dupeResult.legalVariants.length > 0) {
    console.log(`        ${dupeResult.legalVariants.length} legal variantOf sibling pair(s) above T (not a failure):`);
    for (const pair of dupeResult.legalVariants) {
      console.log(`          ${pair.a} ~ ${pair.b}  (${pair.similarity.toFixed(3)})`);
    }
  }

  // (i) timed-content (WCAG 2.2.1 / GC-10): no concept reachable ONLY through a tf-speed round
  allGreen = report('(i) timed-content (GC-10)', questions.length, 'questions', checkTimedContent(questions)) && allGreen;

  // (j) answer-length cue (CS-1): "always pick the longest option" must not pass an exam form.
  allGreen = report(
    `(j) length-cue (pick-longest <=${Math.round(constants.LENGTH_CUE_MAX_STRATEGY * 100)}% per exam)`,
    exams.length,
    'exams',
    checkLengthCue(catalog),
  ) && allGreen;
  // The lesson bank is not gated yet; print its cue so the remaining gap stays visible.
  const lessonCue = lengthCueStats(lessons.flatMap((lesson) => lesson.exercises));
  console.log(
    `        lesson bank (not gated): key strictly longest on ${lessonCue.keyStrictlyLongest}/${lessonCue.standardMc} ` +
      `standard MC; pick-longest scores ${(lessonCue.strategyScore * 100).toFixed(1)}%`,
  );

  // (c') liveness — opt-in only, network-tolerant
  if (CHECK_LIVENESS) {
    const live = await checkLiveness(questions);
    if (live.dead.length > 0) {
      console.error(`  FAIL  (c) liveness — ${live.dead.length}/${live.checked} sourceUrl(s) returned HTTP >= 400:`);
      for (const d of live.dead) console.error(`      - question "${d.questionId}": ${d.url} → ${d.status}`);
      allGreen = false;
    } else {
      console.log(`  PASS  (c) liveness — ${live.checked - live.warnings.length}/${live.checked} sourceUrl(s) reachable`);
    }
    if (live.warnings.length > 0) {
      console.log(`        ${live.warnings.length} url(s) unreachable (offline-tolerant warning, not a failure):`);
      for (const w of live.warnings.slice(0, 10)) console.log(`          ${w.url} — ${w.reason}`);
    }
  }

  if (allGreen) {
    console.log('content:validate — all checks PASS');
    process.exit(0);
  }
  console.error('content:validate — FAILED (see violations above)');
  process.exit(1);
}

main().catch((err) => {
  console.error('content:validate crashed:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
