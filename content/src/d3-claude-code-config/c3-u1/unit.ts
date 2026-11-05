// content/src/d3-claude-code-config/c3-u1/unit.ts
//
// C3-U1 "Memory & Rules" — how Claude Code carries persistent instructions across sessions:
// the CLAUDE.md hierarchy and imports, path-scoped .claude/rules/, and the memory/context
// commands used to inspect and persist what is loaded. defineUnit cascade-registers each lesson
// and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1ClaudeMdHierarchy } from './l1-claude-md-hierarchy';
import { l2PathScopedRules } from './l2-path-scoped-rules';
import { l3MemoryContextCommands } from './l3-memory-context-commands';

export const c3u1MemoryAndRules = defineUnit({
  id: 'c3-u1',
  title: 'Memory & Rules',
  order: 0,
  lessons: [l1ClaudeMdHierarchy, l2PathScopedRules, l3MemoryContextCommands],
});
