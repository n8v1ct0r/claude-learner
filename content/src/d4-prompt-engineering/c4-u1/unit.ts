// content/src/d4-prompt-engineering/c4-u1/unit.ts
//
// C4-U1 "Core Techniques" — clear/direct instructions, few-shot examples, and chain-of-thought /
// extended thinking. defineUnit cascade-registers each lesson and its embedded questions.

import { defineUnit } from '../../index';
import { l1ClearDirectInstructions } from './l1-clear-direct-instructions';
import { l2FewShotExamples } from './l2-few-shot-examples';
import { l3ChainOfThoughtThinking } from './l3-chain-of-thought-thinking';

export const c4u1CoreTechniques = defineUnit({
  id: 'c4-u1',
  title: 'Core Techniques',
  order: 0,
  lessons: [l1ClearDirectInstructions, l2FewShotExamples, l3ChainOfThoughtThinking],
});
