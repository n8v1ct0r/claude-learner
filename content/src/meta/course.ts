// content/src/meta/course.ts
//
// Course 0 — Meet the Exam (domain d0, no exam weight). The orientation course: it teaches the
// blueprint itself (format, five weighted domains, the 720 line, scenario clustering, and how this
// app's Feynman/SRS/mock loop maps to the real exam). Its questions still trace to real exam domains
// (d1..d5) so the tracing/validation machinery treats them like any other bank item.
// defineCourse cascade-registers units -> lessons -> questions into the singleton catalog.

import { defineCourse } from '../index';
import { c0u1KnowTheGame } from './c0-u1/unit';

export const c0MeetTheExam = defineCourse({
  id: 'c0',
  domain: 'd0',
  title: 'Meet the Exam',
  description:
    'Orientation to the CCA-F exam: its 60-question, 120-minute format, the five weighted domains and ' +
    'the 720 pass line, how scenario-clustered questions test decisions over definitions, and how this ' +
    "app's lessons, explain-backs, spaced repetition, and mock exams prepare you for it.",
  order: 0,
  units: [c0u1KnowTheGame],
});
