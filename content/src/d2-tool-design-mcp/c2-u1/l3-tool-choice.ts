// content/src/d2-tool-design-mcp/c2-u1/l3-tool-choice.ts
//
// C2-U1-L3 — tool_choice modes and parallel tool control. Task statement 2.3 (tool_choice auto/any/
// tool/none; "any" guarantees SOME tool call; force extract-first sequencing; disable_parallel_tool_use).
// Confusion pair targeted: tool_choice "any" (some tool) vs "tool" (a specific named tool).
//
// Sources (verified 2026-07-14 against the cited pages):
//   DEFINE   — "Define tools": the four tool_choice options; "any" = must use one of the provided
//              tools but does not force a particular one; "tool" = forces a specific tool; "none" =
//              prevents tool use; "auto" = Claude decides (default when tools are provided); with
//              "any"/"tool" the API prefills the turn so no leading natural-language text appears.
//   PARALLEL — "Parallel tool use": disable_parallel_tool_use limits Claude to at most one tool call
//              per turn.

import { defineLesson } from '../../index';

const DEFINE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools';
const PARALLEL = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use';

export const l3ToolChoice = defineLesson({
  id: 'c2-u1-l3',
  title: 'tool_choice and parallel calls',
  order: 2,
  concept: {
    conceptId: 'tool-choice',
    analogy:
      'tool_choice is like giving directions to a driver. "auto" says "use your judgment"; "any" says ' +
      '"you must turn somewhere, but pick the turn"; "tool" names the exact street to take; and "none" ' +
      'says "do not turn at all." Naming the street ("tool") is different from just requiring a turn ("any").',
    plainExplanation:
      'The `tool_choice` field controls whether and which tool Claude calls. `"auto"` lets Claude decide and ' +
      'is the default when tools are provided. `"any"` forces Claude to call one of the provided tools but ' +
      'does not pick which. `{"type":"tool","name":...}` forces one specific named tool, and `"none"` blocks ' +
      'tool use. With `"any"` or `"tool"`, the API prefills the turn, so Claude emits no leading natural-' +
      'language text. Set `disable_parallel_tool_use: true` to allow at most one tool call per turn.',
    examWords: ['tool_choice "auto"', 'tool_choice "any"', 'tool_choice "tool"', 'tool_choice "none"', 'disable_parallel_tool_use'],
    keyPoints: [
      { id: 'kp-tool-choice-1', text: 'tool_choice "auto" lets Claude decide whether to call a tool and is the default when tools are provided.' },
      { id: 'kp-tool-choice-2', text: 'tool_choice "any" forces Claude to call one of the provided tools but does not force a particular one.' },
      { id: 'kp-tool-choice-3', text: 'tool_choice {"type":"tool","name":...} forces one specific named tool, and "none" prevents tool use.' },
      { id: 'kp-tool-choice-4', text: 'disable_parallel_tool_use: true limits Claude to at most one tool call per turn.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u1-l3-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does tool_choice "auto" do, and when is it in effect?',
      options: [
        'It lets Claude decide whether to call a tool, and it is the default when tools are provided',
        'It forces Claude to call one of the tools on every turn',
        'It blocks all tool use unless you name a tool',
        'It is only available when exactly one tool is defined',
      ],
      answerKey: 0,
      explanation:
        '"auto" leaves the decision to Claude and is the default whenever you pass tools. ' +
        'Forcing a call is what "any" does, and blocking tools is "none", so neither describes the default behavior.',
      misconceptionTag: 'tool-choice-auto',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l3-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You need Claude to call some tool on this turn rather than reply with plain text, but you do not care which tool. Which tool_choice fits?',
      options: [
        'tool_choice "any"',
        'tool_choice "auto"',
        'tool_choice {"type":"tool","name":...}',
        'tool_choice "none"',
      ],
      answerKey: 0,
      explanation:
        '"any" guarantees a tool call while leaving the choice of tool to Claude, which is exactly the requirement. ' +
        '"auto" might answer with text, forcing a specific tool over-constrains it, and "none" blocks tools entirely.',
      misconceptionTag: 'any-vs-tool',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An extraction pipeline must always call your extract_fields tool first, before Claude does anything else. Which setting guarantees that specific tool is the one called?',
      options: [
        'tool_choice {"type":"tool","name":"extract_fields"}',
        'tool_choice "any"',
        'tool_choice "auto" with a polite instruction in the prompt',
        'tool_choice "none"',
      ],
      answerKey: 0,
      explanation:
        'Forcing the named tool with {"type":"tool","name":"extract_fields"} is the only setting that guarantees that exact tool runs first. ' +
        '"any" forces some tool but could pick a different one, and "auto" relies on prompting that has a non-zero failure rate.',
      misconceptionTag: 'any-vs-tool',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A team sets tool_choice "any" expecting Claude to always call their validate tool, but it sometimes calls a different tool instead. What is the misunderstanding?',
      options: [
        '"any" forces some tool but not a particular one; use {"type":"tool","name":"validate"} to force that tool',
        '"any" is invalid JSON and should be "automatic"',
        '"any" silently disables every tool after the first call',
        '"any" only works when there is exactly one tool defined',
      ],
      answerKey: 0,
      explanation:
        '"any" only guarantees that Claude calls one of the provided tools, not which one, so a specific tool needs the "tool" form. ' +
        'The option is valid and does not disable tools; the gap is expecting "any" to pin a particular tool.',
      misconceptionTag: 'any-vs-tool',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l3-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two things are true when tool_choice is "any" or a specific "tool"? Select TWO.',
      options: [
        'Claude must use a tool rather than answer with plain text',
        'The API prefills the turn, so Claude emits no leading natural-language explanation',
        'Claude may still choose to respond with only text',
        'These are the default values when tools are provided',
      ],
      answerKey: [0, 1],
      explanation:
        'Both forced modes require a tool call and prefill the assistant turn, which suppresses any leading prose. ' +
        'Responding with only text is what "auto" permits, and "auto" (not the forced modes) is the default.',
      misconceptionTag: 'forced-tool-behavior',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l3-q06',
      type: 'cloze',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: tool_choice ___ prevents Claude from using any tool, while ___ forces it to call one of the provided tools without specifying which.',
      blanks: [
        { options: ['"none"', '"any"', '"auto"'] },
        { options: ['"any"', '"tool"', '"auto"'] },
      ],
      answerKey: [0, 0],
      explanation:
        '"none" blocks tool use; "any" requires a tool call but leaves the choice to Claude. ' +
        'Swapping them would either force a call you meant to prevent or fail to require the call you wanted.',
      misconceptionTag: 'tool-choice-modes',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l3-q07',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You want Claude to make at most one tool call per turn instead of several at once. What do you set?',
      options: [
        'disable_parallel_tool_use: true',
        'tool_choice "none"',
        'max_tokens set to 1',
        'Define only one tool and remove the rest',
      ],
      answerKey: 0,
      explanation:
        'disable_parallel_tool_use: true caps Claude at a single tool call per turn while keeping all tools available. ' +
        '"none" blocks tools entirely, a tiny max_tokens breaks the response, and deleting tools removes capability you still need.',
      misconceptionTag: 'parallel-control',
      sourceUrls: [PARALLEL],
    },
    {
      id: 'c2-u1-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'tool-choice',
      taskStatement: '2.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: tool_choice "any" lets you force Claude to call one specific named tool.',
      options: [
        'False, use {"type":"tool","name":...} for a specific tool; "any" only forces some tool',
        'True',
      ],
      answerKey: 0,
      explanation:
        '"any" guarantees a tool call but not which tool. Pinning a specific tool requires the {"type":"tool","name":...} form.',
      misconceptionTag: 'any-vs-tool',
      sourceUrls: [DEFINE],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: what is the difference between tool_choice "any" and tool_choice "tool", and when would you reach for each?',
    conceptId: 'tool-choice',
    keyPointIds: [
      'kp-tool-choice-1',
      'kp-tool-choice-2',
      'kp-tool-choice-3',
      'kp-tool-choice-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
