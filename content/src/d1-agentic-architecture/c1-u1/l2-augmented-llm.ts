// content/src/d1-agentic-architecture/c1-u1/l2-augmented-llm.ts
//
// C1-U1-L2 — The augmented LLM building block (retrieval + tools + memory). Task statement 1.1
// (the basic building block of agentic systems). Every claim traces to Anthropic's "Building
// effective agents" (verified 2026-07-14 against the cited page).
//
// Confusion pair targeted: augmented LLM vs a full multi-agent system — the belief that wiring
// tools and retrieval onto a model already yields an "agent". Intentional variantOf sibling pair
// for dupe calibration: q03 (base) ~ q04 (harder framing).

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';

export const l2AugmentedLlm = defineLesson({
  id: 'c1-u1-l2',
  title: 'The augmented LLM',
  order: 1,
  concept: {
    conceptId: 'augmented-llm',
    analogy:
      'An augmented LLM is a smartphone: the bare phone is useful, but it gets powerful when you add a ' +
      'camera (tools), a search app (retrieval), and saved photos (memory), and it picks which to use for ' +
      'the task in front of it.',
    plainExplanation:
      'The basic building block of agentic systems is an LLM enhanced with augmentations: retrieval, tools, ' +
      'and memory. The model actively uses them, generating its own search queries, selecting appropriate ' +
      'tools, and deciding what information to retain. Focus on tailoring the augmentations to your use case ' +
      'and giving the model a clean, well-documented interface to each.',
    examWords: ['augmented LLM', 'retrieval', 'tools', 'memory', 'building block'],
    keyPoints: [
      { id: 'kp-augmented-llm-1', text: 'The augmented LLM is the basic building block of agentic systems.' },
      { id: 'kp-augmented-llm-2', text: 'Its three augmentations are retrieval, tools, and memory.' },
      { id: 'kp-augmented-llm-3', text: 'The model actively uses them: generating its own search queries, selecting tools, and choosing what to retain.' },
      { id: 'kp-augmented-llm-4', text: 'Tailor the augmentations to your use case and give each a clean, well-documented interface.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u1-l2-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What is the "augmented LLM" in Anthropic\'s agent guidance?',
      options: [
        'An LLM enhanced with retrieval, tools, and memory that it actively uses',
        'A larger model with more parameters',
        'Two LLMs voting on a single answer',
        'An LLM fine-tuned on your private data',
      ],
      answerKey: 0,
      explanation:
        'The augmented LLM is a base model plus retrieval, tools, and memory that the model itself drives. The ' +
        '"larger model" answer is the trap: capability here comes from augmentations and interfaces, not from raw ' +
        'parameter count.',
      misconceptionTag: 'augmented-llm-vs-bigger-model',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A colleague claims memory and retrieval are the same augmentation. Which correction fits?',
      options: [
        'Retrieval pulls in external information on demand; memory is the information the model chooses to retain across steps',
        'They are identical, so the colleague is right',
        'Memory searches the web while retrieval stores notes',
        'Neither one is an augmentation of the LLM',
      ],
      answerKey: 0,
      explanation:
        'Retrieval brings outside information in (the model generates its own search queries), while memory is what ' +
        'the model decides to keep. The "memory searches the web" answer swaps the two roles, which is the exact ' +
        'confusion to avoid.',
      misconceptionTag: 'memory-vs-retrieval',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You enhance a plain LLM so it can answer questions using your company knowledge base and remember key facts across a session. Which building block are you assembling?',
      options: [
        'The augmented LLM: a model with retrieval and memory it actively uses',
        'A multi-agent system with a coordinator',
        'A prompt-chaining workflow',
        'An orchestrator-workers pattern',
      ],
      answerKey: 0,
      explanation:
        'Adding retrieval and memory to one model is the augmented LLM, the foundational block. The multi-agent answer ' +
        'is the tempting overreach: no delegation or coordinator is present, just a single enhanced model.',
      misconceptionTag: 'augmented-llm-vs-multi-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q04',
      type: 'mc',
      variant: 'scenario',
      variantOf: 'c1-u1-l2-q03',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'You enhance a plain LLM so it can answer questions using your company knowledge base and remember key facts across a session, before you add any orchestration. Which building block are you assembling first?',
      options: [
        'The augmented LLM, the foundational block you build before any orchestration',
        'A multi-agent research system',
        'An evaluator-optimizer loop',
        'A routing workflow across specialized models',
      ],
      answerKey: 0,
      explanation:
        'Retrieval plus memory on one model is the augmented LLM, and orchestration patterns are layered on top of it ' +
        'later. The multi-agent answer jumps ahead to a pattern you have not built yet, which is the trap.',
      misconceptionTag: 'augmented-llm-vs-multi-agent',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q05',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer gives the model a tools list but hardcodes exactly which tool runs at each step and in what order. Why is this not using the augmented LLM as intended?',
      options: [
        'The augmented LLM is meant to select tools itself; hardcoding the choice removes the model\'s active use of the augmentation',
        'Tools are never part of the augmented LLM',
        'The augmented LLM can only ever call one tool',
        'Hardcoding tool order is required for the augmented LLM',
      ],
      answerKey: 0,
      explanation:
        'The building block depends on the model actively selecting appropriate tools; a hardcoded order turns that ' +
        'into a fixed workflow. The "tools are never part of it" answer is the trap: tools are one of the three ' +
        'augmentations, the point is that the model chooses.',
      misconceptionTag: 'augmented-llm-active-use',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q06',
      type: 'mc',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Per the guidance, what should you focus on when implementing the augmentations?',
      options: [
        'Tailoring them to your use case and giving each a clean, well-documented interface',
        'Using every available augmentation on every request',
        'Maximizing the number of tools regardless of relevance',
        'Avoiding retrieval entirely to save tokens',
      ],
      answerKey: 0,
      explanation:
        'The guidance stresses fit and a clean interface so the model can use each augmentation well. Piling on every ' +
        'tool "just in case" is the trap: it clutters selection instead of tailoring to the task.',
      misconceptionTag: 'augmented-llm-interface',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q07',
      type: 'multi',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 3,
      stem: 'Which three capabilities are the augmentations of the augmented LLM? Select THREE.',
      options: [
        'Retrieval',
        'Tools',
        'Memory',
        'A larger context window on its own',
        'Fine-tuning the model weights',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Retrieval, tools, and memory are the three named augmentations the model actively uses. A bigger context ' +
        'window or fine-tuning may help elsewhere, but neither is one of the building block\'s augmentations.',
      misconceptionTag: 'augmented-llm-augmentations',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q08',
      type: 'multi',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two behaviors show the model "actively using" its augmentations rather than being passively wired? Select TWO.',
      options: [
        'Generating its own search queries for retrieval',
        'Selecting which tool to call for the current task',
        'Running a fixed tool order defined in application code',
        'Returning text with no tool or retrieval at all',
        'Having the developer pick every retrieval query in advance',
      ],
      answerKey: [0, 1],
      explanation:
        'Active use means the model drives the augmentation: writing its own queries and choosing tools. The fixed-order ' +
        'and developer-picks-every-query options describe wiring where the model has no say, which is the opposite.',
      misconceptionTag: 'augmented-llm-active-use',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q09',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the augmented LLM is the basic ___ of agentic systems, and its three augmentations are retrieval, ___, and memory.',
      blanks: [
        { options: ['building block', 'bottleneck', 'output format'] },
        { options: ['tools', 'temperature', 'weights'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The augmented LLM is the basic building block, and its three augmentations are retrieval, tools, and memory. ' +
        '"Temperature" and "weights" are model settings, not augmentations the model actively uses.',
      misconceptionTag: 'augmented-llm-augmentations',
      sourceUrls: [BEA],
    },
    {
      id: 'c1-u1-l2-q10',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'augmented-llm',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: an augmented LLM with tools and retrieval is already a full multi-agent system.',
      options: [
        'False, it is a single building block, not a multi-agent system',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The augmented LLM is one enhanced model, the foundational block. Multi-agent systems add coordination and ' +
        'delegation on top of it.',
      misconceptionTag: 'augmented-llm-vs-multi-agent',
      sourceUrls: [BEA],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: name the three augmentations of the augmented LLM and one thing the model does with them on its own.',
    conceptId: 'augmented-llm',
    keyPointIds: [
      'kp-augmented-llm-1',
      'kp-augmented-llm-2',
      'kp-augmented-llm-3',
      'kp-augmented-llm-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 265,
});
