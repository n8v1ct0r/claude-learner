// content/schema/types.ts
//
// The ergonomic TypeScript surface for CCA-Quest content. These entity types are INFERRED from the
// zod validators in ./zod (via z.infer) so the compile-time types and the runtime schema can never
// drift: change a schema and every consumer's types change with it. Import content types from here.

export type {
  Domain,
  ExamDomain,
  Difficulty,
  QuestionType,
  QuestionVariant,
  Snippet,
  KeyPoint,
  ConceptCard,
  ExplainBack,
  Question,
  McQuestion,
  MultiQuestion,
  MatchQuestion,
  ClozeQuestion,
  OrderQuestion,
  Lesson,
  Unit,
  Course,
  ScenarioCluster,
  Exam,
} from './zod';

import type { Course, Unit, Lesson, Question, Exam } from './zod';

/** The kinds of registrable content entities held by the catalog (content/src/index.ts). */
export type ContentKind = 'course' | 'unit' | 'lesson' | 'question' | 'exam';

/** A flat, read-only view of everything registered in the content catalog. */
export interface CatalogSnapshot {
  courses: Course[];
  units: Unit[];
  lessons: Lesson[];
  questions: Question[];
  exams: Exam[];
}
