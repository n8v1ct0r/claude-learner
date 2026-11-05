// content/src/d3-claude-code-config/c3-u3/unit.ts
//
// C3-U3 "Extending Claude Code" — the mechanisms that add capability and control: hooks, slash
// commands and Agent Skills, and Claude Code subagents plus MCP servers. defineUnit
// cascade-registers each lesson and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1Hooks } from './l1-hooks';
import { l2SlashCommandsSkills } from './l2-slash-commands-skills';
import { l3SubagentsMcp } from './l3-subagents-mcp';

export const c3u3ExtendingClaudeCode = defineUnit({
  id: 'c3-u3',
  title: 'Extending Claude Code',
  order: 2,
  lessons: [l1Hooks, l2SlashCommandsSkills, l3SubagentsMcp],
});
