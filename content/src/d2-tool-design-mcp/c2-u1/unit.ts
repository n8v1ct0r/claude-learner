// content/src/d2-tool-design-mcp/c2-u1/unit.ts
//
// C2-U1 "Tool Anatomy" — how a tool is defined, the tool-use loop, and tool_choice control.
// defineUnit cascade-registers each lesson and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1ToolAnatomy } from './l1-tool-anatomy';
import { l2ToolUseLoop } from './l2-tool-use-loop';
import { l3ToolChoice } from './l3-tool-choice';

export const c2u1ToolAnatomy = defineUnit({
  id: 'c2-u1',
  title: 'Tool Anatomy',
  order: 0,
  lessons: [l1ToolAnatomy, l2ToolUseLoop, l3ToolChoice],
});
