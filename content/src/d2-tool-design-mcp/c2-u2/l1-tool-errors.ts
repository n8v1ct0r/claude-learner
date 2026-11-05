// content/src/d2-tool-design-mcp/c2-u2/l1-tool-errors.ts
//
// C2-U2-L1 — Structured tool error responses. Task statement 2.2 (is_error flag; actionable messages;
// retryable vs terminal; generic "failed" prevents recovery; strict tool use eliminates invalid calls).
// Confusion pair targeted: retryable (transient) vs terminal (business/validation) errors.
//
// Sources (verified 2026-07-14 against the cited pages):
//   HANDLE — "Handle tool calls": return an execution error in tool_result content with is_error: true;
//            "Write instructive error messages... include what went wrong and what Claude should try
//            next, e.g. Rate limit exceeded. Retry after 60 seconds"; invalid tool name handling.
//   STRICT — "Strict tool use": strict: true constrains inputs to be schema-valid, eliminating missing
//            parameters and type mismatches; it guarantees schema conformance, not semantic correctness.

import { defineLesson } from '../../index';

const HANDLE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls';
const STRICT = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use';

export const l1ToolErrors = defineLesson({
  id: 'c2-u2-l1',
  title: 'Structured tool errors',
  order: 0,
  concept: {
    conceptId: 'tool-errors',
    analogy:
      'A tool error is like a note a repair shop leaves on your car. "It broke" tells you nothing; "battery ' +
      'dead, jump-start and it runs" tells you exactly what to do next. The agent reads your error the same ' +
      'way, so the note has to say what went wrong and whether trying again will help.',
    plainExplanation:
      'When a client tool fails, return the error text in the `tool_result` content with `is_error: true`. ' +
      'Write instructive messages that say what went wrong and what to try next, not a generic "failed". ' +
      'Distinguish retryable failures (like a rate limit) from terminal ones (like a rejected business rule) ' +
      'so the agent can retry or stop. To prevent invalid calls in the first place, set `strict: true`, which ' +
      'constrains inputs to match your schema and eliminates missing or mistyped parameters.',
    examWords: ['is_error', 'tool_result', 'retryable', 'terminal', 'strict: true'],
    keyPoints: [
      { id: 'kp-tool-errors-1', text: 'Return a tool execution error in the tool_result content with is_error set to true.' },
      { id: 'kp-tool-errors-2', text: 'Write instructive error messages that say what went wrong and what to try next, not a generic "failed".' },
      { id: 'kp-tool-errors-3', text: 'Distinguish retryable errors (like a rate limit) from terminal ones so the agent can retry or stop.' },
      { id: 'kp-tool-errors-4', text: 'strict: true constrains tool inputs to match the JSON schema, eliminating missing-parameter and type errors.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u2-l1-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Your weather tool throws a network error while running. How should you report it back to Claude?',
      options: [
        'Return the error text in the tool_result content with is_error set to true',
        'Return empty content and hope Claude notices something is missing',
        'Abort the whole request so no result is sent',
        'Put the error in the system prompt for the next turn',
      ],
      answerKey: 0,
      explanation:
        'A tool execution error goes in the tool_result content with is_error: true, so Claude can incorporate it and adapt. ' +
        'Empty content looks like a valid empty result, aborting loses the turn, and errors do not belong in the system prompt.',
      misconceptionTag: 'is-error-usage',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u2-l1-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Which tool error message best helps Claude recover on its own?',
      options: [
        '"Rate limit exceeded. Retry after 60 seconds."',
        '"Operation failed."',
        '"Error."',
        '"ERR_500"',
      ],
      answerKey: 0,
      explanation:
        'The rate-limit message names the cause and the next action, giving Claude what it needs to recover without guessing. ' +
        'The other messages state that something broke but give no cause and no path forward, so Claude cannot adapt.',
      misconceptionTag: 'actionable-error',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u2-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A tool hits a transient timeout that usually clears on a second attempt. What should the error you return communicate so the agent behaves well?',
      options: [
        'That the failure is retryable, with a clear message so Claude can try again rather than give up',
        'A generic "failed" with no further detail',
        'That it is a permanent business-rule rejection',
        'An empty but successful result, hiding the timeout',
      ],
      answerKey: 0,
      explanation:
        'Signaling a retryable transient error lets the agent retry instead of abandoning the task. ' +
        'A generic message strips the recovery cue, calling it permanent stops a retry that would work, and a fake empty result masks the real state.',
      misconceptionTag: 'retryable-vs-terminal',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u2-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A tool returns "Operation failed" with is_error true for every problem, whether an invalid zip code or a service outage. Why does this hurt the agent?',
      options: [
        'Claude cannot tell a retryable outage from a permanent input error, so it cannot choose to retry or fix the input',
        'is_error should never be set to true on any result',
        'The message is far too long for a tool_result',
        'Tool errors are required to be valid JSON objects',
      ],
      answerKey: 0,
      explanation:
        'One opaque string collapses very different failures, leaving Claude no basis to retry the outage or correct the zip code. ' +
        'is_error is the right flag to set, the message is short, and free-text errors are allowed, so those are not the defect.',
      misconceptionTag: 'actionable-error',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u2-l1-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two practices make tool errors more recoverable for an agent? Select TWO.',
      options: [
        'State what went wrong and what to try next',
        'Distinguish retryable failures from terminal ones',
        'Return the same "failed" string for every error',
        'Hide the error and return an empty result',
      ],
      answerKey: [0, 1],
      explanation:
        'Actionable text and a retryable-versus-terminal signal are exactly what let an agent decide whether to retry or stop. ' +
        'A uniform "failed" string erases that signal, and a hidden error masquerades as a valid empty result.',
      misconceptionTag: 'recoverable-errors',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u2-l1-q06',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'You want to eliminate invalid tool calls, such as missing or mistyped parameters, before they reach your code. Which two statements about strict tool use are correct? Select TWO.',
      options: [
        'Setting strict: true constrains Claude\'s inputs to match your JSON schema exactly',
        'It prevents missing parameters and type mismatches',
        'It also guarantees the values Claude supplies are the semantically correct ones',
        'It removes the need to write a tool description',
      ],
      answerKey: [0, 1],
      explanation:
        'Strict mode grammar-constrains inputs so they are schema-valid, which removes missing-field and wrong-type errors. ' +
        'It does not judge whether a valid value is the right one, and the description is still what drives tool selection.',
      misconceptionTag: 'strict-schema-not-semantics',
      sourceUrls: [STRICT],
    },
    {
      id: 'c2-u2-l1-q07',
      type: 'cloze',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: set ___ on a tool_result to flag a failure, and set ___ on a tool definition to force inputs to match your JSON schema.',
      blanks: [
        { options: ['is_error: true', 'strict: true', 'tool_choice: any'] },
        { options: ['strict: true', 'is_error: true', 'disable_parallel_tool_use'] },
      ],
      answerKey: [0, 0],
      explanation:
        'is_error: true marks a failed tool_result; strict: true validates inputs against the schema. ' +
        'Swapping them confuses reporting a runtime failure with preventing malformed inputs.',
      misconceptionTag: 'is-error-vs-strict',
      sourceUrls: [HANDLE, STRICT],
    },
    {
      id: 'c2-u2-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'tool-errors',
      taskStatement: '2.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: "Operation failed" is a good tool error message because it is short.',
      options: [
        'False, an error message should say what went wrong and what to try next',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Brevity is not the goal; recoverability is. A useful error names the cause and the next action so Claude can adapt.',
      misconceptionTag: 'actionable-error',
      sourceUrls: [HANDLE],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a tool just failed with a timeout that a retry would probably fix. What do you put in the error you send back, and why does a bare "failed" fall short?',
    conceptId: 'tool-errors',
    keyPointIds: [
      'kp-tool-errors-1',
      'kp-tool-errors-2',
      'kp-tool-errors-3',
      'kp-tool-errors-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
