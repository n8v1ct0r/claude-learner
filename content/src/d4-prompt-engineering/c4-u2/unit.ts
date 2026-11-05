// content/src/d4-prompt-engineering/c4-u2/unit.ts
//
// C4-U2 "Structure" — XML tags and positive directives, Structured Outputs, and the extraction-method
// tradeoffs plus validation-retry loops.

import { defineUnit } from '../../index';
import { l1XmlStructureDirectives } from './l1-xml-structure-directives';
import { l2StructuredOutputs } from './l2-structured-outputs';
import { l3ExtractionMethods } from './l3-extraction-methods';

export const c4u2Structure = defineUnit({
  id: 'c4-u2',
  title: 'Structure',
  order: 1,
  lessons: [l1XmlStructureDirectives, l2StructuredOutputs, l3ExtractionMethods],
});
