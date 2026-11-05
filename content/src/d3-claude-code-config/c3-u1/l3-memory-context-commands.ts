// content/src/d3-claude-code-config/c3-u1/l3-memory-context-commands.ts
//
// C3-U1-L3 — Memory and context commands: /memory to diagnose what is loaded, auto memory, and
// what survives compaction. Task statement 3.1 (/memory to diagnose what is loaded; CLAUDE.md vs
// auto memory). Verified 2026-07-14 against the cited Claude Code "memory" doc.
//
// Current-docs note (re-verified 2026-09-24, code.claude.com/docs/en/memory): "To check which
// CLAUDE.md and rules files loaded into the current session, run /context." /memory "lists your
// CLAUDE.md, CLAUDE.local.md, and other memory file locations ... lets you toggle auto memory on or
// off" and opens files for editing. The exam guide v1.0 (task 3.1) says "Using the /memory command to
// verify which memory files are loaded", so the lesson keeps the exam framing, states both, and cites
// the guide on the two items that lean on it (q01, q06).
//
// Confusion pair targeted: CLAUDE.md (you write, always loaded in full) vs auto memory (Claude
// writes, MEMORY.md index loaded within a size cap). The spot-bug attacks "Claude will just
// remember what I said in chat".

import { defineLesson } from '../../index';

const MEMORY = 'https://code.claude.com/docs/en/memory';
// Public CCA-F Exam Guide v1.0 (PDF linked from the certification landing page). The S3 path carries
// a timestamp-like segment and may change on re-upload; the landing page is the stable entry point.
const EXAM_GUIDE =
  'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf';

