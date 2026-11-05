// content/scripts/stats.ts — content:stats [--check] (GC-02)
//
// Prints the content inventory (courses, units, lessons, questions by domain/type/difficulty, exam
// forms, per-form domain distribution, disjointness, difficulty floor, per-lesson time budgets,
// concept key-point counts). With --check it asserts the catalog against the volume gates in
// content/blueprint.json and exits nonzero listing every unmet gate.
//
// Two failure classes, reported SEPARATELY (this is the whole point of the gate design):
//   • VOLUME     — a count/distribution/composition below its target: too few courses/lessons/
//                  questions, per-domain off the weight map, or an exam form not yet fully assembled
//                  (undersized, mis-distributed, or below the difficulty floor). Expected RED during
//                  the pilot; content authoring (M5.x) is what turns these green. A red here is NOT a bug.
//   • STRUCTURAL — an integrity invariant that is broken regardless of how much content exists: a
//                  dangling exam reference, mock forms that overlap (not pairwise disjoint), a lesson
//                  over the 300s budget, or a concept with the wrong key-point count. These must always
//                  be zero, at any stage. A red here IS a bug.
//
// Non-check mode always exits 0 (informational). --check exits 1 if ANY finding exists, 0 otherwise.

import blueprint from '../blueprint.json';
import type { CatalogSnapshot } from '../schema/types';
import type { Difficulty, ExamDomain, Exam, Question } from '../schema/zod';

const EXAM_DOMAINS: readonly ExamDomain[] = ['d1', 'd2', 'd3', 'd4', 'd5'];
const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3];
const FRACTION_EPSILON = 1e-9;

const V = blueprint.volume;
const WEIGHTS = blueprint.weights;

type Category = 'volume' | 'structural';
interface Finding {
  category: Category;
  gate: string;
  message: string;
}

// --- derived views --------------------------------------------------------------------------------

function zeroByDomain(): Record<ExamDomain, number> {
  return { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0 };
}

/** Question IDs embedded in a lesson (the "bank"); everything else registered is exam-"register". */
function lessonQuestionIds(catalog: CatalogSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const lesson of catalog.lessons) for (const ex of lesson.exercises) ids.add(ex.id);
  return ids;
}

function countByDomain(questions: readonly Question[]): Record<ExamDomain, number> {
  const acc = zeroByDomain();
  for (const q of questions) acc[q.domain] += 1;
  return acc;
}

/** Expected per-domain count for a pool of `total` questions from the weight map (rounded). */
function expectedByWeight(total: number): Record<ExamDomain, number> {
  const acc = zeroByDomain();
  for (const d of EXAM_DOMAINS) acc[d] = Math.round((WEIGHTS[d] / 100) * total);
  return acc;
}

function questionIndex(catalog: CatalogSnapshot): Map<string, Question> {
  return new Map(catalog.questions.map((q) => [q.id, q] as const));
}

interface FormView {
  exam: Exam;
  size: number;
  resolved: Question[];
  dangling: string[];
  byDomain: Record<ExamDomain, number>;
  difficulty2PlusFraction: number;
}

function viewForm(exam: Exam, qById: Map<string, Question>): FormView {
  const resolved: Question[] = [];
  const dangling: string[] = [];
  for (const id of exam.questionIds) {
    const q = qById.get(id);
    if (q) resolved.push(q);
    else dangling.push(id);
  }
  const byDomain = countByDomain(resolved);
  const hard = resolved.filter((q) => q.difficulty >= 2).length;
  return {
    exam,
    size: exam.questionIds.length,
    resolved,
    dangling,
    byDomain,
    difficulty2PlusFraction: resolved.length === 0 ? 0 : hard / resolved.length,
  };
}

function fmtDomainMap(map: Record<ExamDomain, number>): string {
  return EXAM_DOMAINS.map((d) => `${d} ${map[d]}`).join(' · ');
}

// --- inventory print ------------------------------------------------------------------------------

