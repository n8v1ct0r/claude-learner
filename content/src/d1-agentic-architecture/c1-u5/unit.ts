// content/src/d1-agentic-architecture/c1-u5/unit.ts
//
// C1-U5 "Agent SDK & Guardrails" — the Claude Agent SDK (query loop, sessions, resume/fork),
// guardrails (permission modes, canUseTool HITL, deny rules / PreToolUse hooks), and evaluating
// agents (verification, LLM-as-judge, session state). defineUnit cascade-registers each lesson and
// its embedded questions into the singleton catalog (content/src/index.ts).

import { defineUnit } from '../../index';
import { l1AgentSdk } from './l1-agent-sdk';
import { l2Guardrails } from './l2-guardrails';
import { l3EvaluatingAgents } from './l3-evaluating-agents';

export const c1u5AgentSdkGuardrails = defineUnit({
  id: 'c1-u5',
  title: 'Agent SDK & Guardrails',
  order: 4,
  lessons: [l1AgentSdk, l2Guardrails, l3EvaluatingAgents],
});
