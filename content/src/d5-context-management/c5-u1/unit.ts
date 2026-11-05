// content/src/d5-context-management/c5-u1/unit.ts
//
// C5-U1 "The Context Window" — window mechanics and context rot, context engineering, and prompt
// caching. defineUnit cascade-registers each lesson and its embedded questions.

import { defineUnit } from '../../index';
import { l1WindowMechanics } from './l1-window-mechanics';
import { l2ContextEngineering } from './l2-context-engineering';
import { l3PromptCaching } from './l3-prompt-caching';

export const c5u1TheContextWindow = defineUnit({
  id: 'c5-u1',
  title: 'The Context Window',
  order: 0,
  lessons: [l1WindowMechanics, l2ContextEngineering, l3PromptCaching],
});
