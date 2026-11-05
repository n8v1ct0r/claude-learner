// content/scripts/assemble-exams.ts — DETERMINISTIC exam assembler (M5, GC-02).
//
// Reads the registered exam-register question pool from the singleton catalog (loadCatalog walks and
// imports every content module, including content/src/exams/register/d1..d5.ts, which self-register
// via defineQuestion). From that pool it derives, with NO randomness (sort by id, greedily slice):
//
//   • 3 mock forms × 60 questions, PAIRWISE DISJOINT — a partition of the register pool. Each form
//     matches the per-form domain distribution 16/11/12/12/9 (±1) and clears the difficulty floor
//     (>=60% of items at difficulty >=2). Each form is organized as 4 scenario clusters + standalones.
//     Emitted to content/src/exams/mock-1.ts, mock-2.ts, mock-3.ts (defineExam kind:'mock').
//
//   • 5 mini exams (one per domain, 18 questions each), assembled BY REFERENCE from that domain's
//     register pool. reuse-by-id across mocks/minis is legal (only the mocks must be disjoint).
//     Emitted to content/src/exams/mini-d1.ts .. mini-d5.ts (defineExam kind:'mini').
//
// Determinism contract: every selection is a stable sort by id followed by a positional slice, so the
// same catalog always yields byte-identical output files. If the register distribution cannot satisfy
// the per-form domain / size / difficulty constraints, the script prints EXACTLY which domain (and, for
// the difficulty floor, which form) is short and exits nonzero WITHOUT emitting an invalid partition.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import blueprint from '../blueprint.json';
import type { CatalogSnapshot } from '../schema/types';
import type { ExamDomain, Question } from '../schema/zod';
import { loadCatalog } from './lib/load-catalog';

const EXAM_DOMAINS: readonly ExamDomain[] = ['d1', 'd2', 'd3', 'd4', 'd5'];
const EXAMS_DIR = resolve(__dirname, '../src/exams');
const FORMS = blueprint.volume.mock_forms; // 3
const FORM_SIZE = blueprint.volume.mock_form_size; // 60
const FORM_TARGETS = blueprint.volume.mock_form_domain_targets as Record<ExamDomain, number>;
const FORM_TOL = blueprint.volume.mock_form_domain_tolerance; // 1
const DIFF_FLOOR = blueprint.volume.mock_difficulty_floor.min_fraction_difficulty_2_plus; // 0.6
const MOCK_TIME_LIMIT = 120;
const MINI_SIZE = 18; // inside mini_exam_size_range [15, 20]
const MINI_TIME_LIMIT = 25;
const CLUSTERS_PER_FORM = 4;

// --- register pool --------------------------------------------------------------------------------

function lessonBankIds(catalog: CatalogSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const lesson of catalog.lessons) for (const ex of lesson.exercises) ids.add(ex.id);
  return ids;
}

function byId(a: Question, b: Question): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function groupByDomain(questions: readonly Question[]): Record<ExamDomain, Question[]> {
  const acc: Record<ExamDomain, Question[]> = { d1: [], d2: [], d3: [], d4: [], d5: [] };
  for (const q of questions) acc[q.domain].push(q);
  for (const d of EXAM_DOMAINS) acc[d].sort(byId);
  return acc;
}

// --- deterministic quota computation --------------------------------------------------------------

/**
 * Split `poolCount` items into `FORMS` per-form quotas centered on `target`, distributing the leftover
 * by ±1 in rotating order (form 0 first). Returns the quota array; the caller verifies tolerance/size.
 */
function computeQuotas(poolCount: number, target: number): number[] {
  const q = new Array<number>(FORMS).fill(target);
  let leftover = poolCount - target * FORMS;
  for (let i = 0; leftover > 0; i += 1, leftover -= 1) q[i % FORMS] += 1;
  for (let i = 0; leftover < 0; i += 1, leftover += 1) q[i % FORMS] -= 1;
  return q;
}

interface Shortage {
  message: string;
}

