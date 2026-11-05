// content/src/d4-prompt-engineering/c4-u3/unit.ts
//
// C4-U3 "Scale & Ground" — long-context prompting and quote grounding, hallucination mitigation, and
// the Message Batches API.

import { defineUnit } from '../../index';
import { l1LongContextGrounding } from './l1-long-context-grounding';
import { l2HallucinationMitigation } from './l2-hallucination-mitigation';
import { l3MessageBatches } from './l3-message-batches';

export const c4u3ScaleAndGround = defineUnit({
  id: 'c4-u3',
  title: 'Scale & Ground',
  order: 2,
  lessons: [l1LongContextGrounding, l2HallucinationMitigation, l3MessageBatches],
});