export const l3MemoryContextCommands = defineLesson({
  id: 'c3-u1-l3',
  title: 'Memory and context commands',
  order: 2,
  concept: {
    conceptId: 'memory-context-commands',
    analogy:
      'CLAUDE.md is a house manual you write and hand to every guest; auto memory is a sticky-note pad ' +
      'the guest keeps for themselves, jotting down what they learned. The /memory command is you ' +
      'opening the drawer of notes to read and edit them; in current Claude Code, /context is the ' +
      'checklist of which notes are actually in play right now.',
    plainExplanation:
      'Two systems carry knowledge across sessions: CLAUDE.md files that you write and that load in ' +
      'full every session, and auto memory that Claude writes for itself, where a MEMORY.md index is ' +
      'loaded within a size cap (its first 200 lines or 25KB). When an instruction is not being ' +
      'followed, the first move is to verify which CLAUDE.md, CLAUDE.local.md, and rules files actually ' +
      'loaded: the exam guide names /memory for that check, and current Claude Code docs say /context ' +
      'lists the loaded memory files while /memory lists, opens, and edits them. Anything given only ' +
      'in chat can be lost, so put lasting instructions in CLAUDE.md; a project-root CLAUDE.md is ' +
      're-read from disk and survives /compact.',
    examWords: [
      '/memory',
      '/context',
      'auto memory',
      'MEMORY.md',
      'first 200 lines or 25KB',
      '/compact',
      'survives compaction',
    ],
    keyPoints: [
      { id: 'kp-memory-context-commands-1', text: 'When an instruction is ignored, first verify which CLAUDE.md, CLAUDE.local.md, and rules files actually loaded; the exam guide names /memory for this, and current Claude Code docs say /context lists loaded files while /memory lists and opens them.' },
      { id: 'kp-memory-context-commands-2', text: 'CLAUDE.md files are written by you and load in full every session; auto memory is written by Claude and its MEMORY.md index loads within a size cap (first 200 lines or 25KB).' },
      { id: 'kp-memory-context-commands-3', text: 'Instructions given only in chat can be lost, so lasting instructions belong in CLAUDE.md rather than a one-off message.' },
      { id: 'kp-memory-context-commands-4', text: 'A project-root CLAUDE.md is re-read from disk and survives /compact, while nested subdirectory CLAUDE.md files are not re-injected automatically.' },
    ],
  },
  exercises: [
    {
      id: 'c3-u1-l3-q01',
      type: 'mc',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Claude keeps ignoring an instruction you thought was in a CLAUDE.md. What is the first diagnostic step?',
      options: [
        'Check which CLAUDE.md and rules files actually loaded this session before changing anything',
        'Restart your machine to clear any cache',
        'Re-type the instruction in every message from now on',
        'Delete all CLAUDE.md files and start over',
      ],
      answerKey: 0,
      explanation:
        'Confirm whether Claude can even see the file before you touch anything else. The exam guide names /memory ' +
        'for this check; current Claude Code docs say /context lists the memory files that loaded, and /memory opens ' +
        'them for editing. Re-typing every message is the trap: it papers over the real question of whether the file ' +
        'is being loaded at all.',
      misconceptionTag: 'memory-diagnose-loaded',
      sourceUrls: [MEMORY, EXAM_GUIDE],
    },
    {
      id: 'c3-u1-l3-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A teammate claims CLAUDE.md and auto memory are the same thing. What distinguishes them?',
      options: [
        'You write CLAUDE.md and it loads in full each session; Claude writes auto memory, and its MEMORY.md index loads within a size cap',
        'They are identical, so the teammate is right',
        'Auto memory is written by you and CLAUDE.md is written by Claude',
        'Neither is loaded at the start of a session',
      ],
      answerKey: 0,
      explanation:
        'CLAUDE.md is your authored, always-loaded instruction file, while auto memory is Claude\'s own notes with a ' +
        'capped MEMORY.md index. The "written by you / written by Claude" answer swaps the two authors, which is the exact ' +
        'confusion to avoid.',
      misconceptionTag: 'claude-md-vs-auto-memory',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You want a build command to be available in every future session, not just this one. What should you do?',
      options: [
        'Add it to CLAUDE.md so it loads in full at the start of every session',
        'Mention it once in chat and trust Claude to recall it next time',
        'Rely on it being remembered after the next /compact',
        'Type it into a subdirectory file and expect it at launch',
      ],
      answerKey: 0,
      explanation:
        'CLAUDE.md loads in full every session, so a command written there persists reliably. Mentioning it once in chat is ' +
        'the trap: conversation-only instructions can be lost, which is exactly why persistent facts belong in CLAUDE.md.',
      misconceptionTag: 'chat-only-instructions-lost',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'After running /compact, an engineer notices a rule they only stated in chat has vanished, but the project CLAUDE.md rule is still honored. Why the difference?',
      options: [
        'Project-root CLAUDE.md is re-read from disk after /compact, while a chat-only instruction has no file to reload from',
        '/compact deletes CLAUDE.md files from disk',
        'Chat instructions always outlast file-based ones',
        'CLAUDE.md is never part of the context, so nothing could be lost',
      ],
      answerKey: 0,
      explanation:
        'A project-root CLAUDE.md survives compaction because Claude re-reads it from disk, but an instruction that lived only ' +
        'in the conversation cannot be reloaded. The "deletes CLAUDE.md from disk" answer is the trap: compaction summarizes ' +
        'context, it does not touch your files.',
      misconceptionTag: 'claude-md-survives-compaction',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l3-q05',
      type: 'mc',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'How much of auto memory is guaranteed to load at the start of every session?',
      options: [
        'The MEMORY.md index, up to its first 200 lines or 25KB, whichever comes first',
        'Every file in the auto memory directory, in full',
        'Nothing; auto memory only loads when the user runs /memory',
        'The entire MEMORY.md regardless of length',
      ],
      answerKey: 0,
      explanation:
        'Only the MEMORY.md index loads at session start, and only up to its first 200 lines or 25KB; topic files load on ' +
        'demand. The "every file in full" answer ignores the cap that keeps startup context small.',
      misconceptionTag: 'auto-memory-load-cap',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l3-q06',
      type: 'multi',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two things does the /memory command do? Select TWO.',
      options: [
        'Lists your CLAUDE.md, CLAUDE.local.md, and rules memory files so you can verify and edit them',
        'Lets you toggle auto memory on or off',
        'Permanently deletes your CLAUDE.md files',
        'Forces the model to obey every loaded instruction',
        'Disables all path-scoped rules for the project',
      ],
      answerKey: [0, 1],
      explanation:
        '/memory lists your memory files and lets you toggle auto memory. The exam guide describes /memory as the way ' +
        'to verify which memory files are loaded; current Claude Code docs add that /context shows which ones loaded ' +
        'this session, while /memory lists and opens them. The other options overstate it: it does not delete files, ' +
        'cannot guarantee obedience, and does not disable rules.',
      misconceptionTag: 'memory-diagnose-loaded',
      sourceUrls: [MEMORY, EXAM_GUIDE],
    },
    {
      id: 'c3-u1-l3-q07',
      type: 'cloze',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: ___ files are written by you and load in full every session, while ___ is written by Claude and only its MEMORY.md index loads within a size cap.',
      blanks: [
        { options: ['CLAUDE.md', 'MEMORY.md', 'settings.json'] },
        { options: ['auto memory', 'the project CLAUDE.md', 'a path-scoped rule'] },
      ],
      answerKey: [0, 0],
      explanation:
        'CLAUDE.md is the file you author and it always loads in full; auto memory is Claude\'s own notes, capped through its ' +
        'MEMORY.md index. Settings.json is configuration, not persistent instruction text, so it is not the answer.',
      misconceptionTag: 'claude-md-vs-auto-memory',
      sourceUrls: [MEMORY],
    },
    {
      id: 'c3-u1-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd3',
      conceptId: 'memory-context-commands',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: an instruction you only said in chat is guaranteed to persist into your next session.',
      options: [
        'False, chat-only instructions can be lost; put lasting ones in CLAUDE.md',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Conversation-only instructions have no file to reload from and can be lost, including across compaction. ' +
        'Writing them into CLAUDE.md is what makes them persist.',
      misconceptionTag: 'chat-only-instructions-lost',
      sourceUrls: [MEMORY],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: Claude keeps ignoring a rule you thought you set. Which command tells you whether the file even loaded, and where should a rule live so it survives into the next session?',
    conceptId: 'memory-context-commands',
    keyPointIds: [
      'kp-memory-context-commands-1',
      'kp-memory-context-commands-2',
      'kp-memory-context-commands-3',
      'kp-memory-context-commands-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
