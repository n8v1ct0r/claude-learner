// Pure mock-exam mechanics. No clocks, React, storage, or network access live here: callers pass
// timestamps and responses in, which keeps the certification estimate deterministic and testable.

import type { ExamDomain, Question } from '../../content/schema/types';

export type ExamSelection = number[];
export type DomainBand = 'strong' | 'borderline' | 'needs-work';
export type ReadinessBand = 'keep-building' | 'getting-close' | 'likely-ready';
export type PaceBand = 'ahead' | 'on-pace' | 'behind';

export interface DomainResult {
  domain: ExamDomain;
  correct: number;
  total: number;
  percent: number;
  band: DomainBand;
  missedQuestionIds: string[];
}

export interface TaskResult {
  taskStatement: string;
  domain: ExamDomain;
  correct: number;
  total: number;
  percent: number;
  band: DomainBand;
  missedQuestionIds: string[];
}

export interface ExamResult {
  correct: number;
  total: number;
  percent: number;
  estimatedScore: number;
  readiness: ReadinessBand;
  domains: DomainResult[];
  tasks: TaskResult[];
  missedQuestionIds: string[];
}

export interface AnsweredExamQuestion {
  question: Question;
  selection: ExamSelection | undefined;
}

const DOMAIN_ORDER: readonly ExamDomain[] = ['d1', 'd2', 'd3', 'd4', 'd5'];

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
}

/** Mocks intentionally use only MC and multi-select questions. Unsupported content grades false. */
export function gradeExamSelection(question: Question, selection: ExamSelection | undefined): boolean {
  if (!selection) return false;
  if (question.type === 'mc') return selection.length === 1 && selection[0] === question.answerKey;
  if (question.type === 'multi') return sameSet(selection, question.answerKey);
  return false;
}

/** Contract estimate: 100 + round(raw / total * 900), clamped to the advertised 100–1000 range. */
export function estimateScaledScore(correct: number, total: number): number {
  if (total <= 0) return 100;
  const boundedCorrect = Math.max(0, Math.min(correct, total));
  return Math.max(100, Math.min(1000, 100 + Math.round((boundedCorrect / total) * 900)));
}

export function readinessForScore(score: number): ReadinessBand {
  if (score >= 770) return 'likely-ready';
  if (score >= 650) return 'getting-close';
  return 'keep-building';
}

export function bandForPercent(percent: number): DomainBand {
  if (percent >= 80) return 'strong';
  if (percent >= 60) return 'borderline';
  return 'needs-work';
}

export function scoreExam(items: readonly AnsweredExamQuestion[]): ExamResult {
  const buckets = new Map<ExamDomain, { correct: number; total: number; missedQuestionIds: string[] }>();
  const taskBuckets = new Map<string, { domain: ExamDomain; correct: number; total: number; missedQuestionIds: string[] }>();
  const missedQuestionIds: string[] = [];
  let correct = 0;

  for (const { question, selection } of items) {
    const isCorrect = gradeExamSelection(question, selection);
    if (isCorrect) correct += 1;
    else missedQuestionIds.push(question.id);

    const bucket = buckets.get(question.domain) ?? { correct: 0, total: 0, missedQuestionIds: [] };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    else bucket.missedQuestionIds.push(question.id);
    buckets.set(question.domain, bucket);

    const taskBucket = taskBuckets.get(question.taskStatement) ?? {
      domain: question.domain,
      correct: 0,
      total: 0,
      missedQuestionIds: [],
    };
    taskBucket.total += 1;
    if (isCorrect) taskBucket.correct += 1;
    else taskBucket.missedQuestionIds.push(question.id);
    taskBuckets.set(question.taskStatement, taskBucket);
  }

  const domains = DOMAIN_ORDER.filter((domain) => buckets.has(domain))
    .map((domain): DomainResult => {
      const bucket = buckets.get(domain) as NonNullable<ReturnType<typeof buckets.get>>;
      const percent = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : 0;
      return { domain, ...bucket, percent, band: bandForPercent(percent) };
    })
    .sort((a, b) => a.percent - b.percent || DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain));

  const total = items.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const estimatedScore = estimateScaledScore(correct, total);
  const tasks = [...taskBuckets.entries()]
    .map(([taskStatement, bucket]): TaskResult => {
      const taskPercent = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : 0;
      return {
        taskStatement,
        ...bucket,
        percent: taskPercent,
        band: bandForPercent(taskPercent),
      };
    })
    .sort((a, b) => a.percent - b.percent || a.taskStatement.localeCompare(b.taskStatement, undefined, { numeric: true }));
  return {
    correct,
    total,
    percent,
    estimatedScore,
    readiness: readinessForScore(estimatedScore),
    domains,
    tasks,
    missedQuestionIds,
  };
}

/** Whole seconds remaining. Exact zero is the auto-submit boundary. */
export function remainingSeconds(deadlineAt: number, now: number): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function formatCountdown(seconds: number): string {
  const bounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(bounded / 3600);
  const minutes = Math.floor((bounded % 3600) / 60);
  const secs = bounded % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** Compare answered share with elapsed-time share using a forgiving ±8 percentage-point lane. */
export function paceBand(params: {
  answered: number;
  total: number;
  elapsedSeconds: number;
  allowedSeconds: number;
}): PaceBand {
  if (params.total <= 0 || params.allowedSeconds <= 0) return 'on-pace';
  const answeredShare = Math.max(0, Math.min(1, params.answered / params.total));
  const elapsedShare = Math.max(0, Math.min(1, params.elapsedSeconds / params.allowedSeconds));
  const delta = answeredShare - elapsedShare;
  if (delta > 0.08) return 'ahead';
  if (delta < -0.08) return 'behind';
  return 'on-pace';
}
