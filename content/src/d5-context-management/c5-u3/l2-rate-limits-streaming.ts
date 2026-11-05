// content/src/d5-context-management/c5-u3/l2-rate-limits-streaming.ts
//
// C5-U3-L2 — Rate limits (RPM / ITPM / OTPM, token bucket) and streaming over SSE. Task statement
// 5.3 (reliable handling under load and mid-stream errors). Every claim traces to the cited pages
// (verified 2026-07-14):
//   RATELIMITS — "Rate limits": per-model RPM, ITPM (input tokens/min), OTPM (output tokens/min);
//                token bucket continuously replenishes rather than resetting at fixed intervals;
//                exceeding a limit returns 429 with retry-after; only uncached input counts toward
//                ITPM on most models, so caching raises effective throughput; max_tokens does not
//                factor into OTPM.
//   STREAM     — "Streaming": SSE events message_start, content_block_start, content_block_delta
//                (text_delta / input_json_delta / thinking_delta), content_block_stop, message_delta,
//                message_stop, plus ping; an error (e.g. overloaded_error) can arrive mid-stream
//                after a 200.
//
// Confusion pair targeted: continuous token-bucket replenishment vs fixed-window reset, and the
// belief that a 200 means the whole stream is error-free.

import { defineLesson } from '../../index';

const RATELIMITS = 'https://platform.claude.com/docs/en/api/rate-limits';
const STREAM = 'https://platform.claude.com/docs/en/build-with-claude/streaming';

