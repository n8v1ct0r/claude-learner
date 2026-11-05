// content/src/d1-agentic-architecture/c1-u1/unit.ts
//
// C1-U1 "Think in Agents" — the pilot unit (M2 quality template every M5 lane copies).
// Imports the three authored lessons and registers the unit; defineUnit cascade-registers each
// lesson and its embedded questions into the singleton catalog (content/src/index.ts).

import { defineUnit } from '../../index';
import { l1WorkflowsVsAgents } from './l1-workflows-vs-agents';
import { l2AugmentedLlm } from './l2-augmented-llm';
import { l3AgenticLoop } from './l3-agentic-loop';

export const c1u1ThinkInAgents = defineUnit({
  id: 'c1-u1',
  title: 'Think in Agents',
  order: 0,
  lessons: [l1WorkflowsVsAgents, l2AugmentedLlm, l3AgenticLoop],
});
