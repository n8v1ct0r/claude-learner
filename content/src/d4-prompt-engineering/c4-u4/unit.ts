// content/src/d4-prompt-engineering/c4-u4/unit.ts
//
// C4-U4 "Evaluate" — success criteria plus empirical prompt evaluation, and the AI Fluency 4D
// framework.

import { defineUnit } from '../../index';
import { l1SuccessCriteriaEvals } from './l1-success-criteria-evals';
import { l2AiFluency4d } from './l2-ai-fluency-4d';

export const c4u4Evaluate = defineUnit({
  id: 'c4-u4',
  title: 'Evaluate',
  order: 3,
  lessons: [l1SuccessCriteriaEvals, l2AiFluency4d],
});
