// content/src/d1-agentic-architecture/c1-u2/l2-parallelization.ts
//
// C1-U2-L2 — Parallelization: sectioning vs voting. Task statement 1.6 (decomposition into parallel
// subtasks). Every claim traces to Anthropic's "Building effective agents" (verified 2026-07-14
// against the cited page).
//
// Confusion pair targeted: sectioning (split into DIFFERENT independent subtasks run at once) vs
// voting (run the SAME task multiple times for diverse outputs). The scenario and spot-bug items
// attack conflating the two.

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l2Parallelization = defineLesson({
  id: 'c1-u2-l2',
  title: 'Parallelization: sectioning and voting',
  order: 1,
  concept: {
    conceptId: 'parallelization',
    analogy:
      'Parallelization is a team splitting a job. Sectioning is dividing a house so one painter does the ' +
      'kitchen while another does the bedroom, different pieces at once. Voting is asking three inspectors ' +
      'to each check the whole house and comparing their verdicts.',
    plainExplanation:
      'Parallelization runs LLM work simultaneously, in two variations. Sectioning breaks a task into ' +
      'independent subtasks run in parallel. Voting runs the same task multiple times to get diverse outputs ' +
      'you then aggregate. Use it when the divided subtasks can be parallelized for speed, or when multiple ' +
      'perspectives or attempts are needed for higher-confidence results.',
    examWords: ['parallelization', 'sectioning', 'voting', 'independent subtasks', 'confidence'],
    keyPoints: [
      { id: 'kp-parallelization-1', text: 'Parallelization runs LLM calls simultaneously, in two variations: sectioning and voting.' },
      { id: 'kp-parallelization-2', text: 'Sectioning breaks a task into independent subtasks run in parallel.' },
      { id: 'kp-parallelization-3', text: 'Voting runs the same task multiple times to get diverse outputs you then aggregate.' },
      { id: 'kp-parallelization-4', text: 'Use it when subtasks parallelize for speed, or when multiple perspectives or attempts raise confidence.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u2-l2-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What is the sectioning variation of parallelization?',
      options: [
        'Breaking a task into independent subtasks run in parallel',
        'Running the same task multiple times and voting on the outputs',
        'Feeding each step\'s output into the next step',
        'Classifying an input and routing it to a specialist',
      ],
      answerKey: 0,
      explanation:
        'Sectioning splits a task into different independent subtasks that run at the same time. Running one task ' +
        'repeatedly and voting is the other variation, voting, not sectioning.',
      misconceptionTag: 'sectioning-vs-voting',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What distinguishes voting from sectioning?',
      options: [
        'Voting runs the same task multiple times for diverse outputs; sectioning splits into different independent subtasks',
        'Voting runs strictly sequentially while sectioning runs in parallel',
        'Voting can use only one model while sectioning uses many',
        'There is no real difference between them',
      ],
      answerKey: 0,
      explanation:
        'Voting repeats one task to gather diverse answers; sectioning divides the work into distinct parallel pieces. ' +
        'The "strictly sequential" answer is the trap: both variations run in parallel.',
      misconceptionTag: 'sectioning-vs-voting',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'To gain confidence that a code change has no security vulnerability, you have several LLM calls independently review the same diff and then combine their verdicts. Which parallelization variation is this?',
      options: [
        'Voting: the same review task run multiple times for diverse outputs',
        'Sectioning: independent subtasks split across the diff',
        'Routing: classify then send to one reviewer',
        'Evaluator-optimizer: generate then critique in a loop',
      ],
      answerKey: 0,
      explanation:
        'Running the same review repeatedly and aggregating verdicts is voting, used to raise confidence. Sectioning is ' +
        'the trap: here the subtasks are not different pieces of the diff, they are the same review done several times.',
      misconceptionTag: 'sectioning-vs-voting',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A pipeline runs one model to answer a user, then, one after another, a second model to screen that answer for policy violations, and the extra step adds noticeable latency. Which parallelization variation removes the wait?',
      options: [
        'Sectioning: run the answer and the policy screen as independent subtasks in parallel',
        'Voting: run the answer three times and take the majority',
        'Prompt chaining: keep the steps sequential but shorten them',
        'Convert both steps into one autonomous agent',
      ],
      answerKey: 0,
      explanation:
        'Answering and screening are independent subtasks, so sectioning runs them at once and removes the added latency. ' +
        'Voting is the trap: repeating the answer does not address the separate screening step at all.',
      misconceptionTag: 'sectioning-vs-voting',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 3,
      estimatedSeconds: 15,
      stem: 'When does parallelization help most?',
      options: [
        'When subtasks can be parallelized for speed, or multiple perspectives or attempts raise confidence',
        'When each step must strictly build on the previous one',
        'When the model must decide the steps dynamically at runtime',
        'When you want to use the fewest possible tokens',
      ],
      answerKey: 0,
      explanation:
        'Parallelization fits independent work you can speed up, or cases where several attempts raise confidence. ' +
        'Steps that must build on each other are the chaining case, the opposite of parallelizable.',
      misconceptionTag: 'parallelization-fit',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are examples of sectioning rather than voting? Select TWO.',
      options: [
        'One model answers the query while another independently screens it for inappropriate content',
        'An eval suite where each LLM call grades a different performance aspect',
        'Running the same vulnerability review three times and taking the majority verdict',
        'Asking the same content-appropriateness check five times against a vote threshold',
        'Chaining an outline step into a drafting step',
      ],
      answerKey: [0, 1],
      explanation:
        'Sectioning splits into different independent subtasks: answering vs screening, or grading distinct aspects. ' +
        'The two "same task repeated" options are voting, and the outline-then-draft option is chaining.',
      misconceptionTag: 'sectioning-vs-voting',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q07',
      type: 'order',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order the steps to design a voting-based check.',
      steps: [
        'Define the single task to repeat and the acceptance threshold',
        'Run the same task multiple times in parallel to get diverse outputs',
        'Aggregate the outputs into one decision using the threshold',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Voting means defining one task and a threshold, running it several times for diverse outputs, then aggregating. ' +
        'Aggregating before you have multiple outputs, or without a threshold, would defeat the purpose of voting.',
      misconceptionTag: 'voting-flow',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u2-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'parallelization',
      taskStatement: '1.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: sectioning and voting both run LLM calls in parallel.',
      options: [
        'True, both are variations of parallelization',
        'False',
      ],
      answerKey: 0,
      explanation:
        'Sectioning and voting are the two variations of parallelization, and both run their calls simultaneously. ' +
        'They differ in what runs, different subtasks vs the same task repeated, not in being parallel.',
      misconceptionTag: 'sectioning-vs-voting',
      sourceUrls: [BEA],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: what is the difference between sectioning and voting, and give one example of each?',
    conceptId: 'parallelization',
    keyPointIds: [
      'kp-parallelization-1',
      'kp-parallelization-2',
      'kp-parallelization-3',
      'kp-parallelization-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
