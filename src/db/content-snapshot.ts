// src/db/content-snapshot.ts
//
// The web build's content source. expo-sqlite's web driver needs a wasm worker plus cross-origin
// isolation headers, so the web export does not open content.db in the browser. Instead
// scripts/build-web-content.ts reads the SAME shipped database through the SAME createContentReader
// and writes every answer the reader can give into one JSON snapshot (public/content.json, generated,
// gitignored). createSnapshotReader serves the ContentReader interface from that snapshot.
//
// Pure module: no react-native or expo imports, so the parity test runs it in Node next to the
// sqlite reader. Native builds never import it.

import type { Course, Exam, Lesson, Question, Unit } from '../../content/schema/types';

import type { ContentReader, CourseSummary, ExamSummary } from './content-reader';

export interface ContentSnapshot {
  courses: CourseSummary[];
  courseById: Record<string, Course>;
  exams: ExamSummary[];
  examById: Record<string, Exam>;
  /** Questions that are not lesson exercises (the exam register). Lesson exercises live in courses. */
  extraQuestions: Record<string, Question>;
  /** Every lesson id in spine order (course, unit, lesson). */
  spine: string[];
  /** conceptId -> the lesson id the sqlite reader resolves for it. */
  lessonIdByConcept: Record<string, string>;
}

/** Build a snapshot from any ContentReader (the sqlite one, in the build script). */
export function buildContentSnapshot(
  reader: ContentReader,
  allQuestionIds: string[],
  allConceptIds: string[],
  spine: string[],
): ContentSnapshot {
  const courses = reader.listCourses();
  const courseById: Record<string, Course> = {};
  const lessonQuestionIds = new Set<string>();
  for (const summary of courses) {
    const course = reader.getCourse(summary.id);
    if (!course) continue;
    courseById[course.id] = course;
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        for (const q of lesson.exercises) lessonQuestionIds.add(q.id);
      }
    }
  }
  const exams = reader.listExams();
  const examById: Record<string, Exam> = {};
  for (const summary of exams) {
    const exam = reader.getExam(summary.id);
    if (exam) examById[exam.id] = exam;
  }
  const extraQuestions: Record<string, Question> = {};
  for (const id of allQuestionIds) {
    if (lessonQuestionIds.has(id)) continue;
    const q = reader.getQuestion(id);
    if (q) extraQuestions[id] = q;
  }
  const lessonIdByConcept: Record<string, string> = {};
  for (const conceptId of allConceptIds) {
    const lesson = reader.getLessonForConcept(conceptId);
    if (lesson) lessonIdByConcept[conceptId] = lesson.id;
  }
  return { courses, courseById, exams, examById, extraQuestions, spine, lessonIdByConcept };
}

/** Serve the ContentReader interface from a snapshot. Same answers as the sqlite reader. */
export function createSnapshotReader(snapshot: ContentSnapshot): ContentReader {
  const units = new Map<string, Unit>();
  const lessons = new Map<string, Lesson>();
  const questions = new Map<string, Question>(Object.entries(snapshot.extraQuestions));
  for (const course of Object.values(snapshot.courseById)) {
    for (const unit of course.units) {
      units.set(unit.id, unit);
      for (const lesson of unit.lessons) {
        lessons.set(lesson.id, lesson);
        for (const q of lesson.exercises) questions.set(q.id, q);
      }
    }
  }
  const spineIndex = new Map(snapshot.spine.map((id, i) => [id, i]));

  return {
    listCourses: () => snapshot.courses,
    getCourse: (id) => snapshot.courseById[id],
    getUnit: (id) => units.get(id),
    getLesson: (id) => lessons.get(id),
    getFirstLesson: () => (snapshot.spine[0] ? lessons.get(snapshot.spine[0]) : undefined),
    getNextLesson: (afterLessonId) => {
      const index = spineIndex.get(afterLessonId);
      if (index === undefined || index + 1 >= snapshot.spine.length) return undefined;
      return lessons.get(snapshot.spine[index + 1]);
    },
    getQuestion: (id) => questions.get(id),
    listExams: () => snapshot.exams,
    getExam: (id) => snapshot.examById[id],
    getLessonForConcept: (conceptId) => {
      const lessonId = snapshot.lessonIdByConcept[conceptId];
      return lessonId ? lessons.get(lessonId) : undefined;
    },
  };
}
