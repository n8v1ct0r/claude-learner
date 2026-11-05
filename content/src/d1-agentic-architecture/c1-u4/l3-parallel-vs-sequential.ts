// content/src/d1-agentic-architecture/c1-u4/l3-parallel-vs-sequential.ts
//
// C1-U4-L3 — Parallel vs sequential execution; partial-failure handling. Task statement 1.3
// (parallel spawning = multiple subagent calls in one response). Claims trace to the Agent SDK
// overview and the "multi-agent research system" post (verified 2026-07-14 against the cited pages):
//   MAR — parallel tool calling cut research time up to 90%; resume from where the agent was rather
//         than restarting; let the agent adapt when a tool is failing; coding parallelizes less than
//         research because of dependencies.

import { defineLesson } from '../../index';

const MAR = 'https://www.anthropic.com/engineering/multi-agent-research-system';
const SDK = 'https://code.claude.com/docs/en/agent-sdk/overview';

export const l3ParallelVsSequential = defineLesson({
  id: 'c1-u4-l3',
  title: 'Parallel vs sequential execution',
  order: 2,
  concept: {
    conceptId: 'parallel-vs-sequential',
    analogy:
      'Running subagents in parallel is like sending several scouts down different trails at once to map an ' +
      'area fast. Doing it sequentially is like one scout walking every trail in turn, needed when each ' +
      'trail\'s findings decide where to go next.',
    plainExplanation:
      'Spawn subagents in parallel when their subtasks are independent, which speeds up breadth-first work ' +
      'dramatically. Run them sequentially when a later subtask depends on an earlier one\'s result. In the ' +
      'SDK, parallel spawning means issuing multiple subagent calls in a single response. Design for failure ' +
      'too: when a long run hits an error, resume from where the agent was rather than restarting from the ' +
      'beginning, and let the agent adapt when a tool is failing.',
    examWords: ['parallel', 'sequential', 'independent subtasks', 'resume', 'adapt on failure'],
    keyPoints: [
      { id: 'kp-parallel-vs-sequential-1', text: 'Spawn subagents in parallel when their subtasks are independent, which speeds up breadth-first work.' },
      { id: 'kp-parallel-vs-sequential-2', text: 'Run subagents sequentially when a later subtask depends on an earlier subtask\'s result.' },
      { id: 'kp-parallel-vs-sequential-3', text: 'Parallel spawning means issuing multiple subagent calls in a single response.' },
      { id: 'kp-parallel-vs-sequential-4', text: 'On failure, resume from where the agent was rather than restarting, and let the agent adapt when a tool is failing.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u4-l3-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'When should subagents run in parallel?',
      options: [
        'When their subtasks are independent of each other',
        'When each subtask depends on the previous one\'s result',
        'Always, regardless of dependencies',
        'Never, since parallel work is unsafe',
      ],
      answerKey: 0,
      explanation:
        'Independent subtasks are what parallel execution speeds up. Dependent subtasks must wait for each other, so ' +
        '"always parallel" would run some steps before their inputs exist.',
      misconceptionTag: 'parallel-independence',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l3-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'In the Agent SDK, how do you spawn multiple subagents in parallel within one turn?',
      options: [
        'Issue multiple subagent calls in a single response',
        'Issue them one at a time across separate turns',
        'Raise max_tokens so more can fit',
        'Place them in a sequential prompt chain',
      ],
      answerKey: 0,
      explanation:
        'Parallel spawning is done by making several subagent calls in one response. Issuing them one per turn is ' +
        'sequential, not parallel, and max_tokens has nothing to do with concurrency.',
      misconceptionTag: 'parallel-spawning',
      sourceUrls: [SDK],
    },
    {
      id: 'c1-u4-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Step B needs the account identifier that Step A extracts before it can run. Should the two subagents run in parallel or in sequence, and why?',
      options: [
        'Sequentially, because B depends on A\'s result',
        'In parallel, since parallel is always faster',
        'In parallel, then discard B if it fails',
        'It does not matter which order they run',
      ],
      answerKey: 0,
      explanation:
        'A dependency forces sequential execution: B cannot start until A produces the identifier. "Always faster" is the ' +
        'trap: running B early just makes it act on missing input.',
      misconceptionTag: 'dependency-sequential',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer spawns two subagents in parallel, but the second one needs the first subagent\'s extracted output to do its job, so it runs with missing input. What is the flaw?',
      options: [
        'Dependent subtasks must run sequentially; only independent subtasks should be parallelized',
        'Parallel execution is always correct, so nothing is wrong',
        'The fix is to add a third subagent',
        'They should give both subagents bypassPermissions',
      ],
      answerKey: 0,
      explanation:
        'The second subagent depends on the first, so the two must run in sequence, not in parallel. Adding a third ' +
        'subagent is the trap: it does not resolve the ordering dependency that caused the missing input.',
      misconceptionTag: 'dependency-sequential',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l3-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Why do many coding tasks parallelize across subagents less cleanly than research tasks?',
      options: [
        'Coding tasks have more dependencies between steps, and parallel subagents work best on independent subtasks',
        'Coding tasks are always larger than research tasks',
        'Coding tasks cannot use subagents at all',
        'Research tasks never need any context',
      ],
      answerKey: 0,
      explanation:
        'Most coding tasks involve fewer truly parallelizable pieces because steps depend on each other, unlike ' +
        'breadth-first research. Size and a blanket "cannot use subagents" claim both misstate the real reason.',
      misconceptionTag: 'dependency-sequential',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l3-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'When a long-running agent hits an error mid-task, which two are recommended? Select TWO.',
      options: [
        'Resume from where the agent was rather than restarting from the beginning',
        'Let the agent know a tool is failing so it can adapt',
        'Restart the entire workflow from scratch on any error',
        'Silently drop the failed step and report success',
        'Block forever waiting on the failed step to recover on its own',
      ],
      answerKey: [0, 1],
      explanation:
        'Resuming from the failure point and letting the agent adapt to a failing tool both avoid throwing away good work. ' +
        'Restarting from scratch, silently dropping steps, and blocking forever are the anti-patterns.',
      misconceptionTag: 'resume-not-restart',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l3-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: run subagents in ___ when their subtasks are independent, but in ___ when a later step depends on an earlier result.',
      blanks: [
        { options: ['parallel', 'sequence', 'isolation'] },
        { options: ['sequence', 'parallel', 'reverse'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Independent subtasks go in parallel for speed; dependent ones go in sequence so inputs exist when needed. ' +
        'Swapping them either starves a step of its input or serializes work that could have been concurrent.',
      misconceptionTag: 'parallel-independence',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'parallel-vs-sequential',
      taskStatement: '1.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: when a long agent run hits an error, the best default is to restart from the very beginning.',
      options: [
        'False, resume from where the agent was instead of restarting',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Restarts are expensive and frustrating, so the guidance is to resume from where the error occurred. Starting ' +
        'over discards all the state the agent had already built up.',
      misconceptionTag: 'resume-not-restart',
      sourceUrls: [MAR],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you have four subtasks, two independent and two where one feeds the other. How do you schedule them, and what do you do if one fails midway?',
    conceptId: 'parallel-vs-sequential',
    keyPointIds: [
      'kp-parallel-vs-sequential-1',
      'kp-parallel-vs-sequential-2',
      'kp-parallel-vs-sequential-3',
      'kp-parallel-vs-sequential-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
