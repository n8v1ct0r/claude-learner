// content/src/d2-tool-design-mcp/course.ts
//
// Course 2 — Tool Design & MCP Integration (domain d2, 18%). Four units (see content/curriculum-map.md):
//   C2-U1 "Tool Anatomy"   — tool definition, the tool-use loop, tool_choice modes
//   C2-U2 "Robust Tools"   — error handling, writing token-efficient tools, built-in tools
//   C2-U3 "MCP Fundamentals" — architecture, server primitives, advanced primitives
//   C2-U4 "MCP in Practice"  — transports/auth, config scopes in Claude Code
// defineCourse cascade-registers units -> lessons -> questions into the singleton catalog.

import { defineCourse } from '../index';
import { c2u1ToolAnatomy } from './c2-u1/unit';
import { c2u2RobustTools } from './c2-u2/unit';
import { c2u3McpFundamentals } from './c2-u3/unit';
import { c2u4McpInPractice } from './c2-u4/unit';

export const c2ToolDesignMcp = defineCourse({
  id: 'c2',
  domain: 'd2',
  title: 'Tool Design & MCP Integration',
  description:
    'How to define tools Claude selects reliably, run the tool-use loop, return robust errors and ' +
    'token-efficient results, and integrate Model Context Protocol servers across transports and scopes.',
  order: 2,
  units: [c2u1ToolAnatomy, c2u2RobustTools, c2u3McpFundamentals, c2u4McpInPractice],
});