function printInventory(catalog: CatalogSnapshot): void {
  const bankIds = lessonQuestionIds(catalog);
  const bank = catalog.questions.filter((q) => bankIds.has(q.id));
  const register = catalog.questions.filter((q) => !bankIds.has(q.id));
  const domainCourses = catalog.courses.filter((c) => c.domain !== 'd0');
  const introCourses = catalog.courses.filter((c) => c.domain === 'd0');

  const byType = catalog.questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});
  const byDifficulty = catalog.questions.reduce<Record<number, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  const budgets = catalog.lessons.map((l) => l.estimatedSecondsTotal);
  const overBudget = budgets.filter((s) => s > V.lesson_time_budget_seconds).length;
  const keyPointCounts = catalog.lessons.map((l) => l.concept.keyPoints.length);
  const [kpMin, kpMax] = blueprint.volume.concept_key_points_range;
  const kpOutOfRange = keyPointCounts.filter((n) => n < kpMin || n > kpMax).length;

  const qById = questionIndex(catalog);
  const mockForms = catalog.exams.filter((e) => e.kind === 'mock');
  const miniExams = catalog.exams.filter((e) => e.kind === 'mini');

  const lines: string[] = [];
  lines.push('CONTENT INVENTORY');
  lines.push(
    `  courses: ${catalog.courses.length} (domain ${domainCourses.length}, intro ${introCourses.length})`,
  );
  lines.push(`  units:   ${catalog.units.length}`);
  lines.push(`  lessons: ${catalog.lessons.length}`);
  lines.push(
    `  questions: ${catalog.questions.length} unique (bank ${bank.length}, register ${register.length})`,
  );
  lines.push(`    by domain:     ${fmtDomainMap(countByDomain(catalog.questions))}`);
  lines.push(
    `    by type:       ${['mc', 'multi', 'match', 'cloze', 'order'].map((t) => `${t} ${byType[t] ?? 0}`).join(' · ')}`,
  );
  lines.push(
    `    by difficulty: ${DIFFICULTIES.map((d) => `${d}:${byDifficulty[d] ?? 0}`).join(' · ')}`,
  );
  lines.push(`    bank by domain:     ${fmtDomainMap(countByDomain(bank))}`);
  lines.push(`    register by domain: ${fmtDomainMap(countByDomain(register))}`);
  lines.push(
    `  lesson time budget (<=${V.lesson_time_budget_seconds}s): ` +
      `max ${budgets.length ? Math.max(...budgets) : 0}s, over-budget ${overBudget}`,
  );
  lines.push(
    `  concept key points (${kpMin}-${kpMax}): ` +
      `min ${keyPointCounts.length ? Math.min(...keyPointCounts) : 0}, ` +
      `max ${keyPointCounts.length ? Math.max(...keyPointCounts) : 0}, out-of-range ${kpOutOfRange}`,
  );
  lines.push(
    `  exams: ${catalog.exams.length} (mock forms ${mockForms.length}/${V.mock_forms}, ` +
      `mini exams ${miniExams.length}/${V.mini_exams})`,
  );
  for (const exam of mockForms) {
    const view = viewForm(exam, qById);
    lines.push(
      `    mock ${exam.id}: ${view.size} Q · domains ${fmtDomainMap(view.byDomain)} · ` +
        `difficulty>=2 ${(view.difficulty2PlusFraction * 100).toFixed(0)}%` +
        (view.dangling.length ? ` · dangling ${view.dangling.length}` : ''),
    );
  }
  if (mockForms.length > 1) {
    lines.push(`    mock forms pairwise disjoint: ${mockFormsDisjoint(mockForms) ? 'yes' : 'NO'}`);
  }

  console.log(lines.join('\n'));
}

function mockFormsDisjoint(forms: readonly Exam[]): boolean {
  for (let i = 0; i < forms.length; i += 1) {
    const a = new Set(forms[i].questionIds);
    for (let j = i + 1; j < forms.length; j += 1) {
      for (const id of forms[j].questionIds) if (a.has(id)) return false;
    }
  }
  return true;
}

// --- volume gate (--check) ------------------------------------------------------------------------

function offDomains(
  actual: Record<ExamDomain, number>,
  expected: Record<ExamDomain, number>,
  tolerance: number,
): string[] {
  return EXAM_DOMAINS.filter((d) => Math.abs(actual[d] - expected[d]) > tolerance).map(
    (d) => `${d} ${actual[d]}/${expected[d]}`,
  );
}

