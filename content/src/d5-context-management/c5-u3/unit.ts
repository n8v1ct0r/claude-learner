// content/src/d5-context-management/c5-u3/unit.ts
//
// C5-U3 "Reliability" — stop-reason and HTTP error taxonomies, rate limits and streaming, and
// human-in-the-loop escalation with graceful degradation. defineUnit cascade-registers lessons
// and questions.

import { defineUnit } from '../../index';
import { l1ErrorStopTaxonomy } from './l1-error-stop-taxonomy';
import { l2RateLimitsStreaming } from './l2-rate-limits-streaming';
import { l3EscalationDegradation } from './l3-escalation-degradation';

export const c5u3Reliability = defineUnit({
  id: 'c5-u3',
  title: 'Reliability',
  order: 2,
  lessons: [l1ErrorStopTaxonomy, l2RateLimitsStreaming, l3EscalationDegradation],
});
