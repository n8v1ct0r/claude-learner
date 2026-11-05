// content/src/exams/register/d5.ts
//
// EXAM REGISTER — domain d5 (Context Management & Reliability, 15%). 27 scenario-clustered,
// exam-style questions registered directly via defineQuestion (NOT inside a lesson). These are the
// harder register items: each is embedded in one of the six published scenarios where d5 is a
// primary domain, and each is DISTINCT from the d5 lesson-bank questions (dupe detection runs across
// the whole catalog).
//
// Scenario spread (27):
//   customer-support-resolution-agent  q01-q07  (5.1 case facts / 5.2 escalation & ambiguity / 5.3)
//   multi-agent-research-system        q08-q14  (5.3 error propagation / 5.6 provenance / 5.1)
//   code-generation-claude-code        q15-q19  (5.4 large-codebase context, notes, compaction)
//   developer-productivity-tools       q20-q23  (5.4 memory / 5.1 retrieval / 5.3 rate limits)
//   structured-data-extraction         q24-q27  (5.6 grounding & citations / 5.5 human review / 5.1)
//
// Difficulty floor honored: all 27 are difficulty >= 2 (7 at difficulty 3), well above the 60%
// register floor. Types: 22 mc (scenario / spot-bug) + 5 multi-response (each stem states the count).
//
// Length parity (audit CS-1): the correct option must not be identifiable by length or specificity.
// Every distractor is written in the same register and at roughly the same length as the key, so
// "pick the longest option" scores near chance on this file. Distractors are plausible-but-flawed
// (wrong error class, cache-vs-context confusion, heuristic guesses, silent suppression), and each
// is definitively wrong per the cited source. Keep this parity when editing any item.
//
// Every claim traces to an official Anthropic/MCP page on the citation allowlist and was READ with
// WebFetch to confirm it supports the answer key (verified 2026-07-14; re-checked 2026-09-24):
//   BEA          — "Building effective agents": pause for human feedback at checkpoints or blockers;
//                  stopping conditions and guardrails; autonomy trades latency/cost for performance.
//   MULTIAGENT   — "How we built our multi-agent research system": resume from where the error
//                  occurred rather than restart; let the agent know when a tool is failing so it
//                  adapts; a dedicated CitationAgent maps claims to sources after the research loop;
//                  subagents explore in parallel isolated contexts and return condensed summaries;
//                  retain the plan in memory when context would be truncated.
//   CTXENG       — "Effective context engineering for AI agents": context rot / attention budget;
//                  smallest high-signal set; tool-result clearing; just-in-time retrieval via
//                  lightweight identifiers; compaction preserving architectural decisions, unresolved
//                  bugs, and implementation details; structured note-taking to memory outside context;
//                  sub-agents returning a condensed 1,000-2,000 token summary.
//   CTXWIN       — "Context windows": cached prompt prefixes still occupy the context window (caching
//                  changes what you pay, not whether the tokens count); context rot as tokens grow.
//   ERRORS       — "Errors": 400/401/403/404/413/429/500/529 taxonomy; SDKs auto-retry transient
//                  failures (429, 5xx, connection) with exponential backoff, honoring retry-after;
//                  a mid-stream error can arrive after a 200.
//   RATELIMITS   — "Rate limits": per-model RPM/ITPM/OTPM; token bucket replenishes continuously;
//                  429 + retry-after; cached input does not count toward ITPM on most models;
//                  max_tokens does not factor into OTPM.
//   MEMORY       — "Memory tool": stores facts in files outside the context window, read back across
//                  sessions.
//   COMPACT      — "Compaction": server-side summarization near the window limit (beta).
//   REDUCEHALLUC — "Reduce hallucinations": allow "I don't know"; extract exact quotes first for long
//                  docs; verify with citations and retract any claim without a supporting quote;
//                  restrict to provided documents; always validate critical information for
//                  high-stakes decisions.
//   EXAMGUIDE    — the public CCA-F certification page, which links the Exam Guide PDF. Task
//                  statement 5.3 and sample question 8 there state the structured-error-context
//                  claims (failure type, attempted query, partial results) that q14 keys; the
//                  MULTIAGENT post supports them only in part (audit CL-3).

