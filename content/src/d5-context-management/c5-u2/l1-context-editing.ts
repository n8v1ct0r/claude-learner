// content/src/d5-context-management/c5-u2/l1-context-editing.ts
//
// C5-U2-L1 — Context editing: clear_tool_uses, its trigger/keep/clear_at_least config, and its
// interaction with prompt caching. Task statement 5.1 (managing long tool-heavy interactions).
// Beta feature => every question carries volatile: true (style guide). Every claim traces to the
// cited page (verified 2026-07-14):
//   CTXEDIT — "Context editing": clear_tool_uses_20250919 clears older tool results past a token
//             trigger and inserts a placeholder; trigger defaults to 100,000 input tokens; keep
//             defaults to 3 tool uses; exclude_tools and clear_tool_inputs; clearing invalidates the
//             cache prefix, so use clear_at_least to make it worthwhile; beta header
//             context-management-2025-06-27.
//
// Confusion pair targeted: context editing removes stale tool results but leaves a placeholder, and
// clearing interacts with the cache, so you clear enough to be worth breaking it.

import { defineLesson } from '../../index';

const CTXEDIT = 'https://platform.claude.com/docs/en/build-with-claude/context-editing';

export const l1ContextEditing = defineLesson({
  id: 'c5-u2-l1',
  title: 'Context editing',
  order: 0,
  concept: {
    conceptId: 'context-editing',
    analogy:
      'Context editing is a busboy clearing finished plates. Once the model has digested an old tool ' +
      'result, the busboy takes the plate away and leaves a note saying "cleared," keeping the most ' +
      'recent dishes on the table so the meal can continue.',
    plainExplanation:
      'The clear_tool_uses strategy automatically clears older tool results once the conversation grows ' +
      'past a configured trigger, replacing each cleared result with placeholder text so the model knows ' +
      'it was removed. The trigger defaults to 100,000 input tokens and keep defaults to the 3 most recent ' +
      'tool uses. You can protect specific tools with exclude_tools, and also clear the original tool calls ' +
      'with clear_tool_inputs. Clearing invalidates the cached prefix, so use clear_at_least to ensure ' +
      'enough tokens are cleared to make breaking the cache worthwhile. It is a beta feature.',
    examWords: [
      'clear_tool_uses_20250919',
      'trigger',
      'keep',
      'clear_at_least',
      'exclude_tools',
    ],
    snippet: {
      language: 'json',
      code: '"context_management": { "edits": [ { "type": "clear_tool_uses_20250919" } ] }',
    },
    keyPoints: [
      { id: 'kp-context-editing-1', text: 'Context editing clears older tool results once context passes a configured trigger, replacing each with a placeholder so the model knows it was removed.' },
      { id: 'kp-context-editing-2', text: 'The trigger defaults to 100,000 input tokens and keep defaults to the 3 most recent tool uses.' },
      { id: 'kp-context-editing-3', text: 'exclude_tools protects specific tools from clearing, and clear_tool_inputs also removes the original tool calls.' },
      { id: 'kp-context-editing-4', text: 'Clearing invalidates the cached prefix, so use clear_at_least to clear enough tokens to make breaking the cache worthwhile.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u2-l1-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'What does the clear_tool_uses context-editing strategy do?',
      options: [
        'Clears older tool results once context passes a threshold, leaving a placeholder for each',
        'Deletes the entire conversation history and starts over',
        'Compresses the model weights to fit a smaller device',
        'Prevents the model from ever calling a tool again',
      ],
      answerKey: 0,
      explanation:
        'It removes the oldest tool results after the trigger is reached and replaces each with placeholder text so ' +
        'the model knows content was cleared. The "deletes the entire history" option is the trap: only older tool ' +
        'results are cleared, and recent ones are kept.',
      misconceptionTag: 'context-editing-clears-tool-results',
      sourceUrls: [CTXEDIT],
    },
    {
      id: 'c5-u2-l1-q02',
      type: 'mc',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'With default settings, when does clear_tool_uses begin clearing, and what does it preserve?',
      options: [
        'It triggers at 100,000 input tokens and keeps the 3 most recent tool uses',
        'It triggers on the first tool call and keeps nothing',
        'It triggers at 1,000 output tokens and keeps the oldest tool uses',
        'It never triggers automatically and must be called manually each turn',
      ],
      answerKey: 0,
      explanation:
        'The default trigger is 100,000 input tokens, and keep defaults to the 3 most recent tool uses, so it clears ' +
        'oldest-first while preserving recent context. The "keeps the oldest" option inverts the behavior, which is ' +
        'the trap.',
      misconceptionTag: 'context-editing-defaults',
      sourceUrls: [CTXEDIT],
    },
    {
      id: 'c5-u2-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'An agent does heavy web-search tool calls, and the accumulated search results are filling the window even though only the recent ones still matter. Which built-in strategy fits best?',
      options: [
        'Context editing with clear_tool_uses, which clears older tool results and keeps recent ones',
        'Lowering max_tokens so responses are shorter',
        'Disabling the search tool after the first call',
        'Switching to a non-streaming request',
      ],
      answerKey: 0,
      explanation:
        'Clearing stale tool results is exactly what clear_tool_uses is for in tool-heavy agentic workflows. Lowering ' +
        'max_tokens shrinks output, not the accumulated input, and disabling the tool removes a needed capability, ' +
        'so both are traps.',
      misconceptionTag: 'context-editing-clears-tool-results',
      sourceUrls: [CTXEDIT],
    },
    {
      id: 'c5-u2-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'A team enables clear_tool_uses on a heavily cached prompt, and it fires often but clears only a few hundred tokens each time, hurting performance. What setting addresses this?',
      options: [
        'Set clear_at_least so each clearing frees enough tokens to justify breaking the cache',
        'Set keep to zero so nothing is ever preserved',
        'Remove the cache breakpoints so caching is disabled entirely',
        'Lower the trigger to 1,000 tokens so it clears constantly',
      ],
      answerKey: 0,
      explanation:
        'Each clearing invalidates the cached prefix, so tiny clears waste cache writes; clear_at_least guarantees a ' +
        'minimum is freed to make the invalidation worthwhile. Disabling caching entirely throws away the savings ' +
        'you are trying to protect, which is the over-correction trap.',
      misconceptionTag: 'context-editing-cache-interaction',
      sourceUrls: [CTXEDIT],
    },
    {
      id: 'c5-u2-l1-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      selectCount: 2,
      stem: 'Which two options let you control what context editing clears? Select TWO.',
      options: [
        'exclude_tools, to protect specific tools from being cleared',
        'keep, to set how many recent tool uses are preserved',
        'temperature, to reduce how much text is cleared',
        'max_tokens, to cap what the editor removes',
        'stop_sequences, to mark where clearing stops',
      ],
      answerKey: [0, 1],
      explanation:
        'exclude_tools shields chosen tools and keep sets how many recent tool uses survive, so together they shape ' +
        'what is cleared. Temperature, max_tokens, and stop_sequences govern generation, not context editing, so ' +
        'they are distractors.',
      misconceptionTag: 'context-editing-controls',
      sourceUrls: [CTXEDIT],
    },
    {
      id: 'c5-u2-l1-q06',
      type: 'cloze',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'Fill the blanks: by default context editing starts clearing at ___ input tokens and preserves the ___ most recent tool uses.',
      blanks: [
        { options: ['100,000', '1,000', '10'] },
        { options: ['3', '0', '50'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The default trigger is 100,000 input tokens and keep defaults to 3 tool uses. The smaller numbers describe ' +
        'settings you could choose, but they are not the documented defaults.',
      misconceptionTag: 'context-editing-defaults',
      sourceUrls: [CTXEDIT],
    },
    {
      id: 'c5-u2-l1-q07',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd5',
      conceptId: 'context-editing',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 10,
      volatile: true,
      stem: 'True or false: when context editing clears a tool result, it disappears with no indication it was ever there.',
      options: [
        'False, each cleared result is replaced with placeholder text so the model knows it was removed',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The strategy leaves a placeholder in place of each cleared result, so the model can tell content was removed ' +
        'rather than silently vanishing.',
      misconceptionTag: 'context-editing-placeholder',
      sourceUrls: [CTXEDIT],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your tool-heavy agent keeps filling the window with old search results. How would context editing help, and why do we set clear_at_least when caching is on?',
    conceptId: 'context-editing',
    keyPointIds: [
      'kp-context-editing-1',
      'kp-context-editing-2',
      'kp-context-editing-3',
      'kp-context-editing-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 210,
});