/**
 * Partition the register pool into FORMS disjoint mock forms. Returns either the assignment (an array
 * of Question[] per form) or a list of shortages naming exactly what could not be satisfied.
 */
function partitionMocks(
  poolByDomain: Record<ExamDomain, Question[]>,
): { forms: Question[][]; shortages: Shortage[] } {
  const shortages: Shortage[] = [];
  const forms: Question[][] = Array.from({ length: FORMS }, () => []);

  // Per-domain, compute quotas and slice the id-sorted list positionally into the forms.
  const quotasByDomain: Record<ExamDomain, number[]> = { d1: [], d2: [], d3: [], d4: [], d5: [] };
  for (const d of EXAM_DOMAINS) {
    const pool = poolByDomain[d];
    const target = FORM_TARGETS[d];
    const quotas = computeQuotas(pool.length, target);
    quotasByDomain[d] = quotas;

    const lo = target - FORM_TOL;
    const hi = target + FORM_TOL;
    quotas.forEach((count, formIdx) => {
      if (count < lo || count > hi) {
        shortages.push({
          message:
            `domain ${d}: pool=${pool.length} forces form ${formIdx + 1} to ${count} ${d} question(s), ` +
            `outside target ${target} ±${FORM_TOL} [${lo}-${hi}] — author more/fewer ${d} register items`,
        });
      }
    });

    const total = quotas.reduce((a, b) => a + b, 0);
    if (total !== pool.length) {
      shortages.push({
        message: `domain ${d}: quotas ${quotas.join('+')}=${total} do not consume the pool of ${pool.length}`,
      });
    }

    // Positional slice (deterministic): form 0 gets the first quota[0], etc.
    let cursor = 0;
    quotas.forEach((count, formIdx) => {
      forms[formIdx].push(...pool.slice(cursor, cursor + count));
      cursor += count;
    });
  }

  // Per-form: exact size and difficulty floor.
  forms.forEach((form, formIdx) => {
    if (form.length !== FORM_SIZE) {
      shortages.push({
        message: `mock form ${formIdx + 1}: assembled ${form.length} questions (target ${FORM_SIZE}) — ` +
          `per-domain quotas ${EXAM_DOMAINS.map((d) => `${d}:${quotasByDomain[d][formIdx]}`).join(' ')}`,
      });
    }
    const hard = form.filter((q) => q.difficulty >= 2).length;
    const frac = form.length === 0 ? 0 : hard / form.length;
    if (frac + 1e-9 < DIFF_FLOOR) {
      shortages.push({
        message:
          `mock form ${formIdx + 1}: difficulty>=2 is ${(frac * 100).toFixed(0)}% ` +
          `(${hard}/${form.length}), below floor ${(DIFF_FLOOR * 100).toFixed(0)}% — ` +
          `author more difficulty>=2 register items`,
      });
    }
  });

  return { forms, shortages };
}

// --- scenario clustering (4 clusters + standalones) -----------------------------------------------

interface FormLayout {
  clusters: { scenarioId: string; questionIds: string[] }[];
  orderedQuestionIds: string[]; // clustered (grouped) first, then standalones
}

function layoutForm(form: readonly Question[]): FormLayout {
  const bySc = new Map<string, Question[]>();
  for (const q of form) {
    const sc = q.scenarioId;
    if (!sc) continue;
    (bySc.get(sc) ?? bySc.set(sc, []).get(sc)!).push(q);
  }
  // Rank scenarios by (member count desc, scenarioId asc); the top CLUSTERS_PER_FORM become clusters.
  const ranked = [...bySc.entries()].sort((a, b) =>
    b[1].length - a[1].length || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
  );
  const clusterScenarios = new Set(ranked.slice(0, CLUSTERS_PER_FORM).map(([sc]) => sc));

  const clusters = ranked
    .filter(([sc]) => clusterScenarios.has(sc))
    .map(([scenarioId, qs]) => ({
      scenarioId,
      questionIds: [...qs].sort(byId).map((q) => q.id),
    }));

  const clusteredIds = new Set(clusters.flatMap((c) => c.questionIds));
  const standalones = form
    .filter((q) => !clusteredIds.has(q.id))
    .sort(byId)
    .map((q) => q.id);

  const orderedQuestionIds = [...clusters.flatMap((c) => c.questionIds), ...standalones];
  return { clusters, orderedQuestionIds };
}

