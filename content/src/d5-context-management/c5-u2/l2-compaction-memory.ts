// content/src/d5-context-management/c5-u2/l2-compaction-memory.ts
//
// C5-U2-L2 — Compaction and the memory tool (two paired concepts: summarize vs persist). Task
// statements 5.4 (large-codebase / long-session context: scratchpad files persist findings; phase
// summaries) and 5.1. Compaction is beta => its questions carry volatile: true; the memory tool is
// generally available. Every claim traces to the cited pages (verified 2026-07-14):
//   COMPACT — "Compaction": server-side summarization near the window limit into a compaction block,
//             dropping prior blocks so the conversation continues; beta header compact-2026-01-12.
//   MEMORY  — "Memory tool": store/retrieve files across sessions outside the window; client-side;
//             pairs with compaction to preserve facts that must survive summarization.
//   CTXWIN  — "Context windows": compaction vs context editing distinction.
//   CTXEDIT — "Context editing": "Context editing is applied server-side before the prompt reaches
//             Claude. Your client application maintains the full, unmodified conversation history."
//             (re-verified 2026-09-24; this corrected an earlier "on the client" error in q02).
//
// Confusion pair targeted: compaction (summarize older turns server-side) vs context editing (clear
// specific tool results or thinking blocks by rule, also server-side) vs the memory tool (persist
// facts outside the window).

import { defineLesson } from '../../index';

const COMPACT = 'https://platform.claude.com/docs/en/build-with-claude/compaction';
const MEMORY = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool';
const CTXWIN = 'https://platform.claude.com/docs/en/build-with-claude/context-windows';
const CTXEDIT = 'https://platform.claude.com/docs/en/build-with-claude/context-editing';

