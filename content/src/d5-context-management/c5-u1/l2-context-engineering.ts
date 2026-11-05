// content/src/d5-context-management/c5-u1/l2-context-engineering.ts
//
// C5-U1-L2 — Context engineering: the smallest high-signal set; prune, summarize, delegate. Task
// statements 5.1 (curate high-signal context; trim verbose tool results; subagents return structured
// data) and 5.4 (large-codebase: subagent delegation isolates verbose exploration). Every claim
// traces to the cited page (verified 2026-07-14):
//   CTXENG — "Effective context engineering for AI agents": smallest set of high-signal tokens, the
//            attention budget, compaction, structured note-taking, sub-agent architectures, and
//            just-in-time retrieval.
//   CTXWIN — "Context windows": relevance beats volume.
//   BESTPRAC — "Prompting best practices": put longform data at the top of the prompt, above the
//            query and instructions; queries at the end can improve response quality by up to 30% in
//            tests, especially with complex, multi-document inputs (the lost-in-the-middle position
//            effect).
//
// Confusion pair targeted: loading everything up front vs curating the smallest high-signal set and
// pulling detail just in time.

import { defineLesson } from '../../index';

const CTXENG = 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents';
const CTXWIN = 'https://platform.claude.com/docs/en/build-with-claude/context-windows';
const BESTPRAC = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices';

