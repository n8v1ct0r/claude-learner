// content/src/d2-tool-design-mcp/c2-u1/l1-tool-anatomy.ts
//
// C2-U1-L1 — Tool definition anatomy. Task statement 2.1 (descriptions are THE tool-selection
// mechanism; include inputs, when-to-use boundaries; overlapping descriptions cause misrouting).
//
// Sources (verified 2026-07-14 against the cited pages):
//   DEFINE  — "Define tools": name/description/input_schema fields; "Provide extremely detailed
//             descriptions... by far the most important factor in tool performance"; namespacing;
//             consolidation.
//   OVERVIEW — "Tool use with Claude": Claude determines when to call a tool based on the tool's
//             description; input_schema defines expected parameters.
//
// Confusion pair targeted: the belief that the tool `name` (not the `description`) drives selection.

import { defineLesson } from '../../index';

const DEFINE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools';
const OVERVIEW = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview';

export const l1ToolAnatomy = defineLesson({
  id: 'c2-u1-l1',
  title: 'Tool definition anatomy',
  order: 0,
  concept: {
    conceptId: 'tool-definition',
    analogy:
      'A tool definition is like a job posting: the title (name) is a label, but the description is what ' +
      'tells the right candidate to apply. Claude reads the description to decide whether this tool fits ' +
      'the task, so a vague posting gets the wrong applicant.',
    plainExplanation:
      'Each tool you give Claude has three parts: a `name`, a `description`, and an `input_schema`. Claude ' +
      'decides which tool to call almost entirely from the descriptions, so the description is the tool-' +
      'selection lever. A strong description says what the tool does, when to use it and when not, and what ' +
      'each parameter means. The `input_schema` is a JSON Schema object that defines the expected parameters.',
    examWords: ['name', 'description', 'input_schema', 'JSON Schema', 'tool selection'],
    keyPoints: [
      { id: 'kp-tool-definition-1', text: 'A tool definition has three parts: a name, a description, and an input_schema.' },
      { id: 'kp-tool-definition-2', text: 'The description is by far the most important factor in tool performance, because Claude selects tools from their descriptions.' },
      { id: 'kp-tool-definition-3', text: 'A good description states what the tool does, when to use it and when not, and what each parameter means.' },
      { id: 'kp-tool-definition-4', text: 'The input_schema is a JSON Schema object that defines the tool\'s expected parameters.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u1-l1-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Several tools are available and you want Claude to reliably pick the right one. Which part of a tool definition does most of that steering?',
      options: [
        'The description, which explains what the tool does and when to use it',
        'The tool name on its own',
        'The order the tools appear in the array',
        'The number of parameters in the input_schema',
      ],
      answerKey: 0,
      explanation:
        'Claude decides which tool to call from the descriptions, so the description is by far the most important factor in tool performance. ' +
        'The name alone is a short label and array order carries no selection signal, so neither one fixes a tool Claude keeps skipping.',
      misconceptionTag: 'description-is-selection-lever',
      sourceUrls: [DEFINE, OVERVIEW],
    },
    {
      id: 'c2-u1-l1-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You are writing a get_stock_price tool. Which description will most reliably get it selected and called correctly?',
      options: [
        'A detailed description of what it returns, when to use it, and what the ticker parameter means',
        '"Gets the stock price for a ticker."',
        'A description that also re-lists three unrelated tools for context',
        'No description, since the name get_stock_price is self-explanatory',
      ],
      answerKey: 0,
      explanation:
        'The detailed description explains the behavior, the trigger, and the parameter, which is what Claude needs to call it correctly. ' +
        'The one-line version is too brief and leaves Claude guessing, and re-listing unrelated tools only adds noise that blurs selection.',
      misconceptionTag: 'detailed-description',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Two tools, search_orders and search_products, both carry the description "Search the database." Claude keeps calling the wrong one. What is the best fix?',
      options: [
        'Rewrite each description to state its specific purpose, inputs, and when to use it versus the other',
        'Add a third, more general search tool to catch the overflow',
        'Rename both tools to short random strings so they look distinct',
        'Set tool_choice to any so Claude is forced to call some tool',
      ],
      answerKey: 0,
      explanation:
        'Overlapping, identical descriptions give Claude no way to tell the tools apart, so making each description specific is the direct fix. ' +
        'Adding a third search tool worsens the ambiguity, and forcing a tool call with any does not tell Claude which of the two to choose.',
      misconceptionTag: 'overlapping-descriptions',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer ships a tool with a complete input_schema but writes its description as "does stuff with data." What is the core flaw?',
      options: [
        'The description gives Claude no basis to know what the tool does or when to call it',
        'A tool is not allowed to have a short description alongside an input_schema',
        'A tool cannot function unless it also defines input_examples',
        'The tool name must be identical to the description string',
      ],
      answerKey: 0,
      explanation:
        'A precise schema does not help selection: Claude reads the description to decide when to call the tool, and "does stuff with data" says nothing. ' +
        'Short descriptions are legal and input_examples are optional, so those are not the defect; the missing detail is.',
      misconceptionTag: 'description-is-selection-lever',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l1-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two details belong in a strong tool description? Select TWO.',
      options: [
        'What the tool does and when it should (and should not) be used',
        'What each parameter means and how it affects behavior',
        'The name of the internal database table it queries',
        'The sampling temperature the model should use',
      ],
      answerKey: [0, 1],
      explanation:
        'The purpose, the usage boundary, and the meaning of each parameter are exactly what help Claude choose and call the tool well. ' +
        'Internal table names and sampling settings are implementation and request details that do not help Claude decide when to use the tool.',
      misconceptionTag: 'detailed-description',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l1-q06',
      type: 'multi',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 3,
      stem: 'Your tool library is growing and Claude sometimes selects the wrong tool. Which three practices reduce selection ambiguity? Select THREE.',
      options: [
        'Give each tool a detailed, distinct description',
        'Use meaningful namespacing in tool names, such as github_list_prs',
        'Consolidate closely related operations into fewer, more capable tools',
        'Duplicate popular tools under several extra names',
        'Delete descriptions to save prompt tokens',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Distinct descriptions, service-prefixed names, and consolidation all make the boundaries between tools clearer for Claude. ' +
        'Duplicating tools multiplies overlapping choices, and removing descriptions strips away the exact signal Claude uses to select.',
      misconceptionTag: 'tool-consolidation',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l1-q07',
      type: 'cloze',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: a tool definition\'s ___ is a JSON Schema object for its parameters, while its ___ is the plaintext that tells Claude what the tool does and when to use it.',
      blanks: [
        { options: ['input_schema', 'description', 'name'] },
        { options: ['description', 'input_schema', 'tool_choice'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The input_schema types the parameters; the description drives selection by explaining behavior and usage. ' +
        'Swapping them would confuse the machine-readable contract with the human-readable guidance Claude reads to choose.',
      misconceptionTag: 'tool-fields',
      sourceUrls: [DEFINE],
    },
    {
      id: 'c2-u1-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'tool-definition',
      taskStatement: '2.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: the tool name matters more than the description for getting Claude to pick the right tool.',
      options: [
        'False, the description is the most important factor',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The description is by far the most important factor in tool performance. A clear name helps, but Claude selects from the descriptions.',
      misconceptionTag: 'description-is-selection-lever',
      sourceUrls: [DEFINE],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you have two tools that keep getting confused for each other. Which part of the tool definition do you fix first, and what do you put in it?',
    conceptId: 'tool-definition',
    keyPointIds: [
      'kp-tool-definition-1',
      'kp-tool-definition-2',
      'kp-tool-definition-3',
      'kp-tool-definition-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
