// content/src/d5-context-management/c5-u1/l1-window-mechanics.ts
//
// C5-U1-L1 — Context window mechanics and context rot. Task statement 5.1 (long-interaction
// context; lost-in-the-middle position effects; verbose content consuming context). Every claim
// traces to the cited pages (verified 2026-07-14):
//   CTXWIN — "Context windows": what counts toward the window, accumulation, context rot, overflow.
//   CTXENG — "Effective context engineering for AI agents": context rot as a documented gradient.
//
// Confusion pair targeted: "more context is always better" vs the reality that recall degrades as
// tokens grow (context rot). The explain-back and several distractors attack exactly that belief.

import { defineLesson } from '../../index';

const CTXWIN = 'https://platform.claude.com/docs/en/build-with-claude/context-windows';
const CTXENG = 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents';

export const l1WindowMechanics = defineLesson({
  id: 'c5-u1-l1',
  title: 'The context window and context rot',
  order: 0,
  concept: {
    conceptId: 'context-window-mechanics',
    analogy:
      'The context window is a desk, not a filing cabinet. Everything the model can look at while it ' +
      'answers has to fit on the desk at once, and a bigger desk still gets cluttered: pile on enough ' +
      'papers and the model starts losing track of the one that mattered.',
    plainExplanation:
      'The context window is all the text a model can reference while generating a response, including ' +
      'its own output. It is finite working memory, and everything counts toward it: the system prompt, ' +
      'every message, tool results, images, tool definitions, and the generated tokens. As the token ' +
      'count grows, recall and accuracy degrade, a documented effect called context rot that behaves like ' +
      'a gradient rather than a hard cliff. So curating what is in context matters as much as how much ' +
      'space is available.',
    examWords: [
      'context window',
      'context rot',
      'lost in the middle',
      'working memory',
      'stop_reason "model_context_window_exceeded"',
    ],
    keyPoints: [
      { id: 'kp-context-window-mechanics-1', text: 'The context window is all the tokens a model can reference, including its own output, and it is finite working memory.' },
      { id: 'kp-context-window-mechanics-2', text: 'As the token count grows, recall and accuracy degrade; this documented effect is called context rot, and it is a gradient, not a hard cliff.' },
      { id: 'kp-context-window-mechanics-3', text: 'Everything counts toward the window: system prompt, every message, tool results, tool definitions, and the generated output including thinking.' },
      { id: 'kp-context-window-mechanics-4', text: 'Because recall degrades with size, curating what is in context matters as much as how large the window is.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u1-l1-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does the term "context rot" describe?',
      options: [
        'Recall and accuracy declining as the number of tokens in the context window grows',
        'The model permanently forgetting its training data over time',
        'A hard error the API throws once the window is 90 percent full',
        'Cached tokens expiring after their five-minute lifetime',
      ],
      answerKey: 0,
      explanation:
        'Context rot is the documented effect where a model recalls information less accurately as the token ' +
        'count rises, behaving like a performance gradient. The hard-error option is the trap: rot is a gradual ' +
        'decline in quality, not a status code the API returns.',
      misconceptionTag: 'context-rot-is-gradient',
      sourceUrls: [CTXENG, CTXWIN],
    },
    {
      id: 'c5-u1-l1-q02',
      type: 'mc',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Which of these consumes space in the context window?',
      options: [
        'All of them: the system prompt, prior messages, tool results, tool definitions, and generated output',
        'Only the current user message',
        'Only text the user typed, never tool results or tool definitions',
        'Only the output tokens, since input is free',
      ],
      answerKey: 0,
      explanation:
        'Everything in the request counts toward the window: system prompt, every message including tool results ' +
        'and images, the tool definitions, and the tokens the model generates. Treating tool results or ' +
        'definitions as free is the trap, and it is exactly what quietly fills a long agent run.',
      misconceptionTag: 'what-counts-toward-window',
      sourceUrls: [CTXWIN],
    },
    {
      id: 'c5-u1-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A support agent handles a very long conversation and starts misremembering a policy number stated early on, even though it is still in the history. What is the most likely cause?',
      options: [
        'Context rot: recall of details buried in a large context degrades as the token count grows',
        'The API silently deleted the early message to save space',
        'The model was never given the policy number in the first place',
        'The policy number expired like a cached prefix',
      ],
      answerKey: 0,
      explanation:
        'The fact is still present, so this is a recall problem: as the window fills, accuracy on buried details ' +
        'drops, and mid-history content is especially vulnerable. The "silently deleted" option is the trap, since ' +
        'standard requests preserve prior turns completely rather than dropping them.',
      misconceptionTag: 'lost-in-the-middle',
      sourceUrls: [CTXWIN, CTXENG],
    },
    {
      id: 'c5-u1-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer says, "our model has a one million token window, so we should always stuff in the full documentation to be safe." What is the flaw in that reasoning?',
      options: [
        'More context is not automatically better: as tokens grow, recall degrades, so relevance beats raw volume',
        'A one million token window cannot hold documentation at all',
        'Adding documentation is free because input tokens are not billed',
        'The window can only ever hold the system prompt, not documents',
      ],
      answerKey: 0,
      explanation:
        'A large window still suffers context rot, so padding it with everything lowers accuracy on what matters. ' +
        'The "input is free" option is the trap: every added token both costs money and spends the attention that ' +
        'recall depends on.',
      misconceptionTag: 'more-context-is-better',
      sourceUrls: [CTXENG, CTXWIN],
    },
    {
      id: 'c5-u1-l1-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A teammate lists claims about the context window. Identify the TWO that hold up. Select TWO.',
      options: [
        'The generated output, including extended thinking, counts toward the window',
        'Recall of information degrades as the token count increases',
        'Only user-typed text counts; tool results are excluded',
        'A larger window guarantees higher accuracy on every detail',
        'Prior conversation turns are dropped automatically on each new turn',
      ],
      answerKey: [0, 1],
      explanation:
        'Output tokens count toward the window, and recall degrades as it fills (context rot). The excluded options ' +
        'are the classic misreads: tool results do count, a bigger window does not guarantee better recall, and ' +
        'standard API requests preserve prior turns rather than dropping them.',
      misconceptionTag: 'what-counts-toward-window',
      sourceUrls: [CTXWIN, CTXENG],
    },
    {
      id: 'c5-u1-l1-q06',
      type: 'cloze',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the context window is finite ___ memory, and as it fills, recall and accuracy ___ in an effect called context rot.',
      blanks: [
        { options: ['working', 'training', 'cached'] },
        { options: ['degrade', 'improve', 'stay constant'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The window is the model\'s working memory, and recall degrades as it fills, which is context rot. ' +
        '"Training" memory and "improve" both describe the opposite of what actually happens as tokens accumulate.',
      misconceptionTag: 'context-rot-is-gradient',
      sourceUrls: [CTXWIN, CTXENG],
    },
    {
      id: 'c5-u1-l1-q07',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd5',
      conceptId: 'context-window-mechanics',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: filling a larger context window with as much text as possible always improves accuracy.',
      options: [
        'False, because recall degrades as the window fills (context rot)',
        'True',
      ],
      answerKey: 0,
      explanation:
        'More context is not automatically better; accuracy falls as tokens accumulate. Curating high-signal content ' +
        'beats maximizing volume.',
      misconceptionTag: 'more-context-is-better',
      sourceUrls: [CTXENG, CTXWIN],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a teammate wants to paste an entire 300-page manual into every request "to be safe." Using context rot, why might that hurt more than help?',
    conceptId: 'context-window-mechanics',
    keyPointIds: [
      'kp-context-window-mechanics-1',
      'kp-context-window-mechanics-2',
      'kp-context-window-mechanics-3',
      'kp-context-window-mechanics-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 210,
});
