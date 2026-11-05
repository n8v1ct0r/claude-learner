// content/src/d5-context-management/c5-u2/l3-token-counting.ts
//
// C5-U2-L3 — count_tokens and token budgeting. Task statement 5.1 (proactively managing context and
// rate limits/costs before sending). Every claim traces to the cited page (verified 2026-07-14):
//   TOKENS — "Token counting": the count_tokens endpoint returns input_tokens for a prospective
//            request; accepts the same inputs as Messages (system, messages, tools, images, PDFs);
//            it is free to use with its own RPM limits; the count is an estimate; use it to manage
//            rate limits and cost, make model-routing decisions, and fit prompts to a length; the
//            newer tokenizer produces ~30% more tokens, so recount per model. It does NOT use caching.
//   CTXWIN — "Context windows": use token counting to estimate a request before you send it.
//
// Confusion pair targeted: count_tokens is a free, pre-send estimate (not a billed, exact, cached
// call).

import { defineLesson } from '../../index';

const TOKENS = 'https://platform.claude.com/docs/en/build-with-claude/token-counting';
const CTXWIN = 'https://platform.claude.com/docs/en/build-with-claude/context-windows';

export const l3TokenCounting = defineLesson({
  id: 'c5-u2-l3',
  title: 'Token counting and budgeting',
  order: 2,
  concept: {
    conceptId: 'token-counting',
    analogy:
      'Counting tokens before you send is weighing your suitcase at home before the airport. You learn ' +
      'whether it will fit under the limit and dodge the surprise overage fee at the counter, without ' +
      'actually checking the bag yet.',
    plainExplanation:
      'The count_tokens endpoint returns the input_tokens a request would use before you send it. It ' +
      'accepts the same inputs as the Messages API, including system prompts, messages, tools, images, and ' +
      'PDFs, and it is free to use, subject to its own requests-per-minute limits separate from message ' +
      'creation. The count is an estimate, not a billed message, and it does not use prompt caching. Use ' +
      'it to budget against rate limits and cost, route between models, and fit prompts to a target ' +
      'length. Newer tokenizers produce roughly 30 percent more tokens, so recount against the model you ' +
      'will actually call.',
    examWords: [
      'count_tokens',
      'input_tokens',
      '/v1/messages/count_tokens',
      'token budget',
      'estimate',
    ],
    snippet: {
      language: 'json',
      code: '{ "input_tokens": 14 }',
    },
    keyPoints: [
      { id: 'kp-token-counting-1', text: 'The count_tokens endpoint returns the input_tokens a request would use before you send it.' },
      { id: 'kp-token-counting-2', text: 'It accepts the same inputs as Messages (system, messages, tools, images, PDFs) and returns an estimate, not a billed message.' },
      { id: 'kp-token-counting-3', text: 'It is free to use but has its own requests-per-minute limits, separate from message creation.' },
      { id: 'kp-token-counting-4', text: 'Use it to budget against rate limits and cost, route between models, and fit prompts to a target length.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u2-l3-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does the count_tokens endpoint return?',
      options: [
        'The number of input_tokens a prospective request would use before you send it',
        'The dollar cost of a completed message after it runs',
        'The output tokens the model will generate for a prompt',
        'A cached copy of the prompt for later reuse',
      ],
      answerKey: 0,
      explanation:
        'count_tokens reports the input_tokens a request would consume, so you can check size ahead of time. The ' +
        '"output tokens the model will generate" option is the trap: the endpoint counts input, and output size is ' +
        'not known until generation.',
      misconceptionTag: 'count-tokens-returns-input',
      sourceUrls: [TOKENS],
    },
    {
      id: 'c5-u2-l3-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Before sending a request with a very large attached document, you want to confirm it fits the model window and estimate its cost. What is the cleanest way?',
      options: [
        'Call count_tokens with the same inputs to get the input_tokens estimate first',
        'Send the full request and catch the error if it is too large',
        'Guess the token count from the character length and hope',
        'Enable prompt caching, which reports the exact count for free',
      ],
      answerKey: 0,
      explanation:
        'count_tokens accepts the same inputs (including documents) and returns an estimate you can budget against ' +
        'before spending on a real call. "Send it and catch the error" wastes the request and is the trap, and ' +
        'caching does not exist to report counts.',
      misconceptionTag: 'token-budgeting',
      sourceUrls: [TOKENS, CTXWIN],
    },
    {
      id: 'c5-u2-l3-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A developer avoids count_tokens because "it costs the same as a message and its count uses caching anyway." What is wrong with that reasoning?',
      options: [
        'count_tokens is free to use and does not use caching; it returns an estimate before you send',
        'count_tokens is indeed billed like a message, so the developer is right',
        'count_tokens returns an exact billed count, so caching is required',
        'count_tokens can only be used after a message has already been sent',
      ],
      answerKey: 0,
      explanation:
        'Token counting is free (with its own RPM limits) and returns an estimate; it does not apply caching logic. ' +
        'The claim that it is billed like a message is the misconception being corrected, so treating it as costly ' +
        'is the trap.',
      misconceptionTag: 'count-tokens-is-free',
      sourceUrls: [TOKENS],
    },
    {
      id: 'c5-u2-l3-q04',
      type: 'multi',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are valid uses of count_tokens? Select TWO.',
      options: [
        'Budgeting against rate limits and cost before sending',
        'Making a model-routing decision based on prompt size',
        'Guaranteeing the exact number of billed tokens',
        'Caching the prompt so later calls are cheaper',
        'Generating the model response without a separate Messages call',
      ],
      answerKey: [0, 1],
      explanation:
        'Pre-send budgeting and model routing are exactly what token counting supports. It returns an estimate rather ' +
        'than a guaranteed exact count, does not cache, and does not generate a response, so those three are ' +
        'distractors.',
      misconceptionTag: 'token-counting-uses',
      sourceUrls: [TOKENS],
    },
    {
      id: 'c5-u2-l3-q05',
      type: 'cloze',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: count_tokens accepts the same inputs as the Messages API and returns the ___ for the request, and using it is ___ of charge.',
      blanks: [
        { options: ['input_tokens', 'output_tokens', 'dollar cost'] },
        { options: ['free', 'double the', 'triple the'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The endpoint returns input_tokens and is free to use. "output_tokens" is not what it reports, and it is not ' +
        'billed at all, so the cost options are wrong.',
      misconceptionTag: 'count-tokens-is-free',
      sourceUrls: [TOKENS],
    },
    {
      id: 'c5-u2-l3-q06',
      type: 'mc',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You measured token counts on an older model and are migrating to a newer one. What should you do?',
      options: [
        'Recount with the target model, since its newer tokenizer can produce about 30 percent more tokens',
        'Reuse the old counts unchanged, since tokenization never varies by model',
        'Halve the old counts, since newer models always use fewer tokens',
        'Skip counting entirely, since migration does not affect context fit',
      ],
      answerKey: 0,
      explanation:
        'Newer tokenizers can produce roughly 30 percent more tokens for the same text, so counts must be re-measured ' +
        'against the model you will call. "Tokenization never varies" is the trap that leads to underestimating ' +
        'context fit and cost after migration.',
      misconceptionTag: 'recount-per-model',
      sourceUrls: [TOKENS],
    },
    {
      id: 'c5-u2-l3-q07',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd5',
      conceptId: 'token-counting',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: count_tokens returns an exact, guaranteed token count for your request.',
      options: [
        'False, the count is an estimate that may differ slightly from actual usage',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The documentation calls the count an estimate; actual usage can differ by a small amount. Treat it as a ' +
        'planning number, not a guarantee.',
      misconceptionTag: 'count-is-estimate',
      sourceUrls: [TOKENS],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: you are about to send a huge prompt and want to avoid a too-large error and a surprise bill. How does count_tokens help before you send, and what is one thing it will not do?',
    conceptId: 'token-counting',
    keyPointIds: [
      'kp-token-counting-1',
      'kp-token-counting-2',
      'kp-token-counting-3',
      'kp-token-counting-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 210,
});