// --- emitters -------------------------------------------------------------------------------------

const HEADER =
  '// AUTO-GENERATED by content/scripts/assemble-exams.ts — do not hand-edit.\n' +
  '// Deterministic assembly of the exam-register pool (sort-by-id + positional slice). Re-run\n' +
  '// `npx tsx content/scripts/assemble-exams.ts` to regenerate. Questions are referenced BY ID.\n';

function fmtIdList(ids: readonly string[]): string {
  return ids.map((id) => `    '${id}',`).join('\n');
}

function emitMock(formIdx: number, form: readonly Question[]): string {
  const n = formIdx + 1;
  const layout = layoutForm(form);
  const domainCounts = EXAM_DOMAINS.map((d) => `${d} ${form.filter((q) => q.domain === d).length}`).join(' · ');
  const hard = form.filter((q) => q.difficulty >= 2).length;

  const clustersSrc = layout.clusters
    .map(
      (c) =>
        `    {\n      scenarioId: '${c.scenarioId}',\n      questionIds: [\n` +
        c.questionIds.map((id) => `        '${id}',`).join('\n') +
        `\n      ],\n    },`,
    )
    .join('\n');

  return (
    `${HEADER}//\n` +
    `// Mock form ${n} — 60 questions, domains ${domainCounts}, difficulty>=2 ${hard}/60 ` +
    `(${((hard / form.length) * 100).toFixed(0)}%). Pairwise disjoint from the other mock forms.\n\n` +
    `import { defineExam } from '../index';\n\n` +
    `export const mock${n} = defineExam({\n` +
    `  id: 'mock-${n}',\n` +
    `  kind: 'mock',\n` +
    `  title: 'Full Mock Exam ${n}',\n` +
    `  timeLimitMinutes: ${MOCK_TIME_LIMIT},\n` +
    `  questionIds: [\n${fmtIdList(layout.orderedQuestionIds)}\n  ],\n` +
    `  scenarioClusters: [\n${clustersSrc}\n  ],\n` +
    `});\n`
  );
}

function emitMini(domain: ExamDomain, questions: readonly Question[]): string {
  const ids = questions.map((q) => q.id);
  const hard = questions.filter((q) => q.difficulty >= 2).length;
  const domainTitle: Record<ExamDomain, string> = {
    d1: 'Agentic Architecture & Orchestration',
    d2: 'Tool Design & MCP',
    d3: 'Claude Code Configuration & Workflows',
    d4: 'Prompt Engineering & Structured Output',
    d5: 'Context Management & Reliability',
  };
  return (
    `${HEADER}//\n` +
    `// Mini exam — Domain ${domain.toUpperCase()} (${domainTitle[domain]}). ${ids.length} questions ` +
    `drawn by reference from the ${domain} exam register (difficulty>=2 ${hard}/${ids.length}).\n\n` +
    `import { defineExam } from '../index';\n\n` +
    `export const mini${domain.toUpperCase()} = defineExam({\n` +
    `  id: 'mini-${domain}',\n` +
    `  kind: 'mini',\n` +
    `  title: 'Mini Exam — ${domainTitle[domain]}',\n` +
    `  timeLimitMinutes: ${MINI_TIME_LIMIT},\n` +
    `  questionIds: [\n${fmtIdList(ids)}\n  ],\n` +
    `});\n`
  );
}

