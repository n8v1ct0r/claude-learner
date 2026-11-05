// content/src/d4-prompt-engineering/c4-u3/l1-long-context-grounding.ts
//
// C4-U3-L1 — Long-context prompting and quote-first grounding. Task statement 4.1 (structure long
// inputs so the model attends to the right content). Claims trace to Anthropic's "Prompting best
// practices" (Long context prompting section), verified 2026-07-14.
//
// Confusion pair targeted: for long inputs, documents go at the TOP and the query at the bottom, and
// quote-extraction-first grounding cuts through document noise.

import { defineLesson } from '../../index';

const PBP = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices';
const LONG = `${PBP}#long-context-prompting`;

export const l1LongContextGrounding = defineLesson({
  id: 'c4-u3-l1',
  title: 'Long-context prompting and grounding',
  order: 0,
  concept: {
    conceptId: 'long-context-grounding',
    analogy:
      'With a giant briefing packet, put the documents on top and your question at the bottom, then ask ' +
      'Claude to underline the relevant lines first. It reads better when the data comes before the ask, and ' +
      'quoting first cuts through the noise.',
    plainExplanation:
      'For large inputs (20k or more tokens), place the long documents at the top of the prompt, above your ' +
      'query, instructions, and examples; putting the query at the end can improve response quality. Structure ' +
      'multiple documents with document, document_content, and source tags. For long-document tasks, ask ' +
      'Claude to pull the relevant quotes first and then answer using those quotes.',
    examWords: ['long context', 'longform data at the top', '<document> tags', 'quote extraction', '<quotes> tags'],
    keyPoints: [
      { id: 'kp-long-context-grounding-1', text: 'For large inputs (20k or more tokens), place long documents at the top of the prompt, above the query, instructions, and examples.' },
      { id: 'kp-long-context-grounding-2', text: 'Putting the query at the end can improve response quality, especially for complex multi-document inputs.' },
      { id: 'kp-long-context-grounding-3', text: 'Structure multiple documents with <document>, <document_content>, and <source> tags for clarity.' },
      { id: 'kp-long-context-grounding-4', text: 'Ask Claude to extract relevant quotes first, then answer based on those quotes, to cut through document noise.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u3-l1-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Where should you place a long 30k-token document relative to your question?',
      options: [
        'At the top of the prompt, above the query and instructions',
        'At the very end, after the question',
        'Split evenly around the question',
        'In the system prompt only',
      ],
      answerKey: 0,
      explanation:
        'Longform data belongs at the top, above the query and instructions, which improves performance across models. Splitting ' +
        'it or burying the document after the question works against that guidance.',
      misconceptionTag: 'docs-at-top',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Claude answers over a long contract but its claims sometimes drift from the text. Which prompting change grounds it?',
      options: [
        'Ask it to extract the relevant quotes first, then answer using those quotes',
        'Ask for a shorter answer',
        'Remove the document from the prompt',
        'Raise the temperature',
      ],
      answerKey: 0,
      explanation:
        'Quote-first grounding forces the answer to rest on specific text, which cuts drift. A shorter answer, no document, or ' +
        'more randomness would not tie the response to the source.',
      misconceptionTag: 'quote-grounding',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer places the user question first and pastes a 40k-token report after it, and quality is poor on multi-document questions. What does the guidance recommend?',
      options: [
        'Move the longform documents to the top, above the query',
        'Delete the document metadata',
        'Convert the report to markdown tables',
        'Lower max_tokens',
      ],
      answerKey: 0,
      explanation:
        'Long documents perform better placed above the query, and the query at the end can lift quality on complex inputs. ' +
        'Stripping metadata, reformatting, or cutting max_tokens does not fix the ordering problem.',
      misconceptionTag: 'docs-at-top',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q04',
      type: 'mc',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'How should multiple documents be structured in a long-context prompt?',
      options: [
        'Each wrapped in <document> tags with <document_content> and <source> subtags',
        'Concatenated into one undivided blob',
        'Encoded as a single JSON string',
        'Placed in an assistant prefill',
      ],
      answerKey: 0,
      explanation:
        'Wrapping each document with content and source subtags gives Claude clear boundaries and provenance. A single blob or ' +
        'opaque encoding loses the structure that helps the model navigate the documents.',
      misconceptionTag: 'document-tags',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q05',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You ask Claude to diagnose from patient records and want it to justify each conclusion from the text. Which pattern fits?',
      options: [
        'Have it place relevant quotes in <quotes> tags, then base the analysis on those quotes',
        'Ask it to summarize the records from memory',
        'Turn off thinking',
        'Add an assistant prefill',
      ],
      answerKey: 0,
      explanation:
        'Extracting quotes into tags and analyzing from them makes each conclusion traceable to the record. Summarizing from ' +
        'memory or toggling thinking does not create that grounding.',
      misconceptionTag: 'quote-grounding',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two improve long-context prompts? Select TWO.',
      options: [
        'Put longform data above the query',
        'Ask for quote extraction before the main task',
        'Bury the question in the middle of the documents',
        'Remove all document tags',
        'Keep the query before the documents',
      ],
      answerKey: [0, 1],
      explanation:
        'Documents above the query and quote-first grounding are the recommended moves. Burying the question, dropping tags, or ' +
        'leading with the query all reduce quality on long inputs.',
      misconceptionTag: 'docs-at-top',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q07',
      type: 'order',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order a long-document grounding prompt from first to last.',
      steps: [
        'Place the long documents at the top in <document> tags',
        'Below them, add your query and instructions',
        'Instruct Claude to first pull relevant quotes into <quotes> tags',
        'Then have it answer using only those quotes',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'Documents on top, then the query and instructions, then quote extraction, then the grounded answer. Leading with the ' +
        'query or answering before quoting undoes the structure that improves long-context results.',
      misconceptionTag: 'quote-grounding',
      sourceUrls: [LONG],
    },
    {
      id: 'c4-u3-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'long-context-grounding',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: for very long inputs you get better results putting your question at the top and the document at the bottom.',
      options: [
        'False, put the long document at the top and the query after it',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Long documents belong at the top with the query at the end; that ordering improves quality on complex multi-document inputs.',
      misconceptionTag: 'docs-at-top',
      sourceUrls: [LONG],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you are giving Claude a 50-page report and one question. How do you order the prompt and ground the answer so it does not drift from the text?',
    conceptId: 'long-context-grounding',
    keyPointIds: [
      'kp-long-context-grounding-1',
      'kp-long-context-grounding-2',
      'kp-long-context-grounding-3',
      'kp-long-context-grounding-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
