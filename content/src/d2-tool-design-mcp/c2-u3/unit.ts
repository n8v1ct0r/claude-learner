// content/src/d2-tool-design-mcp/c2-u3/unit.ts
//
// C2-U3 "MCP Fundamentals" — MCP architecture, server primitives, and advanced client primitives.
// defineUnit cascade-registers each lesson and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1McpArchitecture } from './l1-mcp-architecture';
import { l2ServerPrimitives } from './l2-server-primitives';
import { l3AdvancedPrimitives } from './l3-advanced-primitives';

export const c2u3McpFundamentals = defineUnit({
  id: 'c2-u3',
  title: 'MCP Fundamentals',
  order: 2,
  lessons: [l1McpArchitecture, l2ServerPrimitives, l3AdvancedPrimitives],
});
