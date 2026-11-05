// content/src/d3-claude-code-config/course.ts
//
// Course 3 — Claude Code Configuration & Workflows (domain d3, 20%). Four units, 11 lessons,
// ~88 bank questions, tracing to official task statements 3.1-3.6
// (content/official-task-statements.md). defineCourse cascade-registers units -> lessons ->
// questions into the singleton catalog (content/src/index.ts).
//
// Every claim is authored fresh from official Claude Code docs on code.claude.com (an allowlisted
// citation host) and verified by WebFetch against the cited page on 2026-07-14.

import { defineCourse } from '../index';
import { c3u1MemoryAndRules } from './c3-u1/unit';
import { c3u2SettingsAndPermissions } from './c3-u2/unit';
import { c3u3ExtendingClaudeCode } from './c3-u3/unit';
import { c3u4TeamsAndAutomation } from './c3-u4/unit';

export const c3ClaudeCodeConfig = defineCourse({
  id: 'c3',
  domain: 'd3',
  title: 'Claude Code Configuration & Workflows',
  description:
    'How Claude Code is configured and driven: the CLAUDE.md and rules hierarchy, settings ' +
    'precedence and permissions, hooks, slash commands, skills, subagents, MCP servers, and ' +
    'headless and team workflows.',
  order: 3,
  units: [
    c3u1MemoryAndRules,
    c3u2SettingsAndPermissions,
    c3u3ExtendingClaudeCode,
    c3u4TeamsAndAutomation,
  ],
});
