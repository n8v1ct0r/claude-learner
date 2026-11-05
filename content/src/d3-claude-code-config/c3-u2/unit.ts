// content/src/d3-claude-code-config/c3-u2/unit.ts
//
// C3-U2 "Settings & Permissions" — how Claude Code resolves configuration and governs what it may
// execute: settings precedence with merging permission rules, the permission modes, and plan mode.
// defineUnit cascade-registers each lesson and its embedded questions into the singleton catalog.

import { defineUnit } from '../../index';
import { l1SettingsPrecedence } from './l1-settings-precedence';
import { l2PermissionModes } from './l2-permission-modes';
import { l3PlanMode } from './l3-plan-mode';

export const c3u2SettingsAndPermissions = defineUnit({
  id: 'c3-u2',
  title: 'Settings & Permissions',
  order: 1,
  lessons: [l1SettingsPrecedence, l2PermissionModes, l3PlanMode],
});
