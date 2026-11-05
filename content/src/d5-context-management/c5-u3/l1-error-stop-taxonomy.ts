// content/src/d5-context-management/c5-u3/l1-error-stop-taxonomy.ts
//
// C5-U3-L1 — stop_reason taxonomy and HTTP error taxonomy: retryable vs terminal, backoff, and
// Retry-After. Task statement 5.3 (structured error handling and propagation; retryable vs
// unresolvable). Every claim traces to the cited pages (verified 2026-07-14):
//   STOP   — "Handling stop reasons": end_turn, tool_use, max_tokens, stop_sequence, pause_turn,
//            refusal, model_context_window_exceeded and the action for each.
//   ERRORS — "Errors": 400 invalid_request_error, 401 authentication_error, 403 permission_error,
//            404 not_found_error, 413 request_too_large, 429 rate_limit_error, 500 api_error,
//            529 overloaded_error; SDKs auto-retry transient failures (429 and 5xx) with exponential
//            backoff, honoring the retry-after header; request_id for debugging.
//
// Confusion pair targeted: retryable (429, 5xx) vs terminal (4xx other than 429) errors, and
// pause_turn vs end_turn.
//
// Re-verified 2026-09-24: the stop-reasons page moved from /api/ to /build-with-claude/ (cited as the
// final URL); its table still lists end_turn, max_tokens, stop_sequence, tool_use, pause_turn, refusal
// ("Read stop_details and retry on a fallback model") and model_context_window_exceeded.

import { defineLesson } from '../../index';

const STOP = 'https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons';
const ERRORS = 'https://platform.claude.com/docs/en/api/errors';

