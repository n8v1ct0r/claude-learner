// content/src/d3-claude-code-config/c3-u4/unit.ts
//
// C3-U4 "Teams & Automation" — running Claude Code non-interactively in CI and standardizing a
// team through checked-in config and git workflows. defineUnit cascade-registers each lesson and
// its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1HeadlessCi } from './l1-headless-ci';
import { l2GitWorkflows } from './l2-git-workflows';

export const c3u4TeamsAndAutomation = defineUnit({
  id: 'c3-u4',
  title: 'Teams & Automation',
  order: 3,
  lessons: [l1HeadlessCi, l2GitWorkflows],
});
