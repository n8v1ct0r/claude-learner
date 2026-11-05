// content/src/d1-agentic-architecture/c1-u1/l3-agentic-loop.ts
//
// C1-U1-L3 — The agentic loop (gather/act/observe/decide) and stop conditions. Task statement 1.1
// (stop_reason lifecycle; model-driven decisions; anti-patterns: parsing NL for termination,
// arbitrary iteration caps as the primary stop, assistant text as a completion signal).
//
// Sources (verified 2026-07-14 against the cited pages):
//   BEA   — "Building effective agents": the loop, ground truth from the environment, stopping conditions.
//   TOOL  — Tool use overview: stop_reason "tool_use" -> run tool -> return tool_result in a user message.
//   STOP  — Handling stop reasons: "end_turn" = finished naturally; "tool_use" = run the tool and return
//           the result; continuation is a user message of tool_result blocks with the same tools array.
//
// Confusion pair targeted: stop_reason "tool_use" vs "end_turn" — and deciding completion by scanning the
// model's natural-language text instead of the stop_reason. Intentional variantOf sibling pair for dupe
// calibration: q04 (base) ~ q05 (harder framing).
//
// Source note (2026-09-24): the named anti-patterns in q05 and q07 ("parsing natural language signals
// to determine loop termination, setting arbitrary iteration caps as the primary stopping mechanism,
// or checking for assistant text content as a completion indicator") are stated by the public CCA-F
// Exam Guide v1.0, task 1.1, not by the two docs pages, so those items cite the guide as well. Its S3
// path carries a timestamp-like segment and may change on re-upload.

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';
const TOOL = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview';
const STOP = 'https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons';
const EXAM_GUIDE =
  'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf';

