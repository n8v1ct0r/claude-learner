// content/src/d2-tool-design-mcp/c2-u2/unit.ts
//
// C2-U2 "Robust Tools" — structured error responses and writing token-efficient tools for agents.
// defineUnit cascade-registers each lesson and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1ToolErrors } from './l1-tool-errors';
import { l2WritingTools } from './l2-writing-tools';

export const c2u2RobustTools = defineUnit({
  id: 'c2-u2',
  title: 'Robust Tools',
  order: 1,
  lessons: [l1ToolErrors, l2WritingTools],
});
