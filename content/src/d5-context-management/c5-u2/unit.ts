// content/src/d5-context-management/c5-u2/unit.ts
//
// C5-U2 "Active Management" — context editing (tool-result clearing), compaction and the memory
// tool, and token counting for budgeting. defineUnit cascade-registers lessons and questions.

import { defineUnit } from '../../index';
import { l1ContextEditing } from './l1-context-editing';
import { l2CompactionMemory } from './l2-compaction-memory';
import { l3TokenCounting } from './l3-token-counting';

export const c5u2ActiveManagement = defineUnit({
  id: 'c5-u2',
  title: 'Active Management',
  order: 1,
  lessons: [l1ContextEditing, l2CompactionMemory, l3TokenCounting],
});
