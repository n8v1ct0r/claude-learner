// content/src/d2-tool-design-mcp/c2-u2/l2-writing-tools.ts
//
// C2-U2-L2 — Writing tools for agents + choosing the right built-in tool. Task statements 2.1
// (consolidation, token-efficient high-signal responses, meaningful identifiers) and 2.5 (built-in
// tools: Grep = content search, Glob = filename/pattern, Read/Write full-file, Edit = targeted
// unique-anchor modification; incremental understanding Grep -> Read -> Edit).
//
// Sources (verified 2026-07-14 against the cited pages):
//   WTA      — "Writing tools for agents": consolidate related operations into fewer capable tools;
//              pagination/filtering/truncation with sensible defaults; response_format concise vs
//              detailed; natural-language identifiers over opaque UUIDs.
//   DEFINE   — "Define tools": design responses to return only high-signal information; semantic,
//              stable identifiers over opaque internal references; consolidation and namespacing.
//   CC_TOOLS — Claude Code "Tools reference": Grep "Searches for patterns in file contents"; Glob
//              "Finds files based on pattern matching"; Read "Reads the contents of files"; Write
//              "Creates or overwrites files"; Edit "Makes targeted edits" via a unique old_string.

import { defineLesson } from '../../index';

const WTA = 'https://www.anthropic.com/engineering/writing-tools-for-agents';
const DEFINE = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools';
const CC_TOOLS = 'https://code.claude.com/docs/en/tools-reference';

