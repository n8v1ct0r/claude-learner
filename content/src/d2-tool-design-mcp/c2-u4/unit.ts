// content/src/d2-tool-design-mcp/c2-u4/unit.ts
//
// C2-U4 "MCP in Practice" — transports and auth, and MCP configuration scopes in Claude Code.
// defineUnit cascade-registers each lesson and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1TransportsAuth } from './l1-transports-auth';
import { l2ConfigScopes } from './l2-config-scopes';

export const c2u4McpInPractice = defineUnit({
  id: 'c2-u4',
  title: 'MCP in Practice',
  order: 3,
  lessons: [l1TransportsAuth, l2ConfigScopes],
});
