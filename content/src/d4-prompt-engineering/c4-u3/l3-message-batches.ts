// content/src/d4-prompt-engineering/c4-u3/l3-message-batches.ts
//
// C4-U3-L3 — Message Batches API. Task statement 4.5 (batch processing: 50% cost, latency-tolerant,
// not for blocking work). Claims trace to Anthropic's "Batch processing" page, verified 2026-07-14.
//
// Confusion pair targeted: batches are asynchronous and latency-tolerant (great for high-volume
// overnight work), NOT for blocking, time-sensitive paths.

import { defineLesson } from '../../index';

const BATCH = 'https://platform.claude.com/docs/en/build-with-claude/batch-processing';

export const l3MessageBatches = defineLesson({
  id: 'c4-u3-l3',
  title: 'Message Batches API',
  order: 2,
  concept: {
    conceptId: 'message-batches',
    analogy:
      'The Batches API is the overnight photo lab. Drop off a big pile of jobs, pay about half price, and pick ' +
      'them up later. Great for bulk work, wrong for anything you need back this second.',
    plainExplanation:
      'The Message Batches API processes large volumes of Messages requests asynchronously for 50% less cost. ' +
      'Most batches finish within an hour but can take up to 24 hours; requests that do not complete by then ' +
      'expire. Each request carries a custom_id so you can match results, which may come back in any order. Use ' +
      'batches for high-volume, latency-tolerant work like evaluations or overnight reports, not for blocking, ' +
      'time-sensitive requests.',
    examWords: ['Message Batches API', '50% discount', 'custom_id', '24-hour expiration', 'asynchronous'],
    keyPoints: [
      { id: 'kp-message-batches-1', text: 'The Message Batches API processes large volumes of requests asynchronously at 50% lower cost.' },
      { id: 'kp-message-batches-2', text: 'Most batches finish within an hour but may take up to 24 hours; requests not completed by then expire.' },
      { id: 'kp-message-batches-3', text: 'Each request has a custom_id to correlate results, which can come back in any order.' },
      { id: 'kp-message-batches-4', text: 'Use batches for high-volume, latency-tolerant work like evaluations or overnight reports, not blocking time-sensitive requests.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u3-l3-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What is the main cost benefit of the Message Batches API?',
      options: [
        'Roughly 50% lower cost for asynchronous processing',
        'It is free for the first 100 requests',
        'It removes token costs entirely',
        'It halves response latency',
      ],
      answerKey: 0,
      explanation:
        'Batching trades immediacy for about a 50% cost reduction. It is not free, still bills tokens, and is about cost and ' +
        'throughput rather than lower latency.',
      misconceptionTag: 'batch-cost',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You need to score 50,000 test cases overnight and cost matters more than speed. Which approach fits?',
      options: [
        'The Message Batches API',
        '50,000 synchronous blocking calls',
        'One giant single prompt containing all cases',
        'Streaming each request one at a time',
      ],
      answerKey: 0,
      explanation:
        'A high-volume, latency-tolerant overnight job is the ideal batch workload and gets the cost discount. Synchronous calls ' +
        'cost more, and cramming everything into one prompt or streaming does not fit large-scale offline scoring.',
      misconceptionTag: 'batch-fit',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team uses the Batches API for a pre-merge CI check that must return within seconds, and it stalls the pipeline. What is the mismatch?',
      options: [
        'Batches are asynchronous and latency-tolerant, not for blocking, time-sensitive checks',
        'Batches cost more than synchronous calls',
        'Batches cannot use a JSON schema',
        'Batches accept only one request at a time',
      ],
      answerKey: 0,
      explanation:
        'Batch processing is designed for work that can wait, so it is wrong for a blocking check that needs a fast response. ' +
        'Batches are cheaper, not more expensive, and support many requests, so those distractors are false.',
      misconceptionTag: 'batch-fit',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q04',
      type: 'mc',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'How do you match a batch result back to the request that produced it?',
      options: [
        'The custom_id you assign to each request',
        'The order of results, which is guaranteed',
        'The request timestamp',
        'The model name',
      ],
      answerKey: 0,
      explanation:
        'Each request carries a custom_id used to correlate its result, because results are not guaranteed to return in order. ' +
        'Timestamps and model names do not uniquely identify a request.',
      misconceptionTag: 'custom-id',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q05',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'You submit a large batch during peak demand and some requests are still unprocessed after 24 hours. What happens, and what do you do?',
      options: [
        'Those requests expire and are not billed; resubmit only the expired ones',
        'They keep processing indefinitely until done',
        'The whole batch is deleted and fully rebilled',
        'They automatically convert to synchronous calls',
      ],
      answerKey: 0,
      explanation:
        'Requests that do not finish within the 24-hour window expire and are not billed, so you resubmit just those. The batch ' +
        'is not deleted-and-rebilled, and nothing silently converts to synchronous processing.',
      misconceptionTag: 'batch-expiration',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two describe the Message Batches API correctly? Select TWO.',
      options: [
        'It cuts cost by about 50%',
        'Requests can take up to 24 hours and then expire',
        'Results are guaranteed to return in submission order',
        'It is ideal for real-time chat',
        'It removes the need to set max_tokens',
      ],
      answerKey: [0, 1],
      explanation:
        'The 50% discount and the 24-hour expiration window are accurate. Result order is not guaranteed, it is not for real-time ' +
        'use, and each request still needs a valid max_tokens.',
      misconceptionTag: 'batch-cost',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q07',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A batch request sets stream to true and the API rejects it with a validation error. Why?',
      options: [
        'Streaming is not supported in batches; results come back as one file, not a stream',
        'The stream value must be a string',
        'Batches require streaming to be enabled',
        'The model does not support streaming at all',
      ],
      answerKey: 0,
      explanation:
        'Batch results are returned as a single results file, so streaming is not a supported parameter and is rejected. It is a ' +
        'batch-path limitation, not a type issue or a general lack of streaming support.',
      misconceptionTag: 'batch-unsupported-params',
      sourceUrls: [BATCH],
    },
    {
      id: 'c4-u3-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'message-batches',
      taskStatement: '4.5',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: the Batches API is a good choice when you need the answer back within a second.',
      options: [
        'False, it is asynchronous and latency-tolerant, not for real-time needs',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Batches are built for work that can wait, so they are the wrong tool when a sub-second response is required.',
      misconceptionTag: 'batch-fit',
      sourceUrls: [BATCH],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: when should you reach for the Message Batches API instead of normal synchronous calls, and what is the tradeoff you accept?',
    conceptId: 'message-batches',
    keyPointIds: [
      'kp-message-batches-1',
      'kp-message-batches-2',
      'kp-message-batches-3',
      'kp-message-batches-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
