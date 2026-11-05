// content/src/d1-agentic-architecture/c1-u4/l2-hub-and-spoke.ts
//
// C1-U4-L2 — Orchestrator / hub-and-spoke design (decomposition and delegation). Task statement 1.2
// (coordinator decomposes/delegates/aggregates; route inter-subagent comms through the coordinator;
// avoid coverage gaps). Claims trace to the "multi-agent research system" engineering post
// (verified 2026-07-14 against the cited page).
//
// Confusion pair targeted: vague delegation (causing duplicated work / coverage gaps) vs explicit
// per-subagent objectives; plus direct subagent-to-subagent comms vs routing through the coordinator.

import { defineLesson } from '../../index';

const MAR = 'https://www.anthropic.com/engineering/multi-agent-research-system';

export const l2HubAndSpoke = defineLesson({
  id: 'c1-u4-l2',
  title: 'Orchestrator and hub-and-spoke design',
  order: 1,
  concept: {
    conceptId: 'hub-and-spoke',
    analogy:
      'A coordinator agent is a newsroom editor: it breaks a big story into beats, assigns each to a reporter ' +
      '(subagent), routes all communication through itself, and stitches the pieces into one article. The ' +
      'reporters do not talk directly to each other.',
    plainExplanation:
      'In a coordinator-subagent, or hub-and-spoke, design, a lead agent analyzes the request, develops a ' +
      'strategy, decomposes the work, spawns subagents to explore parts in parallel, and synthesizes their ' +
      'results. Each subagent needs an explicit objective, output format, guidance on tools and sources, and ' +
      'clear task boundaries, or you get duplicated work and coverage gaps. All inter-subagent communication ' +
      'routes through the coordinator, not directly between workers.',
    examWords: ['coordinator', 'hub-and-spoke', 'decompose', 'delegate', 'synthesize'],
    keyPoints: [
      { id: 'kp-hub-and-spoke-1', text: 'A lead agent analyzes the request, decomposes it, delegates to subagents, and synthesizes their results.' },
      { id: 'kp-hub-and-spoke-2', text: 'Each subagent needs an explicit objective, output format, tool and source guidance, and clear task boundaries.' },
      { id: 'kp-hub-and-spoke-3', text: 'Vague delegation causes duplicated work and coverage gaps.' },
      { id: 'kp-hub-and-spoke-4', text: 'Inter-subagent communication routes through the coordinator, not directly between workers.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u4-l2-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'In a hub-and-spoke design, what does the lead agent do?',
      options: [
        'Decomposes the task, delegates parts to subagents, and synthesizes their results',
        'Performs every subtask itself with no delegation',
        'Only forwards the user\'s text unchanged to one subagent',
        'Runs the same query repeatedly and votes on the outputs',
      ],
      answerKey: 0,
      explanation:
        'The coordinator decomposes, delegates, and synthesizes, which is the core of hub-and-spoke. Doing everything ' +
        'itself would forfeit the parallel exploration that makes the pattern worthwhile.',
      misconceptionTag: 'coordinator-role',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What must the coordinator give each subagent to prevent overlapping work?',
      options: [
        'An explicit objective, output format, tool and source guidance, and clear task boundaries',
        'Full access to every other subagent\'s context window',
        'Permission to bypass all approval checks',
        'The entire raw transcript of the conversation',
      ],
      answerKey: 0,
      explanation:
        'Detailed, bounded delegation is what keeps subagents from duplicating each other or leaving gaps. Sharing every ' +
        'subagent\'s context is the trap: it does not define who covers what and wastes context budget.',
      misconceptionTag: 'delegation-detail',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A research coordinator spins up subagents but tells each only "look into the supply chain," and two of them investigate the same 2025 data while another area is left uncovered. What fixes this?',
      options: [
        'Give each subagent a distinct objective and clear task boundaries',
        'Add more subagents on the same vague instruction',
        'Let the subagents message each other directly to coordinate',
        'Switch to a single agent with no plan at all',
      ],
      answerKey: 0,
      explanation:
        'Distinct objectives and boundaries stop duplication and close coverage gaps. Adding more subagents on the same ' +
        'vague prompt is the trap: it multiplies the overlap instead of dividing the labor.',
      misconceptionTag: 'coverage-gaps',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'In one design, subagents message each other directly to coordinate, and the system becomes tangled and hard to trace. What is the recommended structure?',
      options: [
        'Route all inter-subagent communication through the coordinator',
        'Remove the coordinator entirely and let workers self-organize',
        'Give every subagent the same identical prompt',
        'Force all subagents to run strictly one at a time',
      ],
      answerKey: 0,
      explanation:
        'Hub-and-spoke routes communication through the coordinator, which keeps the flow legible and controllable. ' +
        'Removing the coordinator is the trap: direct worker-to-worker chatter is exactly what caused the tangle.',
      misconceptionTag: 'route-through-coordinator',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'Why does the coordinator decompose and delegate rather than answer everything itself?',
      options: [
        'So subagents with isolated context can explore multiple aspects in parallel, and the coordinator then synthesizes',
        'Because a single model cannot call any tools',
        'To avoid spending any tokens at all',
        'Because subagents automatically share the coordinator\'s context',
      ],
      answerKey: 0,
      explanation:
        'Delegation lets independent subagents explore different aspects at once, then the coordinator merges the findings. ' +
        '"A single model cannot call tools" is false, and subagents do not auto-share the coordinator\'s context.',
      misconceptionTag: 'coordinator-role',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are responsibilities of the coordinator in a hub-and-spoke system? Select TWO.',
      options: [
        'Decomposing the task and assigning bounded work to subagents',
        'Synthesizing the subagents\' results into a final answer',
        'Inheriting each subagent\'s raw context automatically',
        'Letting subagents commit changes with no review',
        'Running the same query repeatedly to vote',
      ],
      answerKey: [0, 1],
      explanation:
        'The coordinator decomposes, delegates, and synthesizes. It does not auto-inherit subagent context, skip review, ' +
        'or vote; those describe other mechanisms or anti-patterns.',
      misconceptionTag: 'coordinator-role',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q07',
      type: 'order',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order the coordinator\'s flow in a hub-and-spoke research system.',
      steps: [
        'Analyze the request and develop a strategy',
        'Decompose it and spawn subagents to explore parts in parallel',
        'Synthesize the subagents\' results into one answer',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'The lead agent first analyzes and strategizes, then decomposes and spawns parallel subagents, then synthesizes. ' +
        'Synthesizing before the subagents have run would have nothing to combine.',
      misconceptionTag: 'coordinator-flow',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u4-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'hub-and-spoke',
      taskStatement: '1.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: in hub-and-spoke, subagents should communicate directly with one another.',
      options: [
        'False, communication routes through the coordinator',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The hub-and-spoke shape routes all communication through the coordinator. Direct worker-to-worker messaging ' +
        'breaks the pattern and makes the system hard to trace.',
      misconceptionTag: 'route-through-coordinator',
      sourceUrls: [MAR],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a coordinator is about to spin up three subagents. What must it give each one, and why route their messages through itself?',
    conceptId: 'hub-and-spoke',
    keyPointIds: [
      'kp-hub-and-spoke-1',
      'kp-hub-and-spoke-2',
      'kp-hub-and-spoke-3',
      'kp-hub-and-spoke-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
