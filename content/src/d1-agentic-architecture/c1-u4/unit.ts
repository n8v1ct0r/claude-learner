// content/src/d1-agentic-architecture/c1-u4/unit.ts
//
// C1-U4 "Subagents & Orchestration" — subagents (isolated context, restricted tools, per-agent
// models), orchestrator / hub-and-spoke design, and parallel vs sequential execution with
// partial-failure handling. defineUnit cascade-registers each lesson and its embedded questions
// into the singleton catalog (content/src/index.ts).

import { defineUnit } from '../../index';
import { l1Subagents } from './l1-subagents';
import { l2HubAndSpoke } from './l2-hub-and-spoke';
import { l3ParallelVsSequential } from './l3-parallel-vs-sequential';

export const c1u4SubagentsOrchestration = defineUnit({
  id: 'c1-u4',
  title: 'Subagents & Orchestration',
  order: 3,
  lessons: [l1Subagents, l2HubAndSpoke, l3ParallelVsSequential],
});