export const l2RateLimitsStreaming = defineLesson({
  id: 'c5-u3-l2',
  title: 'Rate limits and streaming',
  order: 1,
  concept: {
    conceptId: 'rate-limits-and-streaming',
    analogy:
      'Rate limits are a metered highway on-ramp whose light refills a little every second (a token ' +
      'bucket), not a gate that flips open once a minute. Streaming is watching a video buffer chunk by ' +
      'chunk instead of waiting for the whole file, and a chunk can still fail partway through.',
    plainExplanation:
      'Rate limits apply per model as requests per minute (RPM), input tokens per minute (ITPM), and ' +
      'output tokens per minute (OTPM). They use a token bucket algorithm that continuously replenishes ' +
      'capacity rather than resetting at fixed intervals, so short bursts can still trip a limit. Exceeding ' +
      'one returns a 429 with a retry-after header. On most models only uncached input counts toward ITPM, ' +
      'so prompt caching raises effective throughput, and max_tokens does not factor into OTPM. Streaming ' +
      'sends the response incrementally over server-sent events; an error can still arrive mid-stream after ' +
      'the initial 200, so you handle errors during the stream, not only at the start.',
    examWords: [
      'RPM',
      'ITPM',
      'OTPM',
      'token bucket',
      'server-sent events (SSE)',
      'message_stop',
    ],
    keyPoints: [
      { id: 'kp-rate-limits-and-streaming-1', text: 'Rate limits apply per model as RPM, ITPM (input tokens per minute), and OTPM (output tokens per minute).' },
      { id: 'kp-rate-limits-and-streaming-2', text: 'The token bucket algorithm continuously replenishes capacity rather than resetting at fixed intervals, so short bursts can still trip a limit.' },
      { id: 'kp-rate-limits-and-streaming-3', text: 'On most models only uncached input counts toward ITPM, so prompt caching raises effective throughput, and max_tokens does not factor into OTPM.' },
      { id: 'kp-rate-limits-and-streaming-4', text: 'Streaming sends the response incrementally over server-sent events, and an error can still arrive mid-stream after the initial 200 response.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u3-l2-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What do ITPM and OTPM measure for a model?',
      options: [
        'Input tokens per minute and output tokens per minute',
        'Internal and outbound proxy limits on network packets',
        'Idle-time and overload-time thresholds in seconds',
        'Image tokens per minute and object tokens per minute',
      ],
      answerKey: 0,
      explanation:
        'ITPM is input tokens per minute and OTPM is output tokens per minute, two of the three per-model limits ' +
        'alongside RPM. The packet and idle-time options are invented expansions, which is the trap of guessing at ' +
        'an acronym.',
      misconceptionTag: 'itpm-otpm-meaning',
      sourceUrls: [RATELIMITS],
    },
    {
      id: 'c5-u3-l2-q02',
      type: 'mc',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'How does the token bucket algorithm behave for rate limits?',
      options: [
        'Capacity is continuously replenished up to the limit rather than reset at fixed intervals',
        'The full quota resets to maximum exactly once per minute on the minute',
        'Capacity only refills after you receive a 429 response',
        'Each request permanently consumes quota that never comes back',
      ],
      answerKey: 0,
      explanation:
        'The token bucket refills continuously toward your maximum, which is why a 60 RPM limit can behave like one ' +
        'request per second and a burst can still trip it. The "resets once per minute" option is the fixed-window ' +
        'mental model the docs explicitly contrast against.',
      misconceptionTag: 'token-bucket-continuous',
      sourceUrls: [RATELIMITS],
    },
    {
      id: 'c5-u3-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You repeatedly send the same large document plus a short question and keep hitting the ITPM limit. What raises your effective throughput?',
      options: [
        'Cache the large document, since on most models cached input does not count toward ITPM',
        'Increase max_tokens so more output fits per request',
        'Switch every call to a fixed one-minute retry timer',
        'Remove the document from the request so nothing counts',
      ],
      answerKey: 0,
      explanation:
        'On most models cache reads do not count toward ITPM, so caching the repeated document lets far more total ' +
        'input flow within the same limit. Raising max_tokens is the trap: it affects output, not the input limit ' +
        'you are hitting.',
      misconceptionTag: 'caching-raises-throughput',
      sourceUrls: [RATELIMITS],
    },
    {
      id: 'c5-u3-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A streaming client checks only the initial HTTP status: if it is 200 it assumes the whole response will succeed and ignores later events. Why is this unsafe?',
      options: [
        'An error such as overloaded_error can arrive mid-stream after the 200, so error events must be handled during the stream',
        'A 200 is impossible for streaming responses, so the check never passes',
        'Streaming never emits errors, so the check is merely redundant',
        'The 200 must be re-validated by resending the entire request',
      ],
      answerKey: 0,
      explanation:
        'Over SSE, an error like overloaded_error can appear after the initial 200, so robust clients handle error ' +
        'events throughout the stream. "Streaming never emits errors" is the trap that leaves partial, broken ' +
        'responses unhandled.',
      misconceptionTag: 'mid-stream-errors',
      sourceUrls: [STREAM],
    },
    {
      id: 'c5-u3-l2-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Two of these claims about the API rate limits hold up and three do not. Pick the TWO correct ones. Select TWO.',
      options: [
        'Exceeding a limit returns a 429 with a retry-after header indicating how long to wait',
        'Limits are enforced separately per model, so different models draw on separate limits',
        'max_tokens is added to your OTPM usage whether or not it is generated',
        'Rate limits reset to full only at a fixed time each minute',
        'Cached input always counts fully toward ITPM on every model',
      ],
      answerKey: [0, 1],
      explanation:
        'A 429 carries retry-after, and limits are per model. max_tokens does not factor into OTPM (only generated ' +
        'tokens count), limits replenish continuously rather than on a fixed reset, and cached input does not count ' +
        'toward ITPM on most models, so those three are distractors.',
      misconceptionTag: 'rate-limit-properties',
      sourceUrls: [RATELIMITS],
    },
    {
      id: 'c5-u3-l2-q06',
      type: 'order',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these server-sent events for a single streamed text response, from first to last.',
      steps: [
        'message_start',
        'content_block_start',
        'content_block_delta',
        'content_block_stop',
        'message_stop',
      ],
      answerKey: [0, 1, 2, 3, 4],
      explanation:
        'A stream opens with message_start, then each content block runs content_block_start, one or more ' +
        'content_block_delta events, and content_block_stop, and the whole response ends with message_stop. ' +
        'Reordering these would break the block framing the SDKs rely on to accumulate the message.',
      misconceptionTag: 'sse-event-order',
      sourceUrls: [STREAM],
    },
    {
      id: 'c5-u3-l2-q07',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd5',
      conceptId: 'rate-limits-and-streaming',
      taskStatement: '5.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: setting a higher max_tokens increases your output-tokens-per-minute (OTPM) usage even if the extra tokens are never generated.',
      options: [
        'False, OTPM counts only the tokens actually generated, so max_tokens does not factor in',
        'True',
      ],
      answerKey: 0,
      explanation:
        'OTPM is evaluated on the output actually produced, so a generous max_tokens carries no rate-limit penalty by ' +
        'itself. Only real generated tokens count against the limit.',
      misconceptionTag: 'max-tokens-not-otpm',
      sourceUrls: [RATELIMITS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you keep hitting the input-tokens-per-minute limit resending the same big document. Why does prompt caching help, and what does the token bucket mean for a sudden burst of requests?',
    conceptId: 'rate-limits-and-streaming',
    keyPointIds: [
      'kp-rate-limits-and-streaming-1',
      'kp-rate-limits-and-streaming-2',
      'kp-rate-limits-and-streaming-3',
      'kp-rate-limits-and-streaming-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 210,
});