function runCheck(catalog: CatalogSnapshot): Finding[] {
  const findings: Finding[] = [];
  const add = (category: Category, gate: string, message: string): void => {
    findings.push({ category, gate, message });
  };

  const bankIds = lessonQuestionIds(catalog);
  const bank = catalog.questions.filter((q) => bankIds.has(q.id));
  const register = catalog.questions.filter((q) => !bankIds.has(q.id));
  const domainCourses = catalog.courses.filter((c) => c.domain !== 'd0');
  const introCourses = catalog.courses.filter((c) => c.domain === 'd0');
  const qById = questionIndex(catalog);
  const mockForms = catalog.exams.filter((e) => e.kind === 'mock');
  const miniExams = catalog.exams.filter((e) => e.kind === 'mini');
  const tol = V.per_domain_tolerance_questions;

  // --- VOLUME gates (counts/distribution below target) --------------------------------------------

  if (domainCourses.length < V.min_courses) {
    add('volume', 'courses', `${domainCourses.length}/${V.min_courses} domain courses`);
  }
  if (introCourses.length < 1) {
    add('volume', 'courses', 'missing the intro "Meet the Exam" course (domain d0)');
  }
  if (catalog.lessons.length < V.min_lessons) {
    add('volume', 'lessons', `${catalog.lessons.length}/${V.min_lessons} lessons`);
  }
  if (catalog.questions.length < V.min_unique_questions) {
    add(
      'volume',
      'unique-questions',
      `${catalog.questions.length}/${V.min_unique_questions} unique questions`,
    );
  }

  // Bank total floor: lesson_bank_target is a FLOOR (like the >=600 total gate), not a ceiling —
  // over-producing well-proportioned questions is strictly better for study coverage.
  if (bank.length < V.lesson_bank_target) {
    add('volume', 'bank-total', `${bank.length}/${V.lesson_bank_target} lesson-bank questions (floor)`);
  }
  // Per-domain PROPORTIONS are checked against the ACTUAL bank pool size ("weight × pool-size",
  // GC-02), consistent with the >=600 total gate. This still catches a d2/d4 transposition at any
  // pool size; it does not penalise correctly-weighted over-production.
  const bankOff = offDomains(countByDomain(bank), expectedByWeight(bank.length), tol);
  if (bankOff.length) {
    add(
      'volume',
      'bank-per-domain',
      `bank proportions off weight (pool ${bank.length}, ±${tol}): ${bankOff.join(', ')}`,
    );
  }
  const registerOff = offDomains(countByDomain(register), V.register_per_domain, tol);
  if (registerOff.length) {
    add(
      'volume',
      'register-per-domain',
      `register off weight (target ${V.exam_register_total}, ±${tol}): ${registerOff.join(', ')}`,
    );
  }

  if (mockForms.length < V.mock_forms) {
    add('volume', 'mock-forms', `${mockForms.length}/${V.mock_forms} mock forms`);
  }
  if (miniExams.length < V.mini_exams) {
    add('volume', 'mini-exams', `${miniExams.length}/${V.mini_exams} mini exams`);
  }

  // Mock forms — composition (VOLUME): each form is fully assembled to size, distribution, and the
  // difficulty floor only once authoring completes. A half-built or smoke form is not a bug.
  const target = V.mock_form_domain_targets;
  const mockTol = V.mock_form_domain_tolerance;
  const floor = V.mock_difficulty_floor.min_fraction_difficulty_2_plus;
  for (const exam of mockForms) {
    const view = viewForm(exam, qById);
    if (view.size !== V.mock_form_size) {
      add('volume', 'mock-size', `mock "${exam.id}" has ${view.size} questions (target ${V.mock_form_size})`);
    }
    const distOff = offDomains(view.byDomain, target, mockTol);
    if (distOff.length) {
      add('volume', 'mock-distribution', `mock "${exam.id}" off ${fmtTargets(target)} (±${mockTol}): ${distOff.join(', ')}`);
    }
    if (view.resolved.length > 0 && view.difficulty2PlusFraction + FRACTION_EPSILON < floor) {
      add(
        'volume',
        'mock-difficulty-floor',
        `mock "${exam.id}" difficulty>=2 is ${(view.difficulty2PlusFraction * 100).toFixed(0)}% (target >=${(floor * 100).toFixed(0)}%)`,
      );
    }
  }

  // Mini exams — composition (VOLUME): size band is met once assembled.
  const [miniMin, miniMax] = V.mini_exam_size_range;
  for (const exam of miniExams) {
    const view = viewForm(exam, qById);
    if (view.size < miniMin || view.size > miniMax) {
      add('volume', 'mini-size', `mini "${exam.id}" has ${view.size} questions (target ${miniMin}-${miniMax})`);
    }
  }

  // --- STRUCTURAL gates (integrity invariants — broken at ANY stage is a real bug) ----------------

  // Lesson time budget + concept key-point count (schema also enforces; re-asserted here as GC-02 gates).
  const [kpMin, kpMax] = blueprint.volume.concept_key_points_range;
  for (const lesson of catalog.lessons) {
    if (lesson.estimatedSecondsTotal > V.lesson_time_budget_seconds) {
      add(
        'structural',
        'lesson-budget',
        `lesson "${lesson.id}" is ${lesson.estimatedSecondsTotal}s (>${V.lesson_time_budget_seconds}s)`,
      );
    }
    const kp = lesson.concept.keyPoints.length;
    if (kp < kpMin || kp > kpMax) {
      add('structural', 'key-points', `lesson "${lesson.id}" concept has ${kp} key points (need ${kpMin}-${kpMax})`);
    }
  }

  // Dangling references (mock + mini) and mock-form disjointness are integrity invariants.
  for (const exam of [...mockForms, ...miniExams]) {
    const view = viewForm(exam, qById);
    if (view.dangling.length) {
      add(
        'structural',
        `${exam.kind}-refs`,
        `${exam.kind} "${exam.id}" references ${view.dangling.length} unknown question id(s): ${view.dangling.join(', ')}`,
      );
    }
  }
  if (V.mock_forms_pairwise_disjoint && mockForms.length > 1 && !mockFormsDisjoint(mockForms)) {
    add('structural', 'mock-disjoint', 'mock forms are NOT pairwise disjoint (shared question ids)');
  }

  return findings;
}

