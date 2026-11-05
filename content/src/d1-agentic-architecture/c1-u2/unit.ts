// content/src/d1-agentic-architecture/c1-u2/unit.ts
//
// C1-U2 "The Five Patterns" — prompt chaining + routing, parallelization (sectioning vs voting),
// and orchestrator-workers + evaluator-optimizer. defineUnit cascade-registers each lesson and its
// embedded questions into the singleton catalog (content/src/index.ts).

import { defineUnit } from '../../index';
import { l1ChainingAndRouting } from './l1-chaining-and-routing';
import { l2Parallelization } from './l2-parallelization';
import { l3OrchestratorEvaluator } from './l3-orchestrator-evaluator';

export const c1u2FivePatterns = defineUnit({
  id: 'c1-u2',
  title: 'The Five Patterns',
  order: 1,
  lessons: [l1ChainingAndRouting, l2Parallelization, l3OrchestratorEvaluator],
});