export const l3AgenticLoop = defineLesson({
  id: 'c1-u1-l3',
  title: 'The agentic loop and stop conditions',
  order: 2,
  concept: {
    conceptId: 'agentic-loop',
    analogy:
      'An agent works like a chef tasting as they cook: take an action (add salt), taste the result ' +
      '(observe ground truth), decide the next move, and repeat until the dish is right, then stop. The ' +
      'tasting is the ground truth the environment gives back.',
    plainExplanation:
      'In the agentic loop the model acts, gets ground truth from the environment (a tool result or code ' +
      'output), and decides the next step, repeating until the task is done. In the API this shows up as ' +
      'stop_reason "tool_use": you run the tool, return a tool_result in a user message, and continue. When ' +
      'Claude answers naturally you get stop_reason "end_turn". Because agents can run long, it is common to ' +
      'add stopping conditions such as a maximum number of iterations.',
    examWords: ['agentic loop', 'ground truth', 'stop_reason "tool_use"', 'tool_result', 'stop_reason "end_turn"', 'stopping conditions'],
    keyPoints: [
      { id: 'kp-agentic-loop-1', text: 'The agentic loop is: act, observe ground truth from the environment, decide, and repeat.' },
      { id: 'kp-agentic-loop-2', text: 'stop_reason "tool_use" means run the tool and return a tool_result in a new user message to continue.' },
      { id: 'kp-agentic-loop-3', text: 'stop_reason "end_turn" means Claude finished naturally, so the loop ends.' },
      { id: 'kp-agentic-loop-4', text: 'Add stopping conditions such as a maximum number of iterations to keep control.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u1-l3-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'In the agentic loop, what does the agent do right after taking an action?',
      options: [
        'Observe ground truth from the environment, such as a tool result, then decide the next step',
        'Immediately stop and return the first action it took',
        'Ask the user to approve every token before continuing',
        'Discard the result and restart the task from scratch',
      ],
      answerKey: 0,
      explanation:
        'Each step gains ground truth from the environment (a tool result or code output) so the agent can assess ' +
        'progress and decide what to do next. Stopping after the first action throws away the feedback the loop exists ' +
        'to use.',
      misconceptionTag: 'agentic-loop-steps',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l3-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Your Messages API response comes back with stop_reason "tool_use". What is the correct next step?',
      options: [
        'Execute the requested tool and send its output back in a tool_result block in a new user message',
        'Treat the turn as finished and show the assistant text to the user',
        'Raise max_tokens and resend the identical request',
        'Stop the agent because an error must have occurred',
      ],
      answerKey: 0,
      explanation:
        'stop_reason "tool_use" is a request to run the tool and return a tool_result so the model can continue. ' +
        'Treating it as finished is the trap: that behavior belongs to "end_turn", not "tool_use".',
      misconceptionTag: 'tool-use-vs-end-turn',
      sourceUrls: [TOOL, STOP],
    },
    {
      id: 'c1-u1-l3-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A tool-using loop never stops. Instead of checking stop_reason, it scans the assistant\'s text for the word "done" to decide when to finish. What is the core flaw?',
      options: [
        'Termination should key off stop_reason "end_turn", not natural-language parsing of the model\'s text',
        'The loop should simply never terminate on its own',
        'The model must be fine-tuned so it always writes "done"',
        'tool_result blocks have to be removed to end the loop',
      ],
      answerKey: 0,
      explanation:
        'Completion is signaled by stop_reason "end_turn"; scanning free text for a keyword is brittle and unreliable. ' +
        'The "never terminate" answer is the trap: the loop absolutely should end, just on the structured signal, not ' +
        'on prose.',
      misconceptionTag: 'nl-termination',
      sourceUrls: [STOP],
    },
    {
      id: 'c1-u1-l3-q04',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You are building an agent loop and want it to stop cleanly once Claude has answered the user without calling another tool. Which signal should end the loop?',
      options: [
        'stop_reason "end_turn"',
        'stop_reason "tool_use"',
        'The presence of any assistant text in the response',
        'A fixed sleep timer between turns',
      ],
      answerKey: 0,
      explanation:
        'Natural completion is exactly what stop_reason "end_turn" reports, so it is the signal to end the loop. Choosing ' +
        '"tool_use" is the trap: that value means the opposite, that the model wants to call a tool and continue.',
      misconceptionTag: 'tool-use-vs-end-turn',
      sourceUrls: [STOP],
    },
    {
      id: 'c1-u1-l3-q05',
      type: 'mc',
      variant: 'scenario',
      variantOf: 'c1-u1-l3-q04',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'You are building an agent loop and want it to stop cleanly once Claude has answered the user without calling another tool, while still capping runaway runs. Which signal should end the loop under normal completion?',
      options: [
        'stop_reason "end_turn", with a maximum-iteration cap as a separate safety net',
        'stop_reason "tool_use", since a tool call means the answer is ready',
        'The iteration cap alone, treating every run as if it hits the limit',
        'Any assistant text, ending as soon as the model writes anything',
      ],
      answerKey: 0,
      explanation:
        'Normal completion is "end_turn"; the iteration cap is a separate safety net, not the primary stop. Using the cap ' +
        'alone is the tempting distractor because a cap sounds safe, but it would cut off healthy runs and never detect ' +
        'true completion.',
      misconceptionTag: 'iteration-cap-as-primary-stop',
      sourceUrls: [STOP, BEA, EXAM_GUIDE],
    },
    {
      id: 'c1-u1-l3-q06',
      type: 'mc',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Besides natural completion, why add a maximum-iteration stopping condition to an agent?',
      options: [
        'To maintain control and prevent runaway loops, since agents trade cost and latency for autonomy',
        'Because agents cannot detect stop_reason "end_turn"',
        'Because tool_result blocks are optional and often skipped',
        'To force the model to never call any tool',
      ],
      answerKey: 0,
      explanation:
        'A max-iteration cap is a control mechanism against runaway loops and their compounding cost. The "cannot detect ' +
        'end_turn" answer is false: end_turn is the normal completion signal, and the cap is only a backstop.',
      misconceptionTag: 'stopping-conditions',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l3-q07',
      type: 'multi',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are anti-patterns for deciding when an agent loop should stop? Select TWO.',
      options: [
        'Parsing the assistant\'s natural-language text for a "finished" phrase',
        'Using an arbitrary iteration cap as the only signal of completion',
        'Ending the loop on stop_reason "end_turn"',
        'Running the tool when stop_reason is "tool_use"',
        'Returning a tool_result in a new user message to continue',
      ],
      answerKey: [0, 1],
      explanation:
        'Scanning prose for a keyword and treating a fixed cap as the sole completion signal are both unreliable stops. ' +
        'The other three options are the correct, structured way to run and end the loop.',
      misconceptionTag: 'nl-termination',
      sourceUrls: [STOP, BEA, EXAM_GUIDE],
    },
    {
      id: 'c1-u1-l3-q08',
      type: 'multi',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'An agent gets stop_reason "tool_use". Which two actions correctly continue the loop? Select TWO.',
      options: [
        'Execute the requested tool',
        'Append a user message containing only tool_result blocks, keeping the same tools array',
        'Show the partial text to the user and stop the loop',
        'Raise max_tokens and resend the request unchanged',
        'Delete the assistant\'s tool_use block before continuing',
      ],
      answerKey: [0, 1],
      explanation:
        'You run the tool, then continue with a user message of tool_result blocks (nothing else) while keeping the same ' +
        'tools array. Stopping, resending, or deleting the tool_use block all break the loop\'s required structure.',
      misconceptionTag: 'tool-result-continuation',
      sourceUrls: [STOP, TOOL],
    },
    {
      id: 'c1-u1-l3-q09',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: when stop_reason is ___ you run the tool and return a tool_result, and when it is ___ the loop ends because Claude finished naturally.',
      blanks: [
        { options: ['"tool_use"', '"end_turn"', '"max_tokens"'] },
        { options: ['"end_turn"', '"tool_use"', '"refusal"'] },
      ],
      answerKey: [0, 0],
      explanation:
        '"tool_use" asks you to run the tool and return a tool_result; "end_turn" means Claude finished naturally and the ' +
        'loop ends. Swapping them would either stop mid-task or loop forever.',
      misconceptionTag: 'tool-use-vs-end-turn',
      sourceUrls: [STOP],
    },
    {
      id: 'c1-u1-l3-q10',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'agentic-loop',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: you should decide an agent is finished by searching its reply text for the word "done".',
      options: [
        'False, key off stop_reason "end_turn" instead',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Completion is a structured signal, stop_reason "end_turn", not a keyword in prose. Text parsing is brittle and ' +
        'misfires on wording the model did not intend as a stop.',
      misconceptionTag: 'nl-termination',
      sourceUrls: [STOP],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your loop just got stop_reason "tool_use". What do you do next, and how is that different from getting "end_turn"?',
    conceptId: 'agentic-loop',
    keyPointIds: [
      'kp-agentic-loop-1',
      'kp-agentic-loop-2',
      'kp-agentic-loop-3',
      'kp-agentic-loop-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 265,
});