function emitIndex(): string {
  const registerImports = EXAM_DOMAINS.map((d) => `import './register/${d}';`).join('\n');
  const mockImports = Array.from({ length: FORMS }, (_, i) => `import './mock-${i + 1}';`).join('\n');
  const miniImports = EXAM_DOMAINS.map((d) => `import './mini-${d}';`).join('\n');
  return (
    '// content/src/exams/index.ts\n' +
    '//\n' +
    '// Barrel that imports every exam-register module (so their defineQuestion() calls register the\n' +
    '// 180-question pool) and every assembled exam (so their defineExam() calls register the 3 mock\n' +
    '// forms + 5 mini exams). The content loader walks these files directly too; importing them here\n' +
    '// makes the exam surface explicit and import-order-independent. Registration is idempotent by value.\n\n' +
    '// Exam register (standalone exam-style questions, one file per domain):\n' +
    `${registerImports}\n\n` +
    '// Assembled mock forms (3 × 60, pairwise disjoint):\n' +
    `${mockImports}\n\n` +
    '// Assembled mini exams (one per domain):\n' +
    `${miniImports}\n`
  );
}

// --- main -----------------------------------------------------------------------------------------

async function main(): Promise<void> {
  const { catalog, loadErrors } = await loadCatalog();
  if (loadErrors.length > 0) {
    console.error(`Cannot assemble: ${loadErrors.length} content module(s) failed to import:`);
    for (const e of loadErrors) console.error(`  - ${e.file}: ${e.error}`);
    process.exit(1);
  }

  const bankIds = lessonBankIds(catalog);
  const register = catalog.questions.filter((q) => !bankIds.has(q.id));
  const poolByDomain = groupByDomain(register);

  console.log('ASSEMBLE EXAMS');
  console.log(
    `  register pool: ${register.length} questions (` +
      EXAM_DOMAINS.map((d) => `${d} ${poolByDomain[d].length}`).join(' · ') +
      ')',
  );

  const { forms, shortages } = partitionMocks(poolByDomain);
  if (shortages.length > 0) {
    console.error('\nCANNOT PRODUCE A VALID PARTITION — nothing was written:');
    for (const s of shortages) console.error(`  ✗ ${s.message}`);
    process.exit(1);
  }

  // Emit mock forms.
  forms.forEach((form, i) => {
    const src = emitMock(i, form);
    writeFileSync(resolve(EXAMS_DIR, `mock-${i + 1}.ts`), src);
    const layout = layoutForm(form);
    const hard = form.filter((q) => q.difficulty >= 2).length;
    console.log(
      `  mock-${i + 1}: ${form.length} Q · ` +
        EXAM_DOMAINS.map((d) => `${d} ${form.filter((q) => q.domain === d).length}`).join('/') +
        ` · diff>=2 ${((hard / form.length) * 100).toFixed(0)}% · ` +
        `${layout.clusters.length} clusters (${layout.clusters.map((c) => c.questionIds.length).join('+')}) + ` +
        `${form.length - layout.clusters.flatMap((c) => c.questionIds).length} standalone`,
    );
  });

  // Emit mini exams (one per domain, first MINI_SIZE register items by id).
  for (const d of EXAM_DOMAINS) {
    const pool = poolByDomain[d];
    if (pool.length < MINI_SIZE) {
      console.error(
        `\nCANNOT ASSEMBLE mini-${d}: only ${pool.length} ${d} register questions, need ${MINI_SIZE}.`,
      );
      process.exit(1);
    }
    const picked = pool.slice(0, MINI_SIZE);
    writeFileSync(resolve(EXAMS_DIR, `mini-${d}.ts`), emitMini(d, picked));
    console.log(`  mini-${d}: ${picked.length} Q (by reference from ${d} register)`);
  }

  // Emit / refresh the exams barrel.
  writeFileSync(resolve(EXAMS_DIR, 'index.ts'), emitIndex());

  // Disjointness self-check (must hold — the partition is by construction disjoint).
  const seen = new Set<string>();
  let overlap = false;
  for (const form of forms) {
    for (const q of form) {
      if (seen.has(q.id)) overlap = true;
      seen.add(q.id);
    }
  }
  console.log(
    `\n  DONE — 3 mock forms + 5 mini exams written to content/src/exams/. ` +
      `mock forms pairwise disjoint: ${overlap ? 'NO (BUG)' : 'yes'}; ` +
      `mock questions used: ${seen.size}/${register.length}.`,
  );
  if (overlap) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