export const l1ErrorStopTaxonomy = defineLesson({
  id: 'c5-u3-l1',
  title: 'Stop reasons and error taxonomy',
  order: 0,
  concept: {
    conceptId: 'error-and-stop-taxonomy',
    analogy:
      'Stop reasons and error codes are dashboard lights. Some mean "all done" or "do this next," some ' +
      'mean "pull over now and fix it" (terminal), and some mean "try again in a moment" (retryable). ' +
      'Reading the specific light tells you whether to retry, fix, or continue.',
    plainExplanation:
      'The stop_reason tells you why generation stopped: end_turn means done, tool_use means run the ' +
      'tool and continue, max_tokens means the output was truncated so raise it or continue, pause_turn ' +
      'means a server-tool loop paused so send the content back, and refusal means read stop_details. On ' +
      'the HTTP side, transient failures like 429 rate_limit_error, 500 api_error, and 529 ' +
      'overloaded_error are retryable with exponential backoff, honoring the retry-after header when ' +
      'present. Client errors like 400, 401, 403, and 404 are terminal: fix the request rather than ' +
      'retrying it. Every response carries a request_id for debugging.',
    examWords: [
      'stop_reason',
      'pause_turn',
      'refusal',
      '429 rate_limit_error',
      '529 overloaded_error',
      'retry-after',
      'exponential backoff',
    ],
    keyPoints: [
      { id: 'kp-error-and-stop-taxonomy-1', text: 'stop_reason reports why generation stopped: end_turn is done, tool_use means run a tool, and max_tokens means the output was truncated.' },
      { id: 'kp-error-and-stop-taxonomy-2', text: 'pause_turn means a server-tool loop paused, so send the assistant content back to continue; refusal means read stop_details.' },
      { id: 'kp-error-and-stop-taxonomy-3', text: 'Transient HTTP errors (429 rate_limit_error, 500 api_error, 529 overloaded_error) are retryable with exponential backoff, honoring the retry-after header.' },
      { id: 'kp-error-and-stop-taxonomy-4', text: 'Client errors like 400, 401, 403, and 404 are terminal: fix the request rather than retrying it.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u3-l1-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'A response comes back with stop_reason "max_tokens". What does that mean and what can you do?',
      options: [
        'The output hit your max_tokens limit and was truncated; raise max_tokens or continue the response',
        'The model finished naturally, so use the response as is',
        'The request was rejected before generation started',
        'A tool must be run before the model can respond',
      ],
      answerKey: 0,
      explanation:
        '"max_tokens" means generation was cut off at your limit, so you either raise the limit or continue. The ' +
        '"finished naturally" option describes end_turn, which is the trap of confusing a truncation with a clean ' +
        'completion.',
      misconceptionTag: 'max-tokens-truncation',
      sourceUrls: [STOP],
    },
    {
      id: 'c5-u3-l1-q02',
      type: 'mc',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You get stop_reason "pause_turn" while using a server tool like web search. What is the correct response?',
      options: [
        'Send the assistant content back unchanged to let the model continue the loop',
        'Treat it as a refusal and switch to a fallback model',
        'Discard the turn because an error occurred',
        'Raise max_tokens and resend the original user message',
      ],
      answerKey: 0,
      explanation:
        '"pause_turn" means a server-tool loop hit its iteration limit; sending the content back lets it finish. ' +
        'Treating it as a refusal is the trap: refusal is a different stop_reason with a different action (read ' +
        'stop_details).',
      misconceptionTag: 'pause-turn-continue',
      sourceUrls: [STOP],
    },
    {
      id: 'c5-u3-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your batch job starts receiving 429 rate_limit_error responses under load. What is the right handling?',
      options: [
        'Back off and retry with exponential backoff, honoring the retry-after header',
        'Immediately give up, since 429 is a terminal client error',
        'Retry instantly in a tight loop until it succeeds',
        'Rewrite the request body, since the input must be malformed',
      ],
      answerKey: 0,
      explanation:
        'A 429 is transient and retryable; backing off exponentially and honoring retry-after is the documented ' +
        'approach. Retrying instantly in a tight loop is the trap, since it ignores retry-after and worsens the ' +
        'rate-limit condition.',
      misconceptionTag: 'rate-limit-retryable',
      sourceUrls: [ERRORS],
    },
    {
      id: 'c5-u3-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A client wraps every request in a retry-with-backoff loop, including 400 invalid_request_error responses, and those requests just keep failing. What is the flaw?',
      options: [
        'A 400 is a terminal client error; retrying cannot help, you must fix the request',
        'A 400 is transient, so the backoff interval is simply too short',
        'The retry loop should honor retry-after on the 400 response',
        'The 400 will succeed once the rate limit resets',
      ],
      answerKey: 0,
      explanation:
        'Client errors like 400 mean the request itself is malformed, so no amount of retrying changes the outcome; ' +
        'you fix the request. Treating a 400 as transient is the trap, and it wastes calls on something backoff can ' +
        'never resolve.',
      misconceptionTag: 'terminal-vs-retryable',
      sourceUrls: [ERRORS],
    },
    {
      id: 'c5-u3-l1-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two HTTP responses are transient and worth retrying with backoff? Select TWO.',
      options: [
        '429 rate_limit_error',
        '529 overloaded_error',
        '401 authentication_error',
        '403 permission_error',
        '404 not_found_error',
      ],
      answerKey: [0, 1],
      explanation:
        '429 and 529 are transient capacity conditions the SDKs retry with exponential backoff. 401, 403, and 404 are ' +
        'client-side terminal errors about credentials, permission, or a missing resource, so retrying them is ' +
        'pointless.',
      misconceptionTag: 'terminal-vs-retryable',
      sourceUrls: [ERRORS],
    },
    {
      id: 'c5-u3-l1-q06',
      type: 'mc',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A response returns stop_reason "refusal". What is the recommended next step?',
      options: [
        'Read stop_details for the reason and consider retrying on a fallback model',
        'Immediately resend the identical request with a higher max_tokens',
        'Run whatever tool the model last requested',
        'Treat it as a successful completion and show the empty text',
      ],
      answerKey: 0,
      explanation:
        'A refusal means the model declined; you inspect stop_details and can retry on a fallback model or rephrase. ' +
        'Resending the identical request with more tokens is the trap, since the issue is the content, not the ' +
        'length.',
      misconceptionTag: 'refusal-handling',
      sourceUrls: [STOP],
    },
    {
      id: 'c5-u3-l1-q07',
      type: 'cloze',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: a ___ overloaded_error means the API is temporarily busy and is worth a backoff retry, while a ___ authentication_error means your key is bad and retrying will not help.',
      blanks: [
        { options: ['529', '400', '404'] },
        { options: ['401', '429', '500'] },
      ],
      answerKey: [0, 0],
      explanation:
        '529 is the transient overloaded error, and 401 is the terminal authentication error. The other codes name ' +
        'different conditions, so swapping them would mislabel which errors are retryable.',
      misconceptionTag: 'error-code-mapping',
      sourceUrls: [ERRORS],
    },
    {
      id: 'c5-u3-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: a 401 authentication_error should be retried with exponential backoff until it clears.',
      options: [
        'False, a 401 is a terminal client error; fix the API key instead of retrying',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Authentication errors are terminal: the credentials are wrong, so retrying changes nothing. Only transient ' +
        'errors like 429 and 5xx belong in a backoff-retry path.',
      misconceptionTag: 'terminal-vs-retryable',
      sourceUrls: [ERRORS],
    },
    {
      id: 'c5-u3-l1-q09',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'error-and-stop-taxonomy',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A batch job attaches large documents and starts receiving 413 request_too_large responses. A teammate proposes wrapping the call in an exponential-backoff retry loop. What is the correct handling?',
      options: [
        'Treat 413 as terminal and reduce the request size (trim or split the input) rather than retrying the same payload',
        'Retry with exponential backoff, since 413 is a transient capacity error like 429',
        'Honor the retry-after header on the 413 and resend the request unchanged',
        'Switch to a larger-context model, which removes the request byte limit',
      ],
      answerKey: 0,
      explanation:
        'A 413 means the request exceeds the maximum allowed bytes (32 MB on the Messages API), so it is a terminal ' +
        'client error: no retry of the same payload can succeed, and the fix is to shrink the request. Treating it ' +
        'like a 429 capacity error is the trap, because 413 is about the request itself, not temporary load. A ' +
        'larger context window does not change the request-size limit either.',
      misconceptionTag: 'request-too-large-terminal',
      sourceUrls: [ERRORS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your agent hits a 429 and, on another call, a 400. Which one do you retry with backoff and which do you fix, and how did you decide?',
    conceptId: 'error-and-stop-taxonomy',
    keyPointIds: [
      'kp-error-and-stop-taxonomy-1',
      'kp-error-and-stop-taxonomy-2',
      'kp-error-and-stop-taxonomy-3',
      'kp-error-and-stop-taxonomy-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 245,
});