export const l2CompactionMemory = defineLesson({
  id: 'c5-u2-l2',
  title: 'Compaction and memory',
  order: 1,
  concept: {
    conceptId: 'compaction-and-memory',
    analogy:
      'Compaction is turning a three-hour meeting into a page of minutes so the meeting can keep going; ' +
      'the memory tool is the filing cabinet in the hallway where you keep the facts you will need next ' +
      'week, outside the meeting room entirely.',
    plainExplanation:
      'Server-side compaction automatically summarizes older conversation as it approaches the window ' +
      'limit, writes a compaction block, and drops the prior blocks so the conversation can continue past ' +
      'the limit. Claude Code auto-compacts long sessions on the same idea. This differs from context ' +
      'editing, which is also applied server-side but clears specific old tool results or thinking blocks ' +
      'by rule instead of summarizing, and from the memory tool, which stores ' +
      'facts in files outside the context window and reads them back on demand across sessions. For ' +
      'long-running agents, pair them: compaction keeps the active context small while memory preserves ' +
      'the facts that must survive summarization.',
    examWords: [
      'compaction',
      'compaction block',
      '/compact',
      'memory tool',
      '/memories',
    ],
    keyPoints: [
      { id: 'kp-compaction-and-memory-1', text: 'Server-side compaction summarizes older conversation near the window limit into a compaction block and drops prior blocks so the conversation can continue.' },
      { id: 'kp-compaction-and-memory-2', text: 'Claude Code auto-compacts long sessions on the same principle of replacing older content with a concise summary.' },
      { id: 'kp-compaction-and-memory-3', text: 'The memory tool stores facts in files outside the context window and reads them back on demand across sessions.' },
      { id: 'kp-compaction-and-memory-4', text: 'For long-running agents, pair them: compaction keeps active context small while memory preserves facts that must survive summarization.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u2-l2-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.4',
      difficulty: 1,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'What does server-side compaction do as a conversation nears the context window limit?',
      options: [
        'Summarizes older context into a compaction block and drops the prior blocks so the conversation continues',
        'Rejects the request with a 400 error until the user trims it',
        'Doubles the context window size for that request',
        'Moves the whole conversation into the prompt cache',
      ],
      answerKey: 0,
      explanation:
        'Compaction summarizes earlier turns server-side, creates a compaction block, and continues from the summary ' +
        'so the conversation can run past the limit. The "doubles the window" option is the trap: compaction shrinks ' +
        'what is kept, it does not enlarge the window.',
      misconceptionTag: 'compaction-summarizes-server-side',
      sourceUrls: [COMPACT, CTXWIN],
    },
    {
      id: 'c5-u2-l2-q02',
      type: 'mc',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      volatile: true,
      stem: 'How does compaction differ from context editing?',
      options: [
        'Compaction summarizes older turns into a summary; context editing clears specific tool results or thinking blocks; both run server-side',
        'They are identical features with different names',
        'Context editing runs on the client, so you must sync your local history with the edited version',
        'Compaction deletes tool results one by one; context editing summarizes everything',
      ],
      answerKey: 0,
      explanation:
        'Both are applied server-side before the prompt reaches Claude: compaction replaces older turns with a ' +
        'summary, while context editing clears specific tool results or thinking blocks by rule. The client-side ' +
        'option is the trap, since your application keeps its full history and never syncs an edited copy, and the ' +
        '"identical" option ignores that one summarizes while the other clears.',
      misconceptionTag: 'compaction-vs-context-editing',
      sourceUrls: [COMPACT, CTXEDIT],
    },
    {
      id: 'c5-u2-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.4',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'A long-running coding agent keeps hitting the window limit mid-task and losing coherence. Which mechanism lets the single conversation keep going past the limit with least bookkeeping?',
      options: [
        'Server-side compaction, which summarizes older context automatically as the limit approaches',
        'Raising the temperature so it writes less',
        'Restarting the session from scratch each time it fills',
        'Sending the entire history uncompressed on every request',
      ],
      answerKey: 0,
      explanation:
        'Compaction keeps the active context small automatically without client-side bookkeeping, letting the ' +
        'conversation continue. Restarting from scratch throws away in-progress state, which is the trap that ' +
        'compaction exists to avoid.',
      misconceptionTag: 'compaction-summarizes-server-side',
      sourceUrls: [COMPACT],
    },
    {
      id: 'c5-u2-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An agent relies only on compaction, and after several summaries it has lost an exact account number stated early on. What design change preserves such facts?',
      options: [
        'Write critical facts to the memory tool so they persist outside the window and survive summarization',
        'Increase the temperature so the summary is more detailed',
        'Disable compaction so the window simply overflows',
        'Trust that summaries always retain every number and date',
      ],
      answerKey: 0,
      explanation:
        'Summarization can drop precise details, so facts that must survive belong in memory files outside the ' +
        'window, read back on demand. "Summaries always retain every number" is the trap: progressive summarization ' +
        'is exactly where numbers and dates get lost.',
      misconceptionTag: 'memory-preserves-facts',
      sourceUrls: [MEMORY, COMPACT],
    },
    {
      id: 'c5-u2-l2-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'The memory tool comes up in a design review. Identify the TWO accurate descriptions of it. Select TWO.',
      options: [
        'It stores information in files that live outside the context window',
        'It lets Claude read facts back across separate sessions',
        'It automatically summarizes the conversation on the server',
        'It permanently increases the model context window',
        'It replaces the need to run the tool-use loop',
      ],
      answerKey: [0, 1],
      explanation:
        'Memory persists facts in files outside the window and makes them available in later sessions. The ' +
        '"summarizes on the server" option describes compaction, not memory, and memory does not enlarge the window, ' +
        'so both are distractors.',
      misconceptionTag: 'memory-tool-facts',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c5-u2-l2-q06',
      type: 'order',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.4',
      difficulty: 2,
      estimatedSeconds: 20,
      volatile: true,
      stem: 'Order the steps server-side compaction takes when it activates.',
      steps: [
        'Detect that input tokens have reached the configured trigger threshold',
        'Generate a summary of the current conversation',
        'Create a compaction block containing the summary',
        'On later requests, drop the blocks before the compaction block and continue from the summary',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'Compaction detects the trigger, summarizes, writes a compaction block, and then continues from that summary ' +
        'while dropping the earlier blocks. Reordering these would either summarize before there is anything to ' +
        'summarize or drop content before the summary exists.',
      misconceptionTag: 'compaction-steps',
      sourceUrls: [COMPACT],
    },
    {
      id: 'c5-u2-l2-q07',
      type: 'mc',
      domain: 'd5',
      conceptId: 'compaction-and-memory',
      taskStatement: '5.4',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Why pair compaction with the memory tool for a long-running agent?',
      options: [
        'Compaction keeps active context small while memory preserves facts that must survive summarization',
        'Memory summarizes the conversation and compaction stores files, so they do the same job twice',
        'Pairing them disables the context window limit entirely',
        'Memory is required before compaction can ever run',
      ],
      answerKey: 0,
      explanation:
        'The two are complementary: compaction shrinks the running context automatically, and memory holds the ' +
        'durable facts a summary might drop. The option that swaps their roles is the trap, since memory persists ' +
        'facts and compaction summarizes.',
      misconceptionTag: 'compaction-memory-pairing',
      sourceUrls: [MEMORY, COMPACT],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a long agent session keeps overflowing the window and forgetting an exact ID from early on. How do compaction and the memory tool each help, and why use both?',
    conceptId: 'compaction-and-memory',
    keyPointIds: [
      'kp-compaction-and-memory-1',
      'kp-compaction-and-memory-2',
      'kp-compaction-and-memory-3',
      'kp-compaction-and-memory-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 215,
});