function fmtTargets(map: Record<ExamDomain, number>): string {
  return EXAM_DOMAINS.map((d) => map[d]).join('/');
}

// --- reporting ------------------------------------------------------------------------------------

function reportCheck(findings: Finding[]): boolean {
  const structural = findings.filter((f) => f.category === 'structural');
  const volume = findings.filter((f) => f.category === 'volume');

  console.log('');
  console.log('VOLUME GATE (--check)');

  console.log('');
  console.log('  STRUCTURAL VIOLATIONS (must be zero at every stage — a red here is a real bug):');
  if (structural.length === 0) {
    console.log('    none');
  } else {
    for (const f of structural) console.log(`    ✗ [${f.gate}] ${f.message}`);
  }

  console.log('');
  console.log('  VOLUME GATES NOT YET MET (expected RED during the pilot — content authoring fills these):');
  if (volume.length === 0) {
    console.log('    none');
  } else {
    for (const f of volume) console.log(`    ✗ [${f.gate}] ${f.message}`);
  }

  console.log('');
  if (findings.length === 0) {
    console.log('RESULT: PASS — all GC-02 volume gates met, no structural violations.');
    return true;
  }
  console.log(
    `RESULT: FAIL — ${structural.length} structural violation(s), ${volume.length} volume gate(s) not yet met.`,
  );
  if (structural.length === 0) {
    console.log('        (all failures are volume; the pipeline is structurally sound.)');
  }
  return false;
}

// --- CLI entry ------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const check = process.argv.slice(2).includes('--check');
  // Shared loader (also used by content:validate / content:build) so all three read one catalog.
  const { loadCatalog } = await import('./lib/load-catalog');
  const { catalog, loadErrors } = await loadCatalog();

  printInventory(catalog);

  if (loadErrors.length > 0) {
    console.error(`\n${loadErrors.length} content module(s) failed to import (inventory is partial):`);
    for (const e of loadErrors) console.error(`  - ${e.file}: ${e.error}`);
  }

  if (!check) {
    // Inventory mode is informational, but an un-importable module is a hard failure, not a gate.
    if (loadErrors.length > 0) process.exit(1);
    return;
  }
  const findings = runCheck(catalog);
  const passed = reportCheck(findings);
  if (!passed || loadErrors.length > 0) process.exit(1);
}

const invokedPath = process.argv[1] ?? '';
if (/stats\.[cm]?[jt]s$/.test(invokedPath)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
