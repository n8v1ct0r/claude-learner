// content/src/d2-tool-design-mcp/c2-u1/l2-tool-use-loop.ts
//
// C2-U1-L2 — The tool-use loop. Task statement 2.1 (tool-use mechanics: request -> execute ->
// tool_result -> continue). Confusion pair: stop_reason "tool_use" vs "end_turn", and using
// assistant text (not stop_reason) as the completion signal.
//
// Sources (verified 2026-07-14 against the cited pages):
//   HOW      — "How tool use works": the client-tool loop keyed on stop_reason; while stop_reason
//              == "tool_use" execute and continue; exits on end_turn/max_tokens/stop_sequence/refusal.
//   HANDLE   — "Handle tool calls": tool_use blocks (id/name/input); tool_result blocks (tool_use_id/
//              content/is_error); tool_result blocks must come FIRST in the user message.
//   OVERVIEW — "Tool use with Claude": client tools run in your app; server tools run on Anthropic's
//              infrastructure and you never build tool_result blocks for them.

import { defineLesson } from '../../index';

const HOW = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works';
const HANDLE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls';
const OVERVIEW = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview';

export const l2ToolUseLoop = defineLesson({
  id: 'c2-u1-l2',
  title: 'The tool-use loop',
  order: 1,
  concept: {
    conceptId: 'tool-use-loop',
    analogy:
      'A client tool call is like ordering at a counter: Claude hands you a ticket (a tool_use request), ' +
      'you go make the order, and you bring the food back (a tool_result) so the conversation can move on. ' +
      'Claude never cooks the order itself; it only writes the ticket and waits for what you return.',
    plainExplanation:
      'For client tools, Claude responds with `stop_reason: "tool_use"` and one or more `tool_use` blocks; ' +
      'your application runs each tool and returns the output in a `tool_result` block inside a new user ' +
      'message, matched by `tool_use_id`. You keep looping while `stop_reason` is `"tool_use"`, and the loop ' +
      'exits on any other stop reason, most often `"end_turn"`. Client tools run in your application, while ' +
      'server tools run on Anthropic\'s infrastructure and you never build tool_result blocks for them.',
    examWords: ['stop_reason "tool_use"', 'tool_result', 'tool_use_id', 'stop_reason "end_turn"', 'client tools', 'server tools'],
    keyPoints: [
      { id: 'kp-tool-use-loop-1', text: 'For client tools, Claude returns stop_reason "tool_use" and one or more tool_use blocks, and your code executes the tool.' },
      { id: 'kp-tool-use-loop-2', text: 'You return each result in a tool_result block in a new user message, matched to its call by tool_use_id.' },
      { id: 'kp-tool-use-loop-3', text: 'You loop while stop_reason is "tool_use" and exit on any other stop reason, such as "end_turn".' },
      { id: 'kp-tool-use-loop-4', text: 'Client tools run in your application; server tools run on Anthropic\'s infrastructure and need no tool_result from you.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u1-l2-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'An assistant turn arrives with stop_reason "tool_use" and a single tool_use block. What is your application\'s next action?',
      options: [
        'Execute the requested tool and return its output in a tool_result block in a new user message',
        'Treat the turn as finished and show the assistant text to the user',
        'Raise max_tokens and resend the identical request',
        'Remove the tools array and try again without tools',
      ],
      answerKey: 0,
      explanation:
        'stop_reason "tool_use" is a request to run the tool and return a tool_result so Claude can continue. ' +
        'Treating it as finished belongs to "end_turn", and resending or dropping the tools array abandons the call Claude asked for.',
      misconceptionTag: 'tool-use-vs-end-turn',
      sourceUrls: [HOW, HANDLE],
    },
    {
      id: 'c2-u1-l2-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'When you send a tool output back to Claude, how do you tie it to the specific call it answers?',
      options: [
        'Put it in a tool_result block whose tool_use_id matches the tool_use block\'s id',
        'Include the tool name in a text block and let Claude match by name',
        'Send the result in a new system message',
        'Return the tools array in a different order to signal completion',
      ],
      answerKey: 0,
      explanation:
        'Each tool_result carries the tool_use_id from the matching tool_use block, which is how results are paired to calls. ' +
        'Matching by name or reordering the tools array is unreliable, and results never go in a system message.',
      misconceptionTag: 'tool-result-matching',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u1-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your agent loop stops as soon as the assistant produces any text, so it sometimes halts mid-task after a tool_use response that also included text. Which signal should control the loop?',
      options: [
        'Continue while stop_reason is "tool_use" and exit on "end_turn"',
        'Stop the moment any text block appears in the response',
        'Stop after a fixed number of characters of assistant text',
        'Stop whenever the response contains more than one content block',
      ],
      answerKey: 0,
      explanation:
        'The structured stop_reason drives the loop: keep going on "tool_use", finish on "end_turn". ' +
        'Assistant text can appear alongside a tool_use block, so treating any text as completion cuts the task off early.',
      misconceptionTag: 'text-as-completion',
      sourceUrls: [HOW],
    },
    {
      id: 'c2-u1-l2-q04',
      type: 'order',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order the steps of one client tool-use round trip, from first to last.',
      steps: [
        'Send a request with your tools array and the user message',
        'Claude responds with stop_reason "tool_use" and a tool_use block',
        'Execute the tool and format the output as a tool_result block',
        'Send a new request including the tool_result so Claude can continue',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'You send tools and the message, Claude requests a tool, you run it and format a tool_result, then you send it back to continue. ' +
        'Skipping the tool_result step leaves the tool_use unanswered and the loop cannot advance.',
      misconceptionTag: 'tool-use-loop-order',
      sourceUrls: [HOW],
    },
    {
      id: 'c2-u1-l2-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'An agent mixes a user-defined lookup tool with the web_search server tool. Choose the two accurate claims about where each one executes. Select TWO.',
      options: [
        'User-defined client tools execute in your application',
        'Server tools like web_search run on Anthropic\'s infrastructure',
        'You must construct a tool_result block for every server tool you enable',
        'The model executes your client tools on your behalf',
      ],
      answerKey: [0, 1],
      explanation:
        'Client tools run in your code and server tools run on Anthropic\'s infrastructure, where results come back without your handling. ' +
        'You never build tool_result blocks for server tools, and Claude only requests client tools rather than executing them.',
      misconceptionTag: 'client-vs-server-tools',
      sourceUrls: [OVERVIEW, HOW],
    },
    {
      id: 'c2-u1-l2-q06',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A turn called only client tools. How should you format the user message that returns their results?',
      options: [
        'Put the tool_result blocks first, before any text content in the message',
        'Write a plain-text paragraph summarizing the results instead of tool_result blocks',
        'Send the results as a system message so they are trusted',
        'Delete the assistant\'s tool_use blocks, then reply with text',
      ],
      answerKey: 0,
      explanation:
        'Tool_result blocks must come first in the user message, ahead of any text, or the request errors. ' +
        'Summaries and system messages do not satisfy the tool_use/tool_result pairing, and deleting the tool_use blocks breaks the history.',
      misconceptionTag: 'tool-result-formatting',
      sourceUrls: [HANDLE],
    },
    {
      id: 'c2-u1-l2-q07',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Your while loop runs "while stop_reason == tool_use". Which two stop reasons mean the loop should EXIT instead of running another tool? Select TWO.',
      options: [
        '"end_turn"',
        '"max_tokens"',
        '"tool_use"',
        'A tool_result block is present in the last message',
        'The response contains any assistant text',
      ],
      answerKey: [0, 1],
      explanation:
        'The loop continues only on "tool_use"; "end_turn" and "max_tokens" are other stop reasons that end it. ' +
        'A tool_result in history or the mere presence of text is not a stop reason, so neither should terminate the loop.',
      misconceptionTag: 'stop-reason-exit',
      sourceUrls: [HOW],
    },
    {
      id: 'c2-u1-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'tool-use-loop',
      taskStatement: '2.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: stop_reason "end_turn" means run the tool and continue the loop.',
      options: [
        'False, that describes "tool_use"; "end_turn" ends the loop',
        'True',
      ],
      answerKey: 0,
      explanation:
        '"end_turn" signals Claude finished naturally, so the loop stops. Running a tool and continuing is what "tool_use" asks for.',
      misconceptionTag: 'tool-use-vs-end-turn',
      sourceUrls: [HOW],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your response comes back with stop_reason "tool_use". Walk through what you do next and how you know when the loop is finally done.',
    conceptId: 'tool-use-loop',
    keyPointIds: [
      'kp-tool-use-loop-1',
      'kp-tool-use-loop-2',
      'kp-tool-use-loop-3',
      'kp-tool-use-loop-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
