// content/src/index.ts
//
// The content registry. Authoring files call these define* helpers, which (1) validate the entity
// against its zod schema at definition time (a bad question throws where it is authored, with a
// precise zod path) and (2) register it into a module-singleton catalog keyed by its append-only
// slug ID (one-way door D3). Lessons/units/courses cascade-register the questions they embed, so
// exams can reference every question BY ID and the dupe/coverage validators (content:validate,
// content:stats — GC-01/GC-02) can read one authoritative catalog.
//
// Authoring layout (courses import units import lessons):
//   content/src/<domain>/lessons/*.ts   -> defineLesson({ ..., exercises: [ { ...question... } ] })
//   content/src/<domain>/units/*.ts     -> defineUnit({ ..., lessons: [lessonA, lessonB] })
//   content/src/<domain>/course.ts      -> defineCourse({ ..., units: [unit1, unit2] })

import {
  CourseSchema,
  ExamSchema,
  LessonSchema,
  QuestionSchema,
  UnitSchema,
} from '../schema/zod';
import type {
  CatalogSnapshot,
  Course,
  Exam,
  Lesson,
  Question,
  Unit,
} from '../schema/types';

/** Thrown when the same slug is registered twice with conflicting content (D3: deprecate, never rename). */
export class ContentRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentRegistryError';
  }
}

const courses = new Map<string, Course>();
const units = new Map<string, Unit>();
const lessons = new Map<string, Lesson>();
const questions = new Map<string, Question>();
const exams = new Map<string, Exam>();

/**
 * Produce a stable, author-order-independent rank for an answer option. Content authors should be
 * free to write the correct option first for readability without teaching learners that the first
 * button is usually correct. Including the question ID keeps the visible order varied across the
 * bank; including the option text makes the result canonical and therefore safe to apply more than
 * once as lessons cascade through unit/course registration.
 */
function optionRank(questionId: string, option: string, salt = ''): number {
  const value = `${questionId}\u0000${salt}\u0000${option}`;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function canonicalOptionOrder(questionId: string, options: readonly string[], salt = ''): string[] {
  return [...options].sort((a, b) => {
    const rankDelta = optionRank(questionId, a, salt) - optionRank(questionId, b, salt);
    return rankDelta === 0 ? a.localeCompare(b) : rankDelta;
  });
}

/**
 * Deterministically vary selectable-answer positions while preserving their meaning. This happens
 * before registration/build, so lessons, practice, mini exams, mocks, and the SQLite bundle all see
 * the same answer order. It is deliberately deterministic: an in-progress persisted lesson remains
 * gradeable after an app restart or content re-read.
 */
export function canonicalizeQuestionOptions(input: Question): Question {
  const question = QuestionSchema.parse(input);

  if (question.type === 'mc') {
    const correct = question.options[question.answerKey];
    const options = canonicalOptionOrder(question.id, question.options);
    return QuestionSchema.parse({ ...question, options, answerKey: options.indexOf(correct) });
  }

  if (question.type === 'multi') {
    const correct = new Set(question.answerKey.map((index) => question.options[index]));
    const options = canonicalOptionOrder(question.id, question.options);
    const answerKey = options.flatMap((option, index) => (correct.has(option) ? [index] : []));
    return QuestionSchema.parse({ ...question, options, answerKey });
  }

  if (question.type === 'cloze') {
    const correct = question.blanks.map((blank, index) => blank.options[question.answerKey[index]]);
    const blanks = question.blanks.map((blank, index) => ({
      options: canonicalOptionOrder(question.id, blank.options, `blank-${index}`),
    }));
    const answerKey = blanks.map((blank, index) => blank.options.indexOf(correct[index]));
    return QuestionSchema.parse({ ...question, blanks, answerKey });
  }

  return question;
}

function canonicalizeLesson(input: Lesson): Lesson {
  return LessonSchema.parse({
    ...input,
    exercises: input.exercises.map(canonicalizeQuestionOptions),
  });
}

function canonicalizeUnit(input: Unit): Unit {
  return UnitSchema.parse({
    ...input,
    lessons: input.lessons.map(canonicalizeLesson),
  });
}

// Registration is idempotent by value: re-registering the identical entity (the common case when a
// question is embedded in a lesson that is embedded in a unit that is embedded in a course) is a
// no-op; registering a DIFFERENT entity under an existing ID is a hard error (append-only IDs, D3).
function register<T extends { id: string }>(map: Map<string, T>, entity: T, kind: string): void {
  const existing = map.get(entity.id);
  if (existing === undefined) {
    map.set(entity.id, entity);
    return;
  }
  if (JSON.stringify(existing) !== JSON.stringify(entity)) {
    throw new ContentRegistryError(
      `duplicate ${kind} id "${entity.id}" registered with conflicting content (IDs are append-only, D3)`,
    );
  }
}

function registerLessonTree(lesson: Lesson): void {
  for (const exercise of lesson.exercises) register(questions, exercise, 'question');
  register(lessons, lesson, 'lesson');
}

function registerUnitTree(unit: Unit): void {
  for (const lesson of unit.lessons) registerLessonTree(lesson);
  register(units, unit, 'unit');
}

export function defineQuestion(input: Question): Question {
  const question = canonicalizeQuestionOptions(input);
  register(questions, question, 'question');
  return question;
}

export function defineLesson(input: Lesson): Lesson {
  const lesson = canonicalizeLesson(input);
  registerLessonTree(lesson);
  return lesson;
}

export function defineUnit(input: Unit): Unit {
  const unit = canonicalizeUnit(input);
  registerUnitTree(unit);
  return unit;
}

export function defineCourse(input: Course): Course {
  const course = CourseSchema.parse({
    ...input,
    units: input.units.map(canonicalizeUnit),
  });
  for (const unit of course.units) registerUnitTree(unit);
  register(courses, course, 'course');
  return course;
}

export function defineExam(input: Exam): Exam {
  const exam = ExamSchema.parse(input);
  register(exams, exam, 'exam');
  return exam;
}

/** Immutable snapshot of everything registered so far (used by content:validate / content:stats). */
export function getCatalog(): CatalogSnapshot {
  return {
    courses: [...courses.values()],
    units: [...units.values()],
    lessons: [...lessons.values()],
    questions: [...questions.values()],
    exams: [...exams.values()],
  };
}

export function getQuestion(id: string): Question | undefined {
  return questions.get(id);
}

/** Exam questionIds that do not resolve to a registered question (for GC-02 reference integrity). */
export function danglingExamReferences(): { examId: string; missing: string[] }[] {
  const out: { examId: string; missing: string[] }[] = [];
  for (const exam of exams.values()) {
    const missing = exam.questionIds.filter((qid) => !questions.has(qid));
    if (missing.length > 0) out.push({ examId: exam.id, missing });
  }
  return out;
}

/** Clears the singleton catalog. Test-only: content build/validate load-and-register exactly once. */
export function resetCatalog(): void {
  courses.clear();
  units.clear();
  lessons.clear();
  questions.clear();
  exams.clear();
}

export type {
  CatalogSnapshot,
  Course,
  Exam,
  Lesson,
  Question,
  Unit,
} from '../schema/types';