export const l2ContextEngineering = defineLesson({
  id: 'c5-u1-l2',
  title: 'Context engineering',
  order: 1,
  concept: {
    conceptId: 'context-engineering',
    analogy:
      'Context engineering is packing a carry-on, not a moving truck. You have limited space and every ' +
      'item you add crowds out something else, so you pack the few high-value things the trip actually ' +
      'needs and grab anything extra only when you need it.',
    plainExplanation:
      'Context engineering is curating and maintaining the smallest set of high-signal tokens that ' +
      'maximize the likelihood of a good outcome. Every token spends a limited attention budget, so more ' +
      'context is not automatically better. Trim verbose tool results to the fields that matter, and prefer ' +
      'just-in-time retrieval (loading data at runtime through lightweight identifiers) over pre-loading ' +
      'everything. For long-horizon work, lean on compaction, structured note-taking, and sub-agents that ' +
      'return condensed summaries instead of raw transcripts.',
    examWords: [
      'context engineering',
      'attention budget',
      'high-signal tokens',
      'just-in-time retrieval',
      'sub-agent',
    ],
    keyPoints: [
      { id: 'kp-context-engineering-1', text: 'Context engineering is curating the smallest set of high-signal tokens that maximize the likelihood of the desired outcome.' },
      { id: 'kp-context-engineering-2', text: 'Every token spends a limited attention budget, so more context is not automatically better.' },
      { id: 'kp-context-engineering-3', text: 'Trim verbose tool results to the relevant fields and prefer just-in-time retrieval over loading everything up front.' },
      { id: 'kp-context-engineering-4', text: 'For long horizons, use compaction, structured note-taking, and sub-agents that return condensed summaries.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u1-l2-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'How does the guidance define the guiding principle of context engineering?',
      options: [
        'Find the smallest set of high-signal tokens that maximize the likelihood of the desired outcome',
        'Fill the context window as completely as possible before each request',
        'Always fine-tune the model instead of curating context',
        'Cache every prompt so context never has to be curated',
      ],
      answerKey: 0,
      explanation:
        'Context engineering aims for the smallest high-signal set of tokens, because attention is a limited budget. ' +
        'The "fill it completely" option is the trap: maximizing volume is exactly the habit context engineering ' +
        'exists to correct.',
      misconceptionTag: 'smallest-high-signal-set',
      sourceUrls: [CTXENG],
    },
    {
      id: 'c5-u1-l2-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An agent calls a search tool that returns 40 KB of JSON per result, and the window fills after a few calls. What is the best first fix?',
      options: [
        'Trim each tool result to the relevant fields before returning it to the model',
        'Switch to a model with a smaller context window',
        'Send every full result but lower the temperature',
        'Disable tool use entirely so nothing enters the context',
      ],
      answerKey: 0,
      explanation:
        'Verbose tool results consume the window disproportionately, so returning only the relevant fields is the ' +
        'direct lever. Disabling tools removes the capability the task needs, which is the over-correction trap ' +
        'rather than a fix.',
      misconceptionTag: 'trim-tool-results',
      sourceUrls: [CTXENG],
    },
    {
      id: 'c5-u1-l2-q03',
      type: 'mc',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What does the "attention budget" idea imply for how you build a prompt?',
      options: [
        'Each added token depletes a limited budget, so include only what raises the odds of a good answer',
        'The model has unlimited attention, so token count is irrelevant',
        'Attention is spent only on the system prompt, so messages are free',
        'You should always add more examples because attention grows with input',
      ],
      answerKey: 0,
      explanation:
        'Attention works like limited working memory: every token spends some of it, so signal density matters. ' +
        'The "unlimited attention" option is the trap, and it leads straight to the padded prompts that cause rot.',
      misconceptionTag: 'attention-budget',
      sourceUrls: [CTXENG],
    },
    {
      id: 'c5-u1-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A team pre-loads the entire customer database into the system prompt at the start of every agent session "so the data is always available." Why is this a poor context strategy?',
      options: [
        'It burns the attention budget on mostly irrelevant data; just-in-time retrieval loads only what each task needs',
        'System prompts cannot contain any structured data',
        'The data would be safer if it were pasted into every user message instead',
        'Pre-loading is fine as long as the window is large enough',
      ],
      answerKey: 0,
      explanation:
        'Loading everything up front spends attention on data the current task will never touch, degrading recall. ' +
        'Just-in-time retrieval through lightweight identifiers pulls only the needed rows at runtime. "Fine if the ' +
        'window is large enough" is the trap, since a large window still rots as it fills.',
      misconceptionTag: 'just-in-time-retrieval',
      sourceUrls: [CTXENG, CTXWIN],
    },
    {
      id: 'c5-u1-l2-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 3,
      stem: 'Which three techniques does the guidance name for keeping context small on long-horizon tasks? Select THREE.',
      options: [
        'Compaction: summarizing and reinitializing the context',
        'Structured note-taking: persisting key facts in external memory',
        'Sub-agents that explore in isolation and return condensed summaries',
        'Raising the temperature so responses are shorter',
        'Fine-tuning the model on the conversation after each turn',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Compaction, structured note-taking, and sub-agent architectures are the three long-horizon strategies. ' +
        'Temperature changes randomness, not context size, and fine-tuning is not a per-conversation context ' +
        'technique, so both are distractors.',
      misconceptionTag: 'long-horizon-strategies',
      sourceUrls: [CTXENG],
    },
    {
      id: 'c5-u1-l2-q06',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A coordinator delegates a codebase-exploration task to a sub-agent, but the sub-agent returns its entire step-by-step reasoning transcript, flooding the coordinator context. What should the sub-agent return instead?',
      options: [
        'A condensed summary of key findings and citations, not the full verbose reasoning',
        'Nothing at all, to keep the coordinator context empty',
        'The raw transcript, so the coordinator can re-derive everything',
        'Only a single yes or no with no supporting detail',
      ],
      answerKey: 0,
      explanation:
        'Sub-agents exist to explore in isolation and hand back the compressed, high-signal result: key findings and ' +
        'citations. Returning the raw transcript defeats the point by re-polluting the coordinator, and returning ' +
        'nothing throws away the work, so both are traps.',
      misconceptionTag: 'subagent-returns-structured-data',
      sourceUrls: [CTXENG],
    },
    {
      id: 'c5-u1-l2-q07',
      type: 'order',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these context-curation moves from the lightest-touch to the heaviest, following the "keep the context small" principle.',
      steps: [
        'Trim each tool result to only the relevant fields',
        'Retrieve heavy data just in time instead of pre-loading it',
        'Delegate isolated exploration to a sub-agent that returns a condensed summary',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Start by trimming what you already return, then avoid pulling data in until it is needed, and only then ' +
        'reach for a sub-agent to offload a whole line of exploration. Jumping straight to sub-agents adds ' +
        'architecture before the cheaper curation is even in place.',
      misconceptionTag: 'curation-escalation',
      sourceUrls: [CTXENG],
    },
    {
      id: 'c5-u1-l2-q08',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'context-engineering',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An agent prompt places a 30-page reference document at the very end, right after the user question, and the answers keep missing details from the middle of that document. Following the prompting best-practices guidance, which layout change should help most?',
      options: [
        'Move the long document to the top of the prompt, above the query and instructions, so the question comes last',
        'Split the document across many separate user messages so no single message is long',
        'Lower the temperature so the model reads the document more carefully',
        'Duplicate the full question at both the top and the bottom, surrounding the document',
      ],
      answerKey: 0,
      explanation:
        'The guidance is to put longform data at the top of the prompt, above the query, since placing the query at ' +
        'the end can improve response quality by up to 30 percent on complex, multi-document inputs. Splitting the ' +
        'document across messages is the trap: it does not fix the position problem and fragments the very context ' +
        'the model must reason over. Temperature controls randomness, not where attention lands in the prompt.',
      misconceptionTag: 'longform-at-top',
      sourceUrls: [BESTPRAC],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your agent keeps running out of context on long tasks. Name two context-engineering moves you would try and why each shrinks the token load.',
    conceptId: 'context-engineering',
    keyPointIds: [
      'kp-context-engineering-1',
      'kp-context-engineering-2',
      'kp-context-engineering-3',
      'kp-context-engineering-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 240,
});
