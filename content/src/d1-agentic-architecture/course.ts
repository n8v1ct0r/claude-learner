// content/src/d1-agentic-architecture/course.ts
//
// Course 1 — Agentic Architecture & Orchestration (domain d1, 27%). Pilot scope at M2 is the single
// unit C1-U1 "Think in Agents" (3 lessons). Additional units (C1-U2..C1-U5, see content/curriculum-map.md)
// are appended here as they are authored in M5. defineCourse cascade-registers units -> lessons ->
// questions into the singleton catalog.

import { defineCourse } from '../index';
import { c1u1ThinkInAgents } from './c1-u1/unit';
import { c1u2FivePatterns } from './c1-u2/unit';
import { c1u3KeepItSimple } from './c1-u3/unit';
import { c1u4SubagentsOrchestration } from './c1-u4/unit';
import { c1u5AgentSdkGuardrails } from './c1-u5/unit';

export const c1AgenticArchitecture = defineCourse({
  id: 'c1',
  domain: 'd1',
  title: 'Agentic Architecture & Orchestration',
  description:
    'When to build an agent versus a workflow, the augmented LLM building block, the agentic loop with ' +
    'its stop conditions, the five workflow patterns, multi-agent economics, subagent orchestration, and ' +
    'the Claude Agent SDK with its guardrails.',
  order: 1,
  units: [
    c1u1ThinkInAgents,
    c1u2FivePatterns,
    c1u3KeepItSimple,
    c1u4SubagentsOrchestration,
    c1u5AgentSdkGuardrails,
  ],
});
