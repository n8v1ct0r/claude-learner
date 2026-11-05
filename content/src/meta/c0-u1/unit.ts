// content/src/meta/c0-u1/unit.ts
//
// C0-U1 "Know the Game" — the single unit of the Meet-the-Exam course. Imports the three authored
// lessons and registers the unit; defineUnit cascade-registers each lesson and its embedded questions
// into the singleton catalog (content/src/index.ts).

import { defineUnit } from '../../index';
import { l1ExamFormat } from './l1-exam-format';
import { l2ScenarioClusters } from './l2-scenario-clusters';
import { l3HowTheAppMaps } from './l3-how-the-app-maps';

export const c0u1KnowTheGame = defineUnit({
  id: 'c0-u1',
  title: 'Know the Game',
  order: 0,
  lessons: [l1ExamFormat, l2ScenarioClusters, l3HowTheAppMaps],
});
