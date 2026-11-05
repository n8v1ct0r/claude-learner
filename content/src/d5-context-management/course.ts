// content/src/d5-context-management/course.ts
//
// Course 5 — Context Management & Reliability (domain d5, 15%). Three units (see
// content/curriculum-map.md): C5-U1 "The Context Window", C5-U2 "Active Management",
// C5-U3 "Reliability". defineCourse cascade-registers units -> lessons -> questions into the
// singleton catalog. Traces to official task statements 5.1-5.6
// (content/official-task-statements.md).

import { defineCourse } from '../index';
import { c5u1TheContextWindow } from './c5-u1/unit';
import { c5u2ActiveManagement } from './c5-u2/unit';
import { c5u3Reliability } from './c5-u3/unit';

export const c5ContextManagement = defineCourse({
  id: 'c5',
  domain: 'd5',
  title: 'Context Management & Reliability',
  description:
    'How the context window works and rots, engineering the smallest high-signal context, prompt ' +
    'caching, active management with context editing and compaction, token budgeting, and the ' +
    'reliability layer: stop reasons, error and rate-limit taxonomies, streaming, and human escalation.',
  order: 5,
  units: [c5u1TheContextWindow, c5u2ActiveManagement, c5u3Reliability],
});