import { defineQuestion } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';
const MULTIAGENT = 'https://www.anthropic.com/engineering/built-multi-agent-research-system';
const CTXENG = 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents';
const CTXWIN = 'https://platform.claude.com/docs/en/build-with-claude/context-windows';
const ERRORS = 'https://platform.claude.com/docs/en/api/errors';
const RATELIMITS = 'https://platform.claude.com/docs/en/api/rate-limits';
const MEMORY = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool';
const COMPACT = 'https://platform.claude.com/docs/en/build-with-claude/compaction';
const REDUCEHALLUC =
  'https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations';
const EXAMGUIDE =
  'https://anthropic.skilljar.com/claude-certified-architect-foundations-certification/444989';

export const registerD5 = [
  // === customer-support-resolution-agent (q01-q07) ==============================================
  defineQuestion({
    id: 'reg-d5-q01',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.2',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'A support agent is midway through an in-policy refund it can complete when the customer types "I want to speak to a human manager now." What should the agent do?',
    options: [
      'Hand off now, since an explicit request to reach a person is itself an escalation trigger',
      'Finish the refund before responding, since a task already in progress outranks a new request',
      'Keep resolving autonomously, because an in-policy refund it can complete is not a policy gap',
      'Escalate only if sentiment analysis also rates the message as frustrated or angry',
    ],
    answerKey: 0,
    explanation:
      'An explicit customer request to reach a human is itself a valid escalation trigger and should be honored immediately, not deferred until the agent finishes. Finishing the refund first treats a task in progress as outranking a clear human instruction, and sentiment is not what decides the handoff here.',
    misconceptionTag: 'honor-explicit-request',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d5-q02',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.1',
    difficulty: 3,
    estimatedSeconds: 30,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'Over a very long support thread the agent summarizes older turns to save space, and later quotes the wrong order total. Which design best prevents losing such exact values?',
    options: [
      'Keep the order id, totals, and dates in a persistent case-facts block outside the summarized history',
      'Summarize the older turns more aggressively so fewer stale tokens compete for the model\'s attention',
      'Cache the whole thread with prompt caching so the earlier turns stay in context at a lower token cost',
      'Rely on the running summary, since a well-prompted summarizer keeps specific figures and dates intact',
    ],
    answerKey: 0,
    explanation:
      'Progressive summarization risks condensing exact numbers and dates, so the values that must survive belong in a persistent case-facts block kept outside the summarized history. Trusting the summary to keep figures intact is the trap, since that is precisely where numbers get lost, and caching only changes what the thread costs, not what a summary drops.',
    misconceptionTag: 'persistent-case-facts',
    sourceUrls: [CTXENG],
  }),
  defineQuestion({
    id: 'reg-d5-q03',
    type: 'multi',
    selectCount: 2,
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.2',
    difficulty: 2,
    estimatedSeconds: 35,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'A support agent\'s escalation policy is under review. Which two are appropriate triggers to escalate to a human? Select TWO.',
    options: [
      'The customer explicitly asks to be transferred to a human agent',
      'The request needs a policy exception the agent is not authorized to grant',
      'Sentiment analysis rates the customer\'s latest message as frustrated or angry',
      'The agent\'s self-reported confidence in its answer has dropped below 90 percent',
      'The conversation has already run for more than twenty turns, whatever its progress',
    ],
    answerKey: [0, 1],
    explanation:
      'An explicit human request and a policy gap the agent cannot resolve are valid triggers, because both are blockers or clear checkpoints. Sentiment and self-reported confidence are poorly calibrated proxies for case complexity, and turn count alone is not a trigger, so those three are distractors.',
    misconceptionTag: 'escalation-triggers',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d5-q04',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd5',
    conceptId: 'error-and-stop-taxonomy',
    taskStatement: '5.3',
    difficulty: 3,
    estimatedSeconds: 30,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'A support agent calls process_refund, which returns a 403 permission_error because the refund exceeds its authorized limit. The agent retries the same call five times with backoff, then reports a system outage. What is the flaw?',
    options: [
      'A 403 is a terminal permission error, so retries cannot help; the over-limit refund needs a human',
      'The backoff was too short: a 403 is transient and clears once the tool\'s rate-limit window replenishes',
      'The agent should switch to a different model, since permission checks are enforced per model',
      'Retry more times with jitter, since a 403 usually resolves itself within a minute or two',
    ],
    answerKey: 0,
    explanation:
      'Permission errors are terminal: the request is not allowed, so no amount of retrying changes the outcome, and the right move is to escalate the over-limit action. Treating a 403 as a transient rate-limit condition is the trap that wastes calls on something backoff can never resolve, and swapping models does not change what the tool permits.',
    misconceptionTag: 'terminal-vs-retryable',
    sourceUrls: [ERRORS, BEA],
  }),
  defineQuestion({
    id: 'reg-d5-q05',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'context-window-mechanics',
    taskStatement: '5.1',
    difficulty: 3,
    estimatedSeconds: 30,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'In a long support conversation the agent must always apply three account restrictions stated in the very first message, but it increasingly ignores them as the thread grows. Which change most directly addresses this?',
    options: [
      'Carry the restrictions in a persistent facts block that stays in the active context on every turn',
      'Move the restrictions into the middle of the history, where surrounding context reinforces them',
      'Drop the oldest turns whenever the thread passes a fixed length so the window stays short',
      'Set a cache breakpoint on the first message so its restrictions are re-read on every turn',
    ],
    answerKey: 0,
    explanation:
      'Details buried deep in a long history lose salience as the window fills, so a persistent high-signal facts block keeps the constraints in front of the model. Moving them into the middle is the trap, since the middle is exactly where recall is weakest, and dropping the oldest turns would discard the very message that states the restrictions.',
    misconceptionTag: 'lost-in-the-middle',
    sourceUrls: [CTXENG, CTXWIN],
  }),
  defineQuestion({
    id: 'reg-d5-q06',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'error-and-stop-taxonomy',
    taskStatement: '5.3',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'A support agent\'s refund tool is temporarily returning 529 overloaded_error, but the customer also asked a question the agent can answer from the knowledge base. What is the best behavior?',
    options: [
      'Answer the knowledge-base question now, retry the refund with backoff, and say that part is pending',
      'Pause the whole conversation until the refund tool recovers, so the customer gets one complete answer',
      'Close the ticket as resolved once the knowledge-base answer is sent, and queue the refund silently',
      'Retry the refund at once in a tight loop, since a 529 typically clears within a few hundred milliseconds',
    ],
    answerKey: 0,
    explanation:
      'A 529 is transient and retryable, so the agent degrades gracefully: deliver what works now and back off on the failing part. Pausing the whole conversation over-reacts to one failing tool, closing the ticket with the refund still queued hides the failure, and a tight retry loop ignores backoff.',
    misconceptionTag: 'graceful-degradation',
    sourceUrls: [ERRORS, BEA],
  }),
  defineQuestion({
    id: 'reg-d5-q07',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.2',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'customer-support-resolution-agent',
    stem: 'A customer says "cancel my subscription," but the account has two active subscriptions on different plans. What should the agent do before acting?',
    options: [
      'Ask which of the two subscriptions to cancel rather than guessing on an ambiguous match',
      'Cancel the more recently created one, since the newer plan is what most cancellation requests mean',
      'Cancel both so the request is fully honored, then offer to reinstate whichever one was unintended',
      'Cancel the first match the tool returns, since results list the primary subscription first',
    ],
    answerKey: 0,
    explanation:
      'Two valid matches ahead of a consequential change is a blocker, so the agent asks for a disambiguating detail instead of guessing. Cancelling the newer plan or the first match returned are heuristic guesses that risk the wrong change, and cancelling both turns one mistake into two.',
    misconceptionTag: 'ambiguity-ask-identifier',
    sourceUrls: [BEA],
  }),

  // === multi-agent-research-system (q08-q14) =====================================================
  defineQuestion({
    id: 'reg-d5-q08',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.3',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'multi-agent-research-system',
    stem: 'In a multi-agent research run, one subagent crashes after three others have already produced substantial work. What does the guidance recommend over restarting the whole run?',
    options: [
      'Resume from where the agent was when the error occurred, preserving the completed work',
      'Restart the whole run from the beginning so that every subagent shares one consistent state',
      'Return the three finished outputs as the final report and leave the crashed subtopic out',
      'Keep the crashed subagent\'s partial state but discard the other three outputs as suspect',
    ],
    answerKey: 0,
    explanation:
      'Restarts are expensive and lose progress, so the system is built to resume from where the agent was when the error occurred. Discarding the completed work of the other subagents is the trap, since it throws away exactly what resuming is meant to save, and shipping the report with the crashed subtopic quietly left out hides a gap the reader needs to know about.',
    misconceptionTag: 'resume-not-restart',
    sourceUrls: [MULTIAGENT],
  }),
  defineQuestion({
    id: 'reg-d5-q09',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.3',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'multi-agent-research-system',
    stem: 'A search tool that a research subagent depends on starts intermittently failing. Which approach does the multi-agent guidance favor?',
    options: [
      'Let the agent know the tool is failing so it can adapt its approach',
      'Hide the failure and pass an empty result set back to the coordinator',
      'Terminate the whole research workflow at the first failed search',
      'Retry the same call silently until it succeeds, without telling the agent',
    ],
    answerKey: 0,
    explanation:
      'Letting the model know a tool is failing so it can adapt works surprisingly well, keeping the run alive. Passing back an empty result set hides the failure and lets the coordinator mistake a broken tool for a real gap, which is the trap the guidance warns against.',
    misconceptionTag: 'tool-failure-adapt',
    sourceUrls: [MULTIAGENT],
  }),
  defineQuestion({
    id: 'reg-d5-q10',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'grounding-and-provenance',
    taskStatement: '5.6',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'multi-agent-research-system',
    stem: 'In the described multi-agent research architecture, when and how does citation happen?',
    options: [
      'After the research loop exits, a dedicated citation agent maps each claim in the report to its source',
      'During gathering, each subagent attaches a plausible-looking citation to every claim it records to save a step',
      'The lead agent cites as it synthesizes, since only it has seen every subagent\'s full transcript',
      'Citations are added only when a human reviewer asks for them after reading the final report',
    ],
    answerKey: 0,
    explanation:
      'Once enough information is gathered, the system exits the research loop and hands all findings to a dedicated citation agent that maps each claim to its specific source location. Attaching plausible-looking citations during gathering is the trap: invented references defeat the auditability the citation step exists to provide, and the lead agent only ever sees condensed summaries, not full transcripts.',
    misconceptionTag: 'citation-step',
    sourceUrls: [MULTIAGENT],
  }),
  defineQuestion({
    id: 'reg-d5-q11',
    type: 'multi',
    selectCount: 2,
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.1',
    difficulty: 3,
    estimatedSeconds: 35,
    scenarioId: 'multi-agent-research-system',
    stem: 'A long multi-agent research run keeps overflowing the lead agent\'s context. Which two techniques keep its context bounded while preserving the work? Select TWO.',
    options: [
      'Have subagents explore in their own context windows and return only condensed summaries',
      'Persist the research plan and key facts to memory outside the context window',
      'Forward every subagent\'s full transcript to the lead agent so nothing is lost in summarization',
      'Set a cache breakpoint on the lead agent\'s history so cached turns stop counting toward the window',
      'Raise the lead agent\'s temperature so it writes shorter, more focused synthesis messages',
    ],
    answerKey: [0, 1],
    explanation:
      'Subagents exploring in isolated contexts and returning condensed summaries, plus persisting the plan and key facts to external memory, both bound the lead agent\'s context without losing work. Forwarding full transcripts re-floods the context, cached tokens still occupy the window, and temperature does not reclaim space, so those three are distractors.',
    misconceptionTag: 'bounded-context-multiagent',
    sourceUrls: [MULTIAGENT, CTXENG],
  }),
  defineQuestion({
    id: 'reg-d5-q12',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.3',
    difficulty: 3,
    estimatedSeconds: 30,
    scenarioId: 'multi-agent-research-system',
    stem: 'The lead agent synthesizes a final report, but one subtopic\'s subagent had failed and returned nothing, and the report presents the remaining subtopics as a complete answer with no caveat. What should the synthesis have done?',
    options: [
      'Annotate the coverage gap so the report flags the subtopic that could not be researched',
      'Omit the failed subtopic from the outline so the report reads as one complete answer',
      'Restart every subagent from scratch to refill the gap before writing anything',
      'Mark every subtopic as low confidence, since a single failure taints the entire synthesis',
    ],
    answerKey: 0,
    explanation:
      'Presenting partial coverage as complete hides a failure the reader needs to know about, so the synthesis should annotate the gap. Quietly omitting the failed subtopic is the trap, since it makes an incomplete report look thorough, while restarting everything or downgrading every subtopic over-reacts to a single failure.',
    misconceptionTag: 'annotate-coverage-gaps',
    sourceUrls: [MULTIAGENT],
  }),
  defineQuestion({
    id: 'reg-d5-q13',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'grounding-and-provenance',
    taskStatement: '5.6',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'multi-agent-research-system',
    stem: 'To make a research report auditable, the team wants a self-check after drafting. Which method matches the hallucination-reduction guidance?',
    options: [
      'Have the model find a supporting quote for each drafted claim and drop any claim without one',
      'Have the model rate its confidence per claim and keep everything scored above 80 percent',
      'Raise max_tokens so the model can write fuller, more confidently worded claims in the draft',
      'Remove the source documents before drafting so the model reasons from its own knowledge',
    ],
    answerKey: 0,
    explanation:
      'Verifying with citations means finding a supporting quote for each claim and retracting any claim without one, which makes the report auditable. Trusting a self-reported confidence score is the trap, because that signal is poorly calibrated and does not check claims against the sources.',
    misconceptionTag: 'verify-with-citations',
    sourceUrls: [REDUCEHALLUC],
  }),
  defineQuestion({
    id: 'reg-d5-q14',
    type: 'multi',
    selectCount: 2,
    domain: 'd5',
    conceptId: 'escalation-and-degradation',
    taskStatement: '5.3',
    difficulty: 2,
    estimatedSeconds: 35,
    scenarioId: 'multi-agent-research-system',
    stem: 'A research subagent cannot finish its subtopic because its primary source is unreachable. Which two things should it report so the lead agent can adapt? Select TWO.',
    options: [
      'What failed, including the tool it called and the query it attempted',
      'Any partial results it gathered before the source became unreachable',
      'A generic "source unavailable" status once its own retries are exhausted',
      'An empty result set marked as successful, so the lead agent simply moves on',
      'The complete raw stack trace and HTTP logs pasted into its final report',
    ],
    answerKey: [0, 1],
    explanation:
      'Structured error context, meaning what failed plus any partial results, is what lets the lead agent adapt and reassign. A generic status after retries, an empty result marked successful, and a raw log dump all strip out or bury the context the coordinator needs.',
    misconceptionTag: 'structured-error-context',
    sourceUrls: [MULTIAGENT, EXAMGUIDE],
  }),

  // === code-generation-claude-code (q15-q19) =====================================================
  defineQuestion({
    id: 'reg-d5-q15',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.4',
    difficulty: 3,
    estimatedSeconds: 30,
    scenarioId: 'code-generation-claude-code',
    stem: 'Late in a long Claude Code session on a large repo, the agent starts suggesting "typical" implementations that ignore the project conventions it had discovered earlier. What best explains and addresses this?',
    options: [
      'Extended-session degradation: persist the discovered conventions to a notes file and re-read them',
      'Insufficient sampling diversity: raise the temperature so the model revisits the specific patterns it found',
      'A repository too small to learn from: the model needs more files in context before patterns become visible',
      'Prompt cache expiry: re-warm the cache so the earlier discoveries are served from the cache once again',
    ],
    answerKey: 0,
    explanation:
      'As a session runs long, recall of earlier discovered specifics degrades and the model drifts toward generic patterns, so persisting findings to external notes and compaction counter it. Blaming sampling or repository size is the trap, since the conventions were discovered and just need to be preserved and re-surfaced, and a prompt cache only changes what the context costs, not what the model recalls from it.',
    misconceptionTag: 'extended-session-degradation',
    sourceUrls: [CTXENG],
  }),
  defineQuestion({
    id: 'reg-d5-q16',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'compaction-and-memory',
    taskStatement: '5.4',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'code-generation-claude-code',
    stem: 'A coding agent must carry key decisions (chosen library, an unresolved bug, the file layout) across a context reset partway through a large refactor. Which technique fits?',
    options: [
      'Structured note-taking: write the decisions to a file outside the context and reload it afterward',
      'Prompt caching: cache the decisions with a one-hour TTL so they survive the context reset at low cost',
      'Extended thinking: keep the earlier turns\' thinking blocks so the model can re-derive its own choices',
      'Just-in-time retrieval: re-open every file touched so far and infer the decisions from their diffs',
    ],
    answerKey: 0,
    explanation:
      'Notes persisted to memory outside the context window survive a reset and can be pulled back in later, which is what structured note-taking is for. Re-deriving the decisions from the files is the trap, since it wastes work and risks losing choices the earlier session already made, and a prompt cache stores a prefix for reuse, not decisions for a fresh context.',
    misconceptionTag: 'scratchpad-notes',
    sourceUrls: [CTXENG],
  }),
  defineQuestion({
    id: 'reg-d5-q17',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'compaction-and-memory',
    taskStatement: '5.4',
    difficulty: 2,
    estimatedSeconds: 30,
    volatile: true,
    scenarioId: 'code-generation-claude-code',
    stem: 'As a long coding session nears the window limit, compaction kicks in. What does good compaction specifically try to preserve?',
    options: [
      'Architectural decisions, unresolved bugs, and implementation details',
      'Only the latest user turn, with everything before it discarded',
      'The full token-by-token transcript, with nothing dropped',
      'The raw tool outputs and thinking blocks, rather than the decisions they led to',
    ],
    answerKey: 0,
    explanation:
      'Compaction summarizes older context while deliberately preserving architectural decisions, unresolved bugs, and implementation details so work continues coherently. Keeping only the latest turn is the trap, since it drops the very decisions the rest of the task depends on, while redundant tool outputs are exactly what compaction is meant to discard.',
    misconceptionTag: 'compaction-preserves',
    sourceUrls: [CTXENG, COMPACT],
  }),
  defineQuestion({
    id: 'reg-d5-q18',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.4',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'code-generation-claude-code',
    stem: 'A coding agent reviewing a large change keeps missing issues when it loads every changed file into one prompt at once. Which strategy reduces attention dilution?',
    options: [
      'Do focused per-file passes, then a separate cross-file integration pass',
      'Load every changed file plus the full repository history into one review prompt',
      'Review only the first file in the change and extrapolate its findings to the rest',
      'Raise max_tokens so every file fits in a single review pass',
    ],
    answerKey: 0,
    explanation:
      'Cramming every file into one prompt dilutes the attention budget, so per-file passes plus a dedicated cross-file integration pass keep each pass high-signal. Raising max_tokens to fit everything is the trap, since a fuller prompt worsens the dilution rather than fixing it.',
    misconceptionTag: 'per-file-then-integration',
    sourceUrls: [CTXENG],
  }),
  defineQuestion({
    id: 'reg-d5-q19',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.4',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'code-generation-claude-code',
    stem: 'A Claude Code agent must understand a sprawling module before editing, but reading the whole module into the main context floods it. What keeps the main context clean?',
    options: [
      'Hand the exploration to a subagent that returns only a condensed summary to the main agent',
      'Read every file in the module into the main context up front so no dependency is overlooked',
      'Cache the module with prompt caching so its files no longer count toward the main context',
      'Turn off compaction for the session so the full exploration output is retained verbatim',
    ],
    answerKey: 0,
    explanation:
      'A subagent explores in its own isolated context and hands back a distilled summary, keeping the main context high-signal. Reading every file into the main context is the trap, since it re-creates the exact flooding the delegation is meant to avoid, and cached tokens still occupy the window.',
    misconceptionTag: 'subagent-isolates-exploration',
    sourceUrls: [CTXENG],
  }),

  // === developer-productivity-tools (q20-q23) ====================================================
  defineQuestion({
    id: 'reg-d5-q20',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'compaction-and-memory',
    taskStatement: '5.4',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'developer-productivity-tools',
    stem: 'A developer-productivity assistant needs to remember a user\'s project conventions across separate sessions on different days. Which mechanism fits?',
    options: [
      'The memory tool, which keeps facts in files outside the context window and reads them back later',
      'Prompt caching, which keeps the conventions available to later requests for about five minutes',
      'A 1M context window, which carries previous sessions forward into each new one automatically',
      'Compaction, which carries a server-side summary of the conversation into future sessions',
    ],
    answerKey: 0,
    explanation:
      'The memory tool persists facts in files outside the context window and reads them back across sessions, which is exactly the cross-day requirement. Prompt caching is the trap, since its ephemeral lifetime is measured in minutes and does not carry facts across separate sessions, and neither a larger window nor compaction outlives the conversation it belongs to.',
    misconceptionTag: 'memory-across-sessions',
    sourceUrls: [MEMORY],
  }),
  defineQuestion({
    id: 'reg-d5-q21',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.1',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'developer-productivity-tools',
    stem: 'A dev-tools agent works over thousands of files. Instead of pre-loading them all, what does the context-engineering guidance recommend?',
    options: [
      'Keep lightweight identifiers such as file paths and load a file\'s contents only when it is needed',
      'Embed every file in the system prompt at startup so the full repository is always in context',
      'Fine-tune the model on the repository before each session so its files never need to be loaded at all',
      'Cache the whole repository with prompt caching so its tokens stop counting toward the window',
    ],
    answerKey: 0,
    explanation:
      'Just-in-time retrieval keeps lightweight references and pulls file contents in at runtime, spending the attention budget only on what a task touches. Caching the whole repo is the trap, since caching lowers token cost but the tokens still occupy the context window.',
    misconceptionTag: 'just-in-time-retrieval',
    sourceUrls: [CTXENG, CTXWIN],
  }),
  defineQuestion({
    id: 'reg-d5-q22',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'rate-limits-and-streaming',
    taskStatement: '5.3',
    difficulty: 3,
    estimatedSeconds: 30,
    scenarioId: 'developer-productivity-tools',
    stem: 'A developer-productivity tool fires 60 quick completion requests in the first two seconds of a 60-RPM window and gets 429s, even though it is "under 60 per minute." Why?',
    options: [
      'Rate limits use a continuously replenishing token bucket, so a two-second burst can exceed capacity',
      'The 60-RPM budget resets only at the top of each minute, so requests sent early in the minute all fail',
      'A 429 is terminal for the rest of the minute, so the tool must stop sending until the window rolls over',
      'The burst tripped the output-token limit, since the max_tokens value on each request counts toward OTPM',
    ],
    answerKey: 0,
    explanation:
      'The token bucket replenishes capacity continuously, so a 60-RPM limit behaves like roughly one request per second and a two-second burst of 60 trips it. The "resets at the top of each minute" option is the fixed-window mental model the docs explicitly contrast against, a 429 arrives with a retry-after and is not terminal, and max_tokens does not factor into OTPM.',
    misconceptionTag: 'token-bucket-burst',
    sourceUrls: [RATELIMITS],
  }),
  defineQuestion({
    id: 'reg-d5-q23',
    type: 'multi',
    selectCount: 2,
    domain: 'd5',
    conceptId: 'context-engineering',
    taskStatement: '5.1',
    difficulty: 2,
    estimatedSeconds: 35,
    scenarioId: 'developer-productivity-tools',
    stem: 'A dev-productivity agent\'s context fills with old command outputs and stale file dumps during a long session. Which two moves most directly reclaim high-signal space? Select TWO.',
    options: [
      'Clear or trim older tool results that the current step no longer needs',
      'Load large files just in time, only when a step actually references them',
      'Copy every prior command\'s full output verbatim into a running summary block',
      'Add a cache breakpoint after the file dumps so their tokens are served from cache',
      'Raise max_tokens so each turn has room for the accumulated outputs',
    ],
    answerKey: [0, 1],
    explanation:
      'Clearing stale tool results and retrieving heavy files only on demand both cut low-signal tokens out of the window. Copying full outputs into a summary, caching the dumps, and raising max_tokens do not reclaim context space, since cached tokens still occupy the window, so they are distractors.',
    misconceptionTag: 'reclaim-context',
    sourceUrls: [CTXENG],
  }),

  // === structured-data-extraction (q24-q27) ======================================================
  defineQuestion({
    id: 'reg-d5-q24',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'grounding-and-provenance',
    taskStatement: '5.6',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'structured-data-extraction',
    stem: 'An extraction pipeline pulls figures from 50-page financial filings and occasionally reports values that are not in the document. Which technique most directly grounds it?',
    options: [
      'Have the model extract exact quotes from the filing first and base every value only on those quotes',
      'Lower the temperature to zero so the model reports exactly the same figures on every run',
      'Remove the filing from the prompt and let the model answer from its general knowledge of the company',
      'Raise max_tokens so the model can reproduce the whole filing in the response before extracting',
    ],
    answerKey: 0,
    explanation:
      'Extracting word-for-word quotes first and grounding the output in them is the recommended technique for long documents and directly curbs fabricated values. Removing the source is the trap, since stripping the grounding invites the model to invent figures from general knowledge, and a zero temperature only makes a fabricated value repeatable.',
    misconceptionTag: 'quote-extraction-first',
    sourceUrls: [REDUCEHALLUC],
  }),
  defineQuestion({
    id: 'reg-d5-q25',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'grounding-and-provenance',
    taskStatement: '5.1',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'structured-data-extraction',
    stem: 'In a document-extraction task, some documents simply do not contain the requested field, and the model keeps fabricating plausible values to fill it. What is the best fix?',
    options: [
      'Give the model explicit permission to report the value as not found, backed by a nullable field',
      'Require a value for every field, since a strict output schema forces the model to search the document harder',
      'Lower the temperature so any filled-in value is at least consistent from run to run',
      'Retry the request until a value appears, treating an empty field as a transient failure',
    ],
    answerKey: 0,
    explanation:
      'Giving the model permission to admit it does not know, backed by a nullable field, prevents fabrication when the source lacks the value. Forcing a value for every field is the trap, since it guarantees a confident hallucination whenever the document is silent.',
    misconceptionTag: 'permission-to-abstain',
    sourceUrls: [REDUCEHALLUC],
  }),
  defineQuestion({
    id: 'reg-d5-q26',
    type: 'mc',
    variant: 'scenario',
    domain: 'd5',
    conceptId: 'grounding-and-provenance',
    taskStatement: '5.5',
    difficulty: 2,
    estimatedSeconds: 30,
    scenarioId: 'structured-data-extraction',
    stem: 'An extraction system reports 95 percent aggregate field accuracy, and the team wants to auto-approve all outputs. What does the hallucination guidance caution?',
    options: [
      'Keep validating critical information for high-stakes decisions instead of trusting one aggregate number',
      'A 95 percent aggregate is above the threshold at which per-field human review becomes unnecessary',
      'Once the model reports over 90 percent confidence on a field, that field no longer needs review',
      'Auto-approve now and rely on downstream complaints to surface document types where accuracy is lower',
    ],
    answerKey: 0,
    explanation:
      'These techniques reduce but do not eliminate hallucinations, so critical information should always be validated for high-stakes decisions. Treating a 95 percent aggregate as a guarantee is the trap, since one headline number can mask failures on the specific fields and document types that matter most.',
    misconceptionTag: 'aggregate-masks-failures',
    sourceUrls: [REDUCEHALLUC],
  }),
  defineQuestion({
    id: 'reg-d5-q27',
    type: 'multi',
    selectCount: 3,
    domain: 'd5',
    conceptId: 'grounding-and-provenance',
    taskStatement: '5.6',
    difficulty: 2,
    estimatedSeconds: 35,
    scenarioId: 'structured-data-extraction',
    stem: 'A team is hardening a structured-extraction pipeline against hallucinated values. Which three techniques from the hallucination guidance apply? Select THREE.',
    options: [
      'Restrict the model to the provided documents rather than its general knowledge',
      'Extract supporting quotes first and base each field on them',
      'Allow the model to mark a field as not found when the source lacks it',
      'Raise the temperature so the model explores more candidate values per field',
      'Increase max_tokens so the model has room to fill every field in the schema',
    ],
    answerKey: [0, 1, 2],
    explanation:
      'Restricting the model to the provided documents, grounding fields in extracted quotes, and allowing a not-found marker all curb fabrication. Raising temperature and max_tokens do not reduce hallucination, so they are distractors that change output randomness or volume rather than grounding.',
    misconceptionTag: 'extraction-grounding-techniques',
    sourceUrls: [REDUCEHALLUC],
  }),
];
