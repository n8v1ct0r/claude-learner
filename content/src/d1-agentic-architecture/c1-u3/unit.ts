// content/src/d1-agentic-architecture/c1-u3/unit.ts
//
// C1-U3 "Keep It Simple" — when NOT to build an agent, and the token economics of multi-agent
// systems. defineUnit cascade-registers each lesson and its embedded questions into the singleton
// catalog (content/src/index.ts).

import { defineUnit } from '../../index';
import { l1WhenNotToAgent } from './l1-when-not-to-agent';
import { l2MultiAgentEconomics } from './l2-multi-agent-economics';

export const c1u3KeepItSimple = defineUnit({
  id: 'c1-u3',
  title: 'Keep It Simple',
  order: 2,
  lessons: [l1WhenNotToAgent, l2MultiAgentEconomics],
});