export const l2WritingTools = defineLesson({
  id: 'c2-u2-l2',
  title: 'Writing tools for agents',
  order: 1,
  concept: {
    conceptId: 'writing-tools-for-agents',
    analogy:
      'Building tools for an agent is like stocking a workshop for an apprentice: a few well-labeled, ' +
      'capable tools beat a wall of overlapping gadgets, and each should hand back just the part you need, ' +
      'not the whole warehouse inventory. And when a tool already exists for the job, you reach for that one.',
    plainExplanation:
      'Build fewer, more capable tools that consolidate related operations instead of wrapping every API ' +
      'endpoint, and return only high-signal, token-efficient results using pagination, filtering, and ' +
      'truncation with sensible defaults. Prefer meaningful identifiers over opaque UUIDs to reduce ' +
      'hallucination. When built-in tools already fit, pick the right one: `Grep` searches file contents, ' +
      '`Glob` finds files by name, `Read` and `Write` handle whole files, and `Edit` makes a targeted ' +
      'replacement of a unique string.',
    examWords: ['consolidation', 'pagination', 'response_format', 'high-signal', 'Grep', 'Glob', 'Edit'],
    keyPoints: [
      { id: 'kp-writing-tools-for-agents-1', text: 'Build fewer, more capable tools that consolidate related operations instead of wrapping every API endpoint.' },
      { id: 'kp-writing-tools-for-agents-2', text: 'Return high-signal, token-efficient results using pagination, filtering, and truncation with sensible defaults.' },
      { id: 'kp-writing-tools-for-agents-3', text: 'Prefer meaningful identifiers over opaque UUIDs to reduce hallucination.' },
      { id: 'kp-writing-tools-for-agents-4', text: 'Choose the right built-in tool: Grep searches file contents, Glob finds files by name, and Edit makes targeted string replacements.' },
    ],
  },
  exercises: [
    {
      id: 'c2-u2-l2-q01',
      type: 'mc',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Instead of separate list_users, list_events, and create_event tools, what does the guidance recommend?',
      options: [
        'Consolidate related operations into a single, more capable tool such as schedule_event',
        'Split each one into several even more granular tools',
        'Keep them all and remove their descriptions to save tokens',
        'Expose one tool per database column for maximum flexibility',
      ],
      answerKey: 0,
      explanation:
        'Fewer, more capable tools reduce selection ambiguity and are easier for the agent to navigate. ' +
        'More granular tools multiply overlapping choices, and stripping descriptions removes the signal Claude selects from.',
      misconceptionTag: 'tool-consolidation',
      sourceUrls: [WTA, DEFINE],
    },
    {
      id: 'c2-u2-l2-q02',
      type: 'mc',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A tool returns 5,000 raw rows and floods the context window on every call. What is the recommended fix?',
      options: [
        'Add pagination, filtering, and truncation with sensible defaults, returning only high-signal fields',
        'Return everything and let Claude decide what to ignore',
        'Return the rows twice so nothing is missed',
        'Drop the tool and ask the user to paste the data instead',
      ],
      answerKey: 0,
      explanation:
        'Token-efficient responses with paging, filtering, and sensible truncation keep only what Claude needs to reason. ' +
        'Returning everything wastes context and buries the signal, and duplicating rows makes the flood worse.',
      misconceptionTag: 'token-efficient-tools',
      sourceUrls: [WTA],
    },
    {
      id: 'c2-u2-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'In a large repository you want to find every line that calls processPayment. Which built-in Claude Code tool fits best?',
      options: [
        'Grep, which searches file contents for patterns',
        'Glob, which finds files by name pattern',
        'Read, which returns a single file\'s contents',
        'Write, which creates or overwrites files',
      ],
      answerKey: 0,
      explanation:
        'Grep searches inside files for a pattern, which is exactly finding lines that call processPayment. ' +
        'Glob only matches file names, Read opens one known file, and Write is for creating or overwriting, not searching.',
      misconceptionTag: 'grep-vs-glob',
      sourceUrls: [CC_TOOLS],
    },
    {
      id: 'c2-u2-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An agent needs to change one unique function signature in a file, but it calls Write to replace the whole file and loses unrelated edits. Which tool should it have used?',
      options: [
        'Edit, which makes a targeted replacement of a unique old_string',
        'Glob, to match the file by name first',
        'Grep, to search the file contents again',
        'A second Write call with even more of the file included',
      ],
      answerKey: 0,
      explanation:
        'Edit swaps one unique string in place, leaving the rest of the file untouched, which is what this change needed. ' +
        'Write overwrites the entire file, and Glob or Grep only locate things rather than modify them.',
      misconceptionTag: 'edit-vs-write',
      sourceUrls: [CC_TOOLS],
    },
    {
      id: 'c2-u2-l2-q05',
      type: 'multi',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two choices make a tool response friendlier to an agent\'s context budget? Select TWO.',
      options: [
        'Offer a response_format toggle for concise versus detailed output',
        'Return only the fields Claude needs for its next step',
        'Return every internal field for completeness',
        'Pad responses with extra opaque UUIDs for reference',
      ],
      answerKey: [0, 1],
      explanation:
        'A concise-versus-detailed toggle and returning only the needed fields both keep responses high-signal and small. ' +
        'Dumping every internal field or padding with opaque UUIDs wastes context and can increase hallucination.',
      misconceptionTag: 'token-efficient-tools',
      sourceUrls: [WTA],
    },
    {
      id: 'c2-u2-l2-q06',
      type: 'order',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these built-in tools for understanding and fixing part of an unfamiliar codebase incrementally, from first to last.',
      steps: [
        'Grep to find where the target function is called',
        'Read those files to trace how the code works',
        'Edit the specific line that needs to change',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'You search entry points with Grep, trace them by Reading the files, then make the change with a targeted Edit. ' +
        'Reading the whole repository up front or editing before you understand the call sites wastes effort and risks mistakes.',
      misconceptionTag: 'incremental-understanding',
      sourceUrls: [CC_TOOLS],
    },
    {
      id: 'c2-u2-l2-q07',
      type: 'mc',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'Your retrieval tool returns opaque alphanumeric UUIDs and Claude sometimes hallucinates references to them. Which change most improves precision?',
      options: [
        'Return semantically meaningful identifiers, such as slugs or names, instead of opaque UUIDs',
        'Return additional UUIDs so there is redundancy to cross-check',
        'Strip out all identifiers so Claude cannot cite anything',
        'Encode the UUIDs in base64 to make them shorter',
      ],
      answerKey: 0,
      explanation:
        'Resolving opaque UUIDs to meaningful, interpretable identifiers measurably reduces hallucination in retrieval. ' +
        'More UUIDs add noise, removing identifiers breaks attribution, and re-encoding keeps them just as meaningless.',
      misconceptionTag: 'meaningful-ids',
      sourceUrls: [WTA, DEFINE],
    },
    {
      id: 'c2-u2-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd2',
      conceptId: 'writing-tools-for-agents',
      taskStatement: '2.5',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: Glob searches the contents of files for a matching pattern.',
      options: [
        'False, Glob finds files by name; Grep searches file contents',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Glob matches file names by pattern. Searching inside files for a pattern is what Grep does.',
      misconceptionTag: 'grep-vs-glob',
      sourceUrls: [CC_TOOLS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a teammate is about to build one tool per API endpoint, each returning every field. What two changes would you suggest to make those tools work better for an agent?',
    conceptId: 'writing-tools-for-agents',
    keyPointIds: [
      'kp-writing-tools-for-agents-1',
      'kp-writing-tools-for-agents-2',
      'kp-writing-tools-for-agents-3',
      'kp-writing-tools-for-agents-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
