// content/src/d4-prompt-engineering/course.ts
//
// Course 4 — Prompt Engineering & Structured Output (domain d4, 20%). Four units (see
// content/curriculum-map.md): Core Techniques, Structure, Scale & Ground, Evaluate. defineCourse
// cascade-registers units -> lessons -> questions into the singleton catalog. Task statements 4.1-4.6
// (content/official-task-statements.md).

import { defineCourse } from '../index';
import { c4u1CoreTechniques } from './c4-u1/unit';
import { c4u2Structure } from './c4-u2/unit';
import { c4u3ScaleAndGround } from './c4-u3/unit';
import { c4u4Evaluate } from './c4-u4/unit';

export const c4PromptEngineering = defineCourse({
  id: 'c4',
  domain: 'd4',
  title: 'Prompt Engineering & Structured Output',
  description:
    'Core prompting techniques, structuring prompts and outputs, grounding at scale, and evaluating ' +
    'prompts against clear success criteria.',
  order: 4,
  units: [c4u1CoreTechniques, c4u2Structure, c4u3ScaleAndGround, c4u4Evaluate],
});
