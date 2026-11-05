// src/analytics/events.ts
//
// A deliberately tiny, local-only analytics sink. v1 ships no remote telemetry (privacy + the free
// Apple ID has no push/analytics entitlement); this module just records events in memory so the app
// can make product decisions (e.g. how often explain-back is skipped) and so tests can assert that a
// decision point fired. The GC-15a contract requires that skipping explain-back emits an event that
// is DISTINGUISHABLE from completing it — that distinction lives in `AnalyticsEvent['name']`.
//
// It is intentionally pure of I/O: `emitAnalytics` appends to an in-process buffer. A real sink
// (batched upload, on-device log) can subscribe later without changing any call site.

export type AnalyticsEventName =
  | 'lesson_started'
  | 'lesson_completed'
  | 'explain_back_completed'
  | 'explain_back_skipped';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  /** Optional structured payload (e.g. { lessonId }). Kept free-form and non-sensitive. */
  props?: Record<string, string | number | boolean>;
  /** Epoch ms the event was emitted (caller-supplied so it stays testable/deterministic). */
  at: number;
}

type Listener = (event: AnalyticsEvent) => void;

const buffer: AnalyticsEvent[] = [];
const listeners = new Set<Listener>();

/** Record a local analytics event. Never throws; never performs I/O. */
export function emitAnalytics(
  name: AnalyticsEventName,
  props?: Record<string, string | number | boolean>,
  at: number = Date.now(),
): void {
  const event: AnalyticsEvent = props ? { name, props, at } : { name, at };
  buffer.push(event);
  for (const listener of listeners) listener(event);
}

/** Every event recorded so far (a copy — the buffer is not exposed for mutation). */
export function getAnalyticsEvents(): AnalyticsEvent[] {
  return [...buffer];
}

/** Subscribe to future events; returns an unsubscribe function. */
export function onAnalyticsEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test hook: clear the in-memory buffer. */
export function resetAnalytics(): void {
  buffer.length = 0;
}
