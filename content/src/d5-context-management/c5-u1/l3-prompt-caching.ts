// content/src/d5-context-management/c5-u1/l3-prompt-caching.ts
//
// C5-U1-L3 — Prompt caching: cache_control, up to 4 breakpoints, TTLs, cost multipliers, and
// invalidation. Task statement 5.1 (managing long/expensive context efficiently). Every claim
// traces to the cited page (verified 2026-07-14):
//   CACHE  — "Prompt caching": cache_control marks breakpoints (up to 4); default 5m TTL and 1h
//            option; writes cost 1.25x (5m) / 2x (1h), reads cost 0.1x; prefix hierarchy
//            tools -> system -> messages; changing content at/before a breakpoint invalidates that
//            level and all later ones.
//   CTXWIN — "Context windows": cached prefixes still occupy the context window.
//
// Confusion pair targeted: caching changes what you pay for tokens, not whether they occupy the
// window, and stable-first / volatile-last ordering is what keeps the cache warm.

import { defineLesson } from '../../index';

const CACHE = 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching';
const CTXWIN = 'https://platform.claude.com/docs/en/build-with-claude/context-windows';

export const l3PromptCaching = defineLesson({
  id: 'c5-u1-l3',
  title: 'Prompt caching',
  order: 2,
  concept: {
    conceptId: 'prompt-caching',
    analogy:
      'Prompt caching is a bookmark in a long book. Instead of re-reading every page to reach where you ' +
      'left off, you jump to the bookmark. But if you edit an early page, every bookmark after it moves, ' +
      'so you keep the parts that never change near the front.',
    plainExplanation:
      'Prompt caching reuses a stable prefix of your request so repeated calls skip re-processing it. You ' +
      'mark cache breakpoints with cache_control, up to four per request. The default cache lifetime is 5 ' +
      'minutes, with an optional 1-hour TTL at higher write cost. Cache writes cost more than base input ' +
      '(1.25x for 5 minutes), while cache reads cost only 0.1x. The cached prefix follows the hierarchy ' +
      'tools, then system, then messages; changing anything at or before a breakpoint invalidates that ' +
      'level and everything after it. Cached tokens still occupy the context window; caching changes cost, ' +
      'not window usage.',
    examWords: [
      'cache_control',
      'cache breakpoints',
      'ttl "5m" / "1h"',
      'cache_read_input_tokens',
      'tools -> system -> messages',
    ],
    snippet: {
      language: 'json',
      code: '"cache_control": { "type": "ephemeral", "ttl": "5m" }',
    },
    keyPoints: [
      { id: 'kp-prompt-caching-1', text: 'Prompt caching reuses a stable prefix; you mark up to 4 cache breakpoints with cache_control.' },
      { id: 'kp-prompt-caching-2', text: 'The default cache lifetime is 5 minutes, with an optional 1-hour TTL at higher write cost.' },
      { id: 'kp-prompt-caching-3', text: 'Cache writes cost more than base input (1.25x for 5 minutes) while cache reads cost only 0.1x.' },
      { id: 'kp-prompt-caching-4', text: 'The cached prefix follows tools then system then messages; changing content at or before a breakpoint invalidates that level and everything after it.' },
      { id: 'kp-prompt-caching-5', text: 'Put stable content first and volatile content last so a small change does not invalidate the whole prefix, and remember cached tokens still occupy the window.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u1-l3-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does placing cache_control on a content block do?',
      options: [
        'Marks a cache breakpoint so the prefix up to that point can be reused on later requests',
        'Deletes the block from the context window to save space',
        'Forces the model to call a tool at that point',
        'Guarantees the block is never counted toward the context window',
      ],
      answerKey: 0,
      explanation:
        'cache_control marks a breakpoint, and the request prefix up to it becomes reusable (up to four breakpoints). ' +
        'The "never counted toward the window" option is the trap: caching changes what you pay for those tokens, ' +
        'not whether they occupy the window.',
      misconceptionTag: 'caching-changes-cost-not-window',
      sourceUrls: [CACHE, CTXWIN],
    },
    {
      id: 'c5-u1-l3-q02',
      type: 'mc',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'How do cache reads compare to base input token price?',
      options: [
        'A cache read costs about 0.1x base input, while a 5-minute cache write costs about 1.25x',
        'A cache read costs the same as base input; only writes are discounted',
        'Both reads and writes are free once a breakpoint is set',
        'A cache read costs 2x base input, which is why caching rarely pays off',
      ],
      answerKey: 0,
      explanation:
        'Reads are the big win at roughly a tenth of base input, and a 5-minute write costs a modest 1.25x premium. ' +
        'The "reads cost the same" option is the trap that would make caching pointless, which contradicts the ' +
        'pricing.',
      misconceptionTag: 'cache-read-vs-write-cost',
      sourceUrls: [CACHE],
    },
    {
      id: 'c5-u1-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You send a large fixed set of tool definitions and a long system prompt on every request, followed by a short changing user question. How should you order and cache it?',
      options: [
        'Keep tools and system stable at the front with a breakpoint, and put the changing question last',
        'Put the changing question first so it is cached, then the tools and system',
        'Add a fresh timestamp to the top of the system prompt every request',
        'Cache the user question only and never cache the tools or system prompt',
      ],
      answerKey: 0,
      explanation:
        'The cache prefix runs tools then system then messages, so stable-first, volatile-last keeps the expensive ' +
        'prefix warm while the short question changes freely. Putting the changing question first is the trap: it ' +
        'would sit inside the cached prefix and bust it on every call.',
      misconceptionTag: 'stable-first-volatile-last',
      sourceUrls: [CACHE],
    },
    {
      id: 'c5-u1-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A team caches a long system prompt but injects the current time as the first line of it on every request, and their cache hit rate is near zero. What is the cause?',
      options: [
        'Changing content at the front of the cached prefix invalidates the whole prefix on every request',
        'Cache breakpoints only work on user messages, never on the system prompt',
        'The cache TTL is too long, so old entries block new ones',
        'Prompt caching does not support system prompts at all',
      ],
      answerKey: 0,
      explanation:
        'A timestamp at the top mutates the prefix, and any change at or before a breakpoint invalidates that level ' +
        'and everything after it, so the cache never hits. Moving volatile content to the end fixes it. The ' +
        '"TTL too long" option is the trap: lifetime is not what is busting the cache here.',
      misconceptionTag: 'cache-invalidation',
      sourceUrls: [CACHE],
    },
    {
      id: 'c5-u1-l3-q05',
      type: 'mc',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Which statement about cache lifetimes is correct?',
      options: [
        'The default TTL is 5 minutes, and a 1-hour TTL is available at a higher write cost',
        'The only available TTL is 1 hour',
        'Caches never expire once written',
        'The default TTL is 24 hours to match the Batches API',
      ],
      answerKey: 0,
      explanation:
        'The default cache lifetime is 5 minutes and refreshes on use, with a 1-hour option that costs more to write. ' +
        'The "never expire" option is the trap: ephemeral caches do expire, which is why frequently used prefixes ' +
        'stay warm and rare ones may need the 1-hour TTL.',
      misconceptionTag: 'cache-ttl',
      sourceUrls: [CACHE],
    },
    {
      id: 'c5-u1-l3-q06',
      type: 'multi',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two changes invalidate a cached prefix? Select TWO.',
      options: [
        'Changing the tool definitions, which invalidates tools, system, and messages',
        'Editing content that sits at or before a cache breakpoint',
        'Reading from the cache within the 5-minute window',
        'Sending the identical request a second time',
        'Lowering max_tokens while leaving the prefix unchanged',
      ],
      answerKey: [0, 1],
      explanation:
        'Tool-definition changes invalidate the whole hierarchy, and editing anything at or before a breakpoint ' +
        'invalidates that level onward. Reading the cache and re-sending an identical request are exactly the hits ' +
        'you want, not invalidations, so they are distractors.',
      misconceptionTag: 'cache-invalidation',
      sourceUrls: [CACHE],
    },
    {
      id: 'c5-u1-l3-q07',
      type: 'cloze',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the cache prefix follows the order tools, then ___, then messages, and a request may define up to ___ cache breakpoints.',
      blanks: [
        { options: ['system', 'thinking', 'temperature'] },
        { options: ['4', '2', '10'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The hierarchy is tools, then system, then messages, and you can place up to four breakpoints. ' +
        '"Thinking" is not a prefix level, and the breakpoint cap is four, not two or ten.',
      misconceptionTag: 'cache-hierarchy',
      sourceUrls: [CACHE],
    },
    {
      id: 'c5-u1-l3-q08',
      type: 'mc',
      domain: 'd5',
      conceptId: 'prompt-caching',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'A cached 200k-token document is reused across requests. What is true about its effect on the context window?',
      options: [
        'It still occupies the context window; caching changes its cost, not whether it counts',
        'It no longer counts toward the window because it is cached',
        'It doubles the effective window size',
        'It is moved out of the window into the token cache and freed',
      ],
      answerKey: 0,
      explanation:
        'Cached prefixes still take up context window space; caching lowers what you pay per token, not the token ' +
        'count. The "no longer counts" option is the trap and would let you exceed the window without noticing.',
      misconceptionTag: 'caching-changes-cost-not-window',
      sourceUrls: [CTXWIN, CACHE],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: why do we put the stable system prompt and tools at the front of a request and the changing user question at the end when we want prompt caching to pay off?',
    conceptId: 'prompt-caching',
    keyPointIds: [
      'kp-prompt-caching-1',
      'kp-prompt-caching-2',
      'kp-prompt-caching-3',
      'kp-prompt-caching-4',
      'kp-prompt-caching-5',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
