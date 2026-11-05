// content/src/exams/register/d1.ts
//
// EXAM REGISTER — Domain 1 (Agentic Architecture & Orchestration), 49 scenario-clustered items.
// These are standalone, harder exam-style questions registered via defineQuestion (NOT attached to a
// lesson). Each item lives inside one of the published exam scenarios where D1 is a primary domain and
// traces to an official task statement (content/official-task-statements.md, 1.1-1.7). Every answer key
// was re-derived from the cited Anthropic docs (WebFetch-verified 2026-07-14):
//
//   BEA  — https://www.anthropic.com/engineering/building-effective-agents
//   MARS — https://www.anthropic.com/engineering/multi-agent-research-system
//   SUB  — https://code.claude.com/docs/en/agent-sdk/subagents
//   SESS — https://code.claude.com/docs/en/agent-sdk/sessions
//   HOOK — https://code.claude.com/docs/en/agent-sdk/hooks
//   STOP — https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
//
// Scenario spread (49): multi-agent-research-system 16 · customer-support-resolution-agent 15 ·
// code-generation-claude-code 11 · developer-productivity-tools 7. Difficulty >=2 on 46/49 (94%).
// Distractors are plausible-but-flawed architectures; every explanation dissects the tempting one.
// These are authored FRESH and are distinct from the D1 lesson bank (dupe detection runs across all).
//
// Length parity (CS-1, 2026-09-24): distractors are written at the same length, register and
// specificity as the key, and the key's length rank is varied item to item (longest in <=30% of
// single-answer items, shortest in <=30%), so "pick the longest option" scores near chance. Every
// distractor was re-checked against the cited page so none is accidentally correct or arguable.

import { defineQuestion } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';
const MARS = 'https://www.anthropic.com/engineering/multi-agent-research-system';
const SUB = 'https://code.claude.com/docs/en/agent-sdk/subagents';
const SESS = 'https://code.claude.com/docs/en/agent-sdk/sessions';
const HOOK = 'https://code.claude.com/docs/en/agent-sdk/hooks';
const STOP = 'https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons';

const MARS_SCENARIO = 'multi-agent-research-system';
const CSR_SCENARIO = 'customer-support-resolution-agent';
const CGC_SCENARIO = 'code-generation-claude-code';
const DPT_SCENARIO = 'developer-productivity-tools';

export const registerD1 = [
  // ===================================================================================================
  // SCENARIO: multi-agent-research-system (16) — coordinator/subagent orchestration, spawning,
  // token economics, structured returns, session forking.
  // ===================================================================================================
  defineQuestion({
    id: 'reg-d1-q01',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.2',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'In a multi-agent research system, a user submits a broad question. What is the lead (coordinator) agent\'s core job before any subagent runs?',
    options: [
      'Analyze the query, develop a strategy, and decompose it into subtasks for subagents',
      'Spawn one subagent for every sentence in the user\'s query, then stitch their raw transcripts together as the answer',
      'Answer the question itself, spawning subagents only if its context runs low',
      'Ask each subagent to independently restate the full original query',
    ],
    answerKey: 0,
    explanation:
      'The lead agent analyzes the query, develops a strategy, and spawns subagents to explore different aspects, ' +
      'decomposing the query into subtasks it describes to them. Having the coordinator answer directly defeats the ' +
      'parallel design, and one-subagent-per-sentence ignores that decomposition is by aspect, not by surface text.',
    misconceptionTag: 'coordinator-role',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q02',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A research coordinator needs five subagents to explore five independent subtopics at the same time. How does it launch them so they run in parallel rather than one after another?',
    options: [
      'Issue multiple Agent (Task) tool calls in a single response',
      'Issue one Agent call, wait for its result, then issue the next',
      'Raise max_turns so a single subagent can loop through all five subtopics',
      'Ask one subagent to cover all five subtopics in sequence',
    ],
    answerKey: 0,
    explanation:
      'Parallel spawning means placing multiple Agent (Task) tool calls in one response, so the subagents run ' +
      'concurrently and finish in the time of the slowest. Calling them one at a time is sequential, and looping a ' +
      'single subagent or having it cover every subtopic removes the parallelism that cuts research time.',
    misconceptionTag: 'parallel-spawning',
    sourceUrls: [MARS, SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q03',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'An early research system had subagents duplicate each other\'s work and leave gaps. What should the coordinator put in each subagent\'s task description to fix this?',
    options: [
      'An objective, an output format, guidance on tools and sources, and clear task boundaries',
      'Only the original user query, verbatim, so each subagent stays fully general',
      'A fixed step-by-step script of searches the subagent must follow exactly',
      'The full transcripts of the other subagents so they can coordinate',
    ],
    answerKey: 0,
    explanation:
      'Each subagent needs an objective, an output format, guidance on tools and sources, and clear task boundaries; ' +
      'vague instructions cause duplicated work and gaps. Passing only the raw query keeps them too general, and a ' +
      'rigid step-by-step script fights the model-driven flexibility that makes subagents useful.',
    misconceptionTag: 'vague-subagent-task',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q04',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A coordinator spawns a subagent to analyze a specific file it already located, but the subagent reports it cannot find the file. What is the most likely cause?',
    options: [
      'The subagent starts with a fresh context, so the file path must be passed in its prompt',
      'Subagents inherit the parent conversation automatically, so a bug in the SDK must have dropped the path',
      'Subagents cannot read files themselves and must hand the read back to the coordinator to perform',
      'The coordinator has to compact its context before the file path can transfer to the subagent',
    ],
    answerKey: 0,
    explanation:
      'A subagent\'s context window starts fresh with no parent history, so anything it needs, like a file path, must ' +
      'be passed explicitly in the Agent tool\'s prompt. The belief that subagents auto-inherit the parent conversation ' +
      'is exactly the misconception that produces missing-context failures.',
    misconceptionTag: 'subagent-context-inheritance',
    sourceUrls: [SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q05',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.2',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A coordinator splits a research question so narrowly that several important angles are never assigned to any subagent. Which risk is this, and the fix?',
    options: [
      'Narrow decomposition causes coverage gaps; the coordinator should map the space and adapt delegation',
      'Path dependency between subagents; the coordinator should give every subagent the same instructions so they converge',
      'Token overinvestment; the coordinator should merge the subagents into one agent',
      'Context rot; the coordinator should stop spawning subagents and search alone',
    ],
    answerKey: 0,
    explanation:
      'Narrow decomposition leaves angles unassigned, producing coverage gaps, so the coordinator must decompose ' +
      'thoughtfully and adapt as dependencies emerge. Identical instructions would instead cause duplicated work, the ' +
      'opposite failure, and merging into one agent abandons the parallel design.',
    misconceptionTag: 'decomposition-coverage-gap',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q06',
    type: 'multi',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'Which two practices make parallel subagent spawning effective in a research system? Select TWO.',
    options: [
      'The lead agent spins up several subagents in parallel rather than serially',
      'Each subagent is given a clear objective and task boundaries',
      'Every subagent receives the identical broad query with no boundaries',
      'Each subagent re-derives the research plan from the raw user query before it starts searching',
      'The lead waits for each subagent to finish before starting the next',
    ],
    answerKey: [0, 1],
    explanation:
      'Spinning up subagents in parallel and giving each a clear objective with boundaries are what cut research time ' +
      'and prevent duplicated effort. Identical unbounded queries cause overlap, re-deriving the plan per subagent ' +
      'duplicates the lead\'s job, and serial waiting removes the parallelism entirely.',
    misconceptionTag: 'parallel-spawning',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q07',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'multi-agent-economics',
    taskStatement: '1.2',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A team hesitates to adopt a multi-agent research design because it costs far more per run. Which framing matches the guidance on when that cost is justified?',
    options: [
      'Multi-agent systems use about 15x the tokens of a chat, so reserve them for high-value, parallelizable tasks',
      'Multi-agent systems use about 4x the tokens of a chat, the same as a single agent, so cost rarely changes the decision',
      'Token usage explains most of the performance variance, so adding more agents pays for itself on nearly any task',
      'Multi-agent runs cost about the same as a single chat, so use them by default',
    ],
    answerKey: 0,
    explanation:
      'Multi-agent systems use roughly 15x the tokens of a chat, so they pay off only when the task value is high and ' +
      'the work parallelizes across more information than one context can hold. The 4x figure describes a single agent, ' +
      'and the claims that they cost about what a chat does, or that more agents pay for themselves on any task, ignore ' +
      'the token multiplier that drives the decision.',
    misconceptionTag: 'token-economics',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q08',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.2',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A research system lets subagents send findings directly to one another to "stay in sync." Reviewers flag this as an orchestration bug. What is the correct design?',
    options: [
      'Route inter-subagent communication through the coordinator, which aggregates and re-delegates',
      'Keep the direct subagent-to-subagent messaging but back it with a shared scratchpad file every subagent can edit',
      'Have each subagent broadcast its findings to all the others after every tool call so nobody works on stale data',
      'Merge the two most active subagents into one so the remaining peers have fewer messages to exchange',
    ],
    answerKey: 0,
    explanation:
      'In hub-and-spoke orchestration, subagents do not talk to each other; the coordinator collects their structured ' +
      'results, synthesizes, and re-delegates. Direct peer messaging and broadcasting recreate the coordination overhead ' +
      'and path dependencies the hub design exists to avoid.',
    misconceptionTag: 'inter-subagent-comms',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q09',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'Research subagents each gather facts from different sources. What should they return to the coordinator so the final report can attribute every claim correctly?',
    options: [
      'Structured findings including the key facts and their source URLs and metadata',
      'A prose summary with the source URLs removed to save context',
      'The raw documents, leaving extraction and citation to the lead',
      'A single confidence score for the subtopic with no facts attached',
    ],
    answerKey: 0,
    explanation:
      'Subagents should return structured data, including source URLs and metadata, so the coordinator and a citation ' +
      'step can map each claim back to its source. Dropping the sources or returning only a confidence score breaks ' +
      'attribution, and dumping raw documents pushes the extraction work back onto the coordinator.',
    misconceptionTag: 'structured-subagent-return',
    sourceUrls: [MARS, SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q10',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'agent-sdk',
    taskStatement: '1.7',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A researcher wants to explore two competing hypotheses from the same established baseline of gathered context, keeping both threads independent. Which session feature fits?',
    options: [
      'Fork the session so each branch starts from a copy of the shared history and diverges independently',
      'Resume the one session for both hypotheses in turn, so each thread can read and build on what the other found',
      'Start each hypothesis from an empty session so neither can be biased by the baseline',
      'Compact the session so both hypotheses fit in one condensed thread',
    ],
    answerKey: 0,
    explanation:
      'Forking creates a new session from a copy of the original\'s history that then diverges, leaving the original ' +
      'untouched, which is exactly right for parallel exploration from a shared baseline. Resuming the single session ' +
      'would let the two threads overwrite each other, and empty sessions throw away the shared context.',
    misconceptionTag: 'fork-vs-resume',
    sourceUrls: [SESS],
  }),
  defineQuestion({
    id: 'reg-d1-q11',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.2',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'After its subagents return, a research coordinator finds a gap in coverage. What does the guidance say it should do next?',
    options: [
      'Evaluate the synthesis and re-delegate targeted follow-up queries in another iteration',
      'Restart the whole job from scratch with a fresh set of subagents so no earlier assumptions carry over',
      'Ship the synthesis as it stands, noting the gap, since the subagents have already used their turn',
      'Ask the user to run the missing searches by hand',
    ],
    answerKey: 0,
    explanation:
      'The coordinator synthesizes subagent results and decides whether more research is needed, re-delegating targeted ' +
      'queries in an iterative refinement loop. Shipping the gap ignores the loop, and a full restart throws away good ' +
      'partial results the coordinator already holds.',
    misconceptionTag: 'iterative-refinement',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q12',
    type: 'multi',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'You define a research subagent programmatically with an AgentDefinition. Which two fields directly control what it is for and what it may do? Select TWO.',
    options: [
      'description, which tells the coordinator when to invoke it',
      'tools, which restricts the tool set the subagent may use',
      'temperature, which sets how randomly the subagent samples its replies',
      'max_tokens, which caps the length of the subagent\'s final report',
      'priority, which ranks it against other subagents',
    ],
    answerKey: [0, 1],
    explanation:
      'An AgentDefinition uses description to signal when the subagent should be invoked and tools to restrict what it ' +
      'can do, alongside a prompt and an optional model override. Sampling temperature, a report token cap, and a ' +
      'priority rank are not AgentDefinition fields and play no part in scoping its purpose or permitted actions.',
    misconceptionTag: 'agent-definition-fields',
    sourceUrls: [SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q13',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.6',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A research task is open-ended: the subtasks that are needed depend on what early findings reveal. Which decomposition style fits best?',
    options: [
      'Dynamic decomposition, where the orchestrator determines subtasks from the input as it goes',
      'A fixed prompt chain whose stages are all decided before the run, with a programmatic gate between each stage',
      'A single predefined division into equal parts, set in advance so every subagent gets the same share',
      'No decomposition: one subagent answers everything in a single pass with a large tool budget',
    ],
    answerKey: 0,
    explanation:
      'Open-ended investigation calls for orchestrator-driven dynamic decomposition, where subtasks are determined by ' +
      'the input rather than predefined. A fixed chain or a predetermined equal split assumes you already know the ' +
      'subtasks, which is the case dynamic decomposition exists to handle.',
    misconceptionTag: 'fixed-vs-dynamic-decomposition',
    sourceUrls: [BEA, MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q14',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'multi-agent-economics',
    taskStatement: '1.2',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A task requires every worker to continuously read and update the same evolving shared state in real time. Why is a multi-agent split a poor fit here?',
    options: [
      'Subagents have separate contexts and cannot share one live evolving state, so a single agent fits better',
      'Multi-agent systems are always slower than a single agent, so a single agent is preferred for any latency-sensitive task',
      'Subagents cannot call tools themselves, so none of them could update the shared state',
      'Subagents inherit the parent\'s context window, so splitting the work saves no context at all',
    ],
    answerKey: 0,
    explanation:
      'Subagents run in isolated contexts and cannot continuously share one evolving state, so tightly coupled real-time ' +
      'work belongs in a single agent; multi-agent shines on parallelizable, decomposable tasks instead. The blanket ' +
      'claims that multi-agent is always slower or that subagents cannot use tools are simply false, and subagents start ' +
      'fresh rather than inheriting the parent\'s context.',
    misconceptionTag: 'tightly-coupled-shared-state',
    sourceUrls: [MARS, SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q15',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'In a research pipeline, after subagents return findings, a separate step maps specific claims in the draft report to their exact source locations. What is this step\'s role?',
    options: [
      'A citation step that processes the report and sources to attach precise, verifiable citations',
      'A step that generates plausible-looking citations for any claim the subagents left unsupported, so the report reads as complete',
      'A compaction step that discards the source documents once the draft is written, keeping only the claims to save context',
      'A routing step that selects which model writes the final report',
    ],
    answerKey: 0,
    explanation:
      'A dedicated citation step maps claims in the report to specific source locations, keeping provenance intact. ' +
      'Fabricating citations breaks grounding, discarding sources destroys attribution, and routing merely picks a ' +
      'handler rather than attributing claims.',
    misconceptionTag: 'attribution',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q16',
    type: 'multi',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: MARS_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.2',
    difficulty: 2,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'A team maps out what their research lead agent handles versus what it hands off to workers. Which two tasks are the lead\'s own? Select TWO.',
    options: [
      'Decompose the query and delegate subtasks to subagents',
      'Aggregate subagent results and decide whether more research is needed',
      'Execute every search itself, keeping delegation as a fallback',
      'Forward each subagent\'s raw transcript straight to the user without synthesis',
      'Let the subagents negotiate task ownership among themselves',
    ],
    answerKey: [0, 1],
    explanation:
      'The coordinator decomposes and delegates, then aggregates results and decides whether to iterate. Doing all the ' +
      'searching itself abandons parallelism, and dumping raw transcripts or letting subagents self-negotiate bypasses ' +
      'the coordinator\'s aggregation role.',
    misconceptionTag: 'coordinator-role',
    sourceUrls: [MARS],
  }),

  // ===================================================================================================
  // SCENARIO: customer-support-resolution-agent (15) — agentic loop, deterministic hook enforcement,
  // structured handoffs, multi-concern decomposition.
  // ===================================================================================================
  defineQuestion({
    id: 'reg-d1-q17',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 1,
    estimatedSeconds: 20,
    stem: 'A billing-support agent queries Claude, and the returned message carries stop_reason "tool_use" for a lookup_account call. To keep the resolution loop moving, what must your code do?',
    options: [
      'Run the requested tool, append its result as a tool_result, and make another request to continue',
      'Send the assistant content back unchanged, as for pause_turn, so the server finishes the call',
      'Treat it as a completed turn and return the assistant text to the customer',
      'Raise max_tokens and resend the same request so the truncated call completes',
    ],
    answerKey: 0,
    explanation:
      'stop_reason "tool_use" means Claude is calling a tool: you execute it, append the tool_result, and send another ' +
      'request so the loop continues. Treating it as completion skips the tool execution the model asked for, sending ' +
      'the content back unchanged is the pause_turn recipe, and raising max_tokens applies only to a truncated response.',
    misconceptionTag: 'stop-reason-tool-use',
    sourceUrls: [STOP],
  }),
  defineQuestion({
    id: 'reg-d1-q18',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A support resolution agent should end its turn only when Claude has actually finished. Which signal indicates natural completion?',
    options: [
      'stop_reason "end_turn"',
      'stop_reason "refusal"',
      'stop_reason "pause_turn"',
      'stop_reason "max_tokens"',
    ],
    answerKey: 0,
    explanation:
      'stop_reason "end_turn" indicates Claude finished its response naturally, so that is the clean completion signal. ' +
      '"pause_turn" means send the response back so the server-tool loop can continue, "max_tokens" means the reply was ' +
      'cut off, and "refusal" means Claude declined; none of them marks a finished turn.',
    misconceptionTag: 'natural-completion',
    sourceUrls: [STOP],
  }),
  defineQuestion({
    id: 'reg-d1-q19',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A support agent loop decides it is finished by searching the model\'s reply for phrases like "issue resolved." Why is this the incorrect termination design?',
    options: [
      'Reply text is not a reliable completion signal; branch on stop_reason instead',
      'It is sound, since the model\'s own natural-language statement is the most direct completion signal available',
      'It should stop after exactly one tool call per turn instead, since a resolution never needs more than that',
      'It should keep looping until a max_tokens stop appears, since that is the only guaranteed terminal signal',
    ],
    answerKey: 0,
    explanation:
      'Parsing natural language for termination is an anti-pattern because phrasing varies; the loop should branch on ' +
      'stop_reason ("end_turn" to finish, "tool_use" to continue). Hard-stopping after one tool call, or looping until a ' +
      'max_tokens truncation, both ignore what the model actually signaled.',
    misconceptionTag: 'parse-nl-termination',
    sourceUrls: [STOP],
  }),
  defineQuestion({
    id: 'reg-d1-q20',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.4',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'Policy requires that process_refund can never run for a caller whose identity has not been verified by get_customer. Compliance must be guaranteed, not merely likely. What enforces this best?',
    options: [
      'A PreToolUse hook that blocks process_refund until get_customer has verified the caller',
      'A system-prompt rule that the model must call get_customer first, placed at the top so it is never lost to compaction',
      'A few-shot example in the prompt showing get_customer succeeding before process_refund',
      'A reminder in the process_refund tool description to verify identity first',
    ],
    answerKey: 0,
    explanation:
      'Deterministic compliance needs programmatic enforcement: a hook can block process_refund until the verification ' +
      'precondition holds. Prompt instructions, examples, and reminders shape behavior probabilistically and carry a ' +
      'non-zero failure rate, which is unacceptable when the rule must always hold.',
    misconceptionTag: 'prompt-vs-hook-enforcement',
    sourceUrls: [HOOK],
  }),
  defineQuestion({
    id: 'reg-d1-q21',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.5',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'The business rule is: refunds above $500 must be escalated to a human, never auto-issued. Which mechanism guarantees the refund tool cannot fire above that threshold?',
    options: [
      'A PreToolUse hook that denies the refund call when the amount exceeds $500 and routes it to escalation',
      'A PostToolUse hook that logs any refund over $500 to the escalation queue as soon as the tool has executed',
      'A system-prompt rule stating that refunds over $500 must be escalated, repeated in the refund tool\'s description',
      'A lower temperature so the model follows the $500 rule more consistently',
    ],
    answerKey: 0,
    explanation:
      'A PreToolUse hook inspects the tool input and returns deny before the refund executes, giving a deterministic ' +
      'guarantee and an escalation path. A prompt instruction can be violated, a PostToolUse log fires only after the ' +
      'money moved, and temperature does not enforce policy.',
    misconceptionTag: 'prompt-vs-hook-enforcement',
    sourceUrls: [HOOK],
  }),
  defineQuestion({
    id: 'reg-d1-q22',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.5',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'An architect debates enforcing a refund cap with a strong system prompt versus a PreToolUse hook. Which statement correctly contrasts them for a compliance-critical rule?',
    options: [
      'Hooks give a deterministic guarantee, while prompt instructions are probabilistic and can be violated',
      'Prompt instructions are deterministic once cached; hooks only offer best-effort guidance',
      'Both are equally deterministic, so the choice comes down to code style',
      'Hooks cannot read tool inputs, so only a prompt can check the amount',
    ],
    answerKey: 0,
    explanation:
      'Hooks run code that can hard-block a tool call, a deterministic guarantee, while prompts steer behavior with a ' +
      'non-zero failure rate. The reversed and "equally deterministic" claims misstate this, and hooks can and do inspect ' +
      'tool inputs to make the decision.',
    misconceptionTag: 'prompt-vs-hook-enforcement',
    sourceUrls: [HOOK],
  }),
  defineQuestion({
    id: 'reg-d1-q23',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.5',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A team\'s only safeguard against over-limit refunds is the instruction "never refund over $500" in the system prompt. What is the flaw?',
    options: [
      'Prompt compliance has a non-zero failure rate; a rule that must always hold needs a programmatic gate',
      'There is no flaw, because system-prompt rules are enforced by the API before any tool call is emitted',
      'The flaw is only the threshold: the instruction should say $1000 so the model has more headroom to comply',
      'The flaw is the format: dollar amounts in a system prompt are ignored unless expressed as tool parameters',
    ],
    answerKey: 0,
    explanation:
      'Even good prompts are followed only probabilistically, so a hard financial limit belongs in a PreToolUse hook that ' +
      'deterministically blocks the call. The other options either deny the failure mode or misdiagnose it as a value or ' +
      'formatting issue.',
    misconceptionTag: 'prompt-vs-hook-enforcement',
    sourceUrls: [HOOK],
  }),
  defineQuestion({
    id: 'reg-d1-q24',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.5',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A support agent calls several backend tools that each return differently shaped JSON. The team wants the data normalized to one schema before the model reasons over it. Which hook does this?',
    options: [
      'A PostToolUse hook that transforms each tool\'s output into a consistent shape before the model sees it',
      'A PreToolUse hook, since it runs first and can reshape the result before the tool call is written into the transcript',
      'A Stop hook that rewrites the accumulated tool results once the turn ends',
      'A UserPromptSubmit hook that reformats the customer\'s message',
    ],
    answerKey: 0,
    explanation:
      'PostToolUse fires on the tool result and can rewrite that output into a uniform shape before the model reads it. ' +
      'PreToolUse runs before there is any result to normalize, Stop runs too late, and UserPromptSubmit edits the ' +
      'incoming prompt rather than tool output.',
    misconceptionTag: 'hook-event-timing',
    sourceUrls: [HOOK],
  }),
  defineQuestion({
    id: 'reg-d1-q25',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.4',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'When a support agent escalates a case, the human picking it up has no access to the conversation transcript. What should the agent hand off?',
    options: [
      'A structured summary: customer identifier, root cause, and recommended action',
      'A link that reopens the raw model transcript so the human can read the reasoning end to end',
      'The complete list of tool calls and their raw results, with no interpretation added',
      'The final sentence the model produced, on its own',
    ],
    answerKey: 0,
    explanation:
      'A structured handoff summary, customer identifier, root cause, and recommended action, lets a human act without ' +
      'reading the transcript. Pointing them at the raw transcript, one sentence, or an uninterpreted tool log forces ' +
      'them to reconstruct the case themselves.',
    misconceptionTag: 'structured-handoff',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q26',
    type: 'multi',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.4',
    difficulty: 3,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'A support agent writes a handoff for a human who cannot see the transcript. Which two items make the summary actionable? Select TWO.',
    options: [
      'The customer identifier and the specific issue',
      'The diagnosed root cause and a recommended next action',
      'The model\'s full chain-of-thought for the whole session',
      'A raw dump of every API response received during the session',
      'The token counts for each tool call',
    ],
    answerKey: [0, 1],
    explanation:
      'An actionable handoff gives the human the customer identifier, the diagnosed root cause, and a recommended action. ' +
      'Full chain-of-thought, raw response dumps, and token counts add volume without telling the human what to do next.',
    misconceptionTag: 'structured-handoff',
    sourceUrls: [MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q27',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.4',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A single support ticket raises three unrelated problems at once. What is the recommended way to handle this multi-concern request?',
    options: [
      'Decompose it into the separate concerns, investigate them in parallel, then synthesize one response',
      'Escalate immediately, since any ticket raising several problems is out of scope',
      'Answer the first concern, close the ticket, and let the customer reopen it later',
      'Run all three through one fixed prompt with no decomposition',
    ],
    answerKey: 0,
    explanation:
      'Multi-concern requests should be decomposed, investigated in parallel, and synthesized into a coherent reply. ' +
      'Answering one part, escalating reflexively, or cramming everything into one undifferentiated prompt all drop or ' +
      'blur the distinct issues.',
    misconceptionTag: 'decompose-multi-concern',
    sourceUrls: [MARS, BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q28',
    type: 'multi',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'A resolution agent must know when to end a turn. Which two of these methods for ending it are unreliable? Select TWO.',
    options: [
      'Parsing the assistant\'s natural-language text for a completion phrase',
      'Using an arbitrary maximum-iteration count as the primary stop signal',
      'Branching on stop_reason "end_turn" to detect that the model has finished its turn naturally',
      'Continuing the loop when stop_reason is "tool_use"',
    ],
    answerKey: [0, 1],
    explanation:
      'Reading the reply text for "done" and treating an iteration cap as the main stop are both anti-patterns; the cap ' +
      'is a safety backstop, not the primary signal. Branching on "end_turn" and continuing on "tool_use" are the ' +
      'correct, model-driven behaviors.',
    misconceptionTag: 'loop-termination-antipattern',
    sourceUrls: [STOP],
  }),
  defineQuestion({
    id: 'reg-d1-q29',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 1,
    estimatedSeconds: 20,
    stem: 'In a support agent loop, after a tool runs, why must its tool_result be appended to the message history before the next request?',
    options: [
      'So the model can observe the tool\'s outcome and decide the next action',
      'So the API can automatically run the tool a second time with the same input',
      'Because the tools array must be dropped from the request once a tool has run',
      'Because the tool_result takes the place of the system prompt for the next turn',
    ],
    answerKey: 0,
    explanation:
      'The loop is gather context, act, observe: appending the tool_result lets the model see the outcome and choose what ' +
      'to do next. The tool does not re-run on its own, the tools array must stay the same, and tool_result does not ' +
      'overwrite the system prompt.',
    misconceptionTag: 'tool-result-append',
    sourceUrls: [STOP],
  }),
  defineQuestion({
    id: 'reg-d1-q30',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.5',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A support agent has two independent PreToolUse checks on the refund tool: one may allow it, the other denies it for a policy reason. What is the result when both run?',
    options: [
      'The refund is blocked, because a deny from any hook takes priority over allow',
      'The refund proceeds, because an explicit allow from any hook overrides a deny from the others',
      'The two results cancel out and the call falls back to an ask prompt',
      'Only the hook that finishes first decides the outcome',
    ],
    answerKey: 0,
    explanation:
      'When multiple hooks apply, deny takes priority: a single deny blocks the tool call regardless of other results, ' +
      'which is what makes layered safety checks reliable. Allow does not override deny, and because completion order is ' +
      'non-deterministic, the outcome cannot depend on which hook finishes first.',
    misconceptionTag: 'hook-deny-priority',
    sourceUrls: [HOOK],
  }),
  defineQuestion({
    id: 'reg-d1-q31',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CSR_SCENARIO,
    conceptId: 'agent-guardrails',
    taskStatement: '1.4',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A compliance step must run before a support agent can issue any credit, with zero exceptions. Which choice reflects the guidance on enforcement versus guidance?',
    options: [
      'Use a programmatic prerequisite gate, since prompts guide behavior but cannot guarantee it',
      'Use a detailed system prompt, since a well-written instruction is followed on every run once it is cached',
      'Rely on few-shot examples of the compliance step, since demonstrated behavior makes compliance certain',
      'Trust the model\'s judgment with no gate, to keep the design simple',
    ],
    answerKey: 0,
    explanation:
      'Where compliance must be deterministic, a programmatic gate (hook or prerequisite check) is required because ' +
      'prompt guidance has a non-zero failure rate. Prompts, examples, and unguarded model judgment all leave a chance ' +
      'the step is skipped, which the rule forbids.',
    misconceptionTag: 'prompt-vs-hook-enforcement',
    sourceUrls: [HOOK],
  }),

  // ===================================================================================================
  // SCENARIO: code-generation-claude-code (11) — task decomposition, orchestrator-workers,
  // evaluator-optimizer, ground-truth verification, session resume/fork.
  // ===================================================================================================
  defineQuestion({
    id: 'reg-d1-q32',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.6',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A coding task requires changes across many files, and you cannot predict which files or edits are needed until the work is underway. Which pattern fits?',
    options: [
      'Orchestrator-workers, where a central LLM delegates subtasks it determines from the input',
      'Parallelization by sectioning, where the files are split into fixed groups decided before the run starts',
      'Prompt chaining, where each file edit is a fixed stage that feeds its output into the next stage',
      'Voting, where the same multi-file edit is generated several times and the most common diff is kept',
    ],
    answerKey: 0,
    explanation:
      'Orchestrator-workers suits complex work where subtasks are not predefined but determined by the orchestrator from ' +
      'the input, such as edits across multiple files. Parallelization and fixed chains assume the split is known in ' +
      'advance, and voting re-runs the same task rather than decomposing it.',
    misconceptionTag: 'orchestrator-vs-parallelization',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q33',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.6',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A large refactor spans dozens of files. To keep the model\'s attention sharp, how should the work be decomposed?',
    options: [
      'Run per-file local passes, then a separate cross-file integration pass',
      'Run one pass over the whole repository so nothing is missed',
      'Refactor the largest file first and mirror its changes elsewhere',
      'Run every file in its own session with no summary shared between them',
    ],
    answerKey: 0,
    explanation:
      'Per-file local passes plus a dedicated cross-file integration pass avoid the attention dilution of trying to hold ' +
      'every file at once. A single whole-repo pass dilutes focus, refactoring one file ignores the rest, and fully ' +
      'isolated sessions with no integration miss cross-file consistency.',
    misconceptionTag: 'attention-dilution',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q34',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'orchestrator-and-evaluator',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A code-generation agent produces a function, and you have a clear, automatable quality bar (a failing test to satisfy). Which pattern iterates toward correctness?',
    options: [
      'Evaluator-optimizer: one call generates, another evaluates against the criteria, in a loop',
      'Prompt chaining: generate the function in one call and reformat it in a second call, with no feedback returned',
      'Routing: classify the request and send it to a specialized handler',
      'Sectioning: split the function into parallel independent subtasks',
    ],
    answerKey: 0,
    explanation:
      'Evaluator-optimizer works well when there are clear evaluation criteria and iterative feedback measurably improves ' +
      'the output, exactly the case with a failing test. A chain with no feedback skips the loop, routing just ' +
      'classifies, and sectioning splits work rather than refining one output.',
    misconceptionTag: 'evaluator-optimizer',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q35',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'evaluating-agents',
    taskStatement: '1.1',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A coding agent should confirm its change actually works before returning. Which feedback is the strongest ground-truth signal?',
    options: [
      'Running the test suite and build, and reading the actual pass or fail result',
      'Asking a second model to review the diff and rate how likely it is to be correct',
      'Checking that the diff is small, well formatted, and touches only the expected files',
      'Trusting the agent\'s own stated confidence that it is done',
    ],
    answerKey: 0,
    explanation:
      'Agents get ground truth from the environment, such as code execution or test results, which is the strongest ' +
      'verification. An LLM judge is weaker, self-reported confidence is poorly calibrated, and a tidy diff says nothing ' +
      'about behavior.',
    misconceptionTag: 'ground-truth-verification',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q36',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'agent-sdk',
    taskStatement: '1.7',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'An agent has finished analyzing a module in one session. You now want it to implement the fix without re-reading everything. What is the right session move?',
    options: [
      'Resume the same session so the agent keeps the prior analysis in context',
      'Start a brand-new session and rely on the model recalling the earlier analysis',
      'Pass continue: true with a different working directory so the SDK locates the analysis session',
      'Compact the session so the analysis is summarized away before the implementation starts',
    ],
    answerKey: 0,
    explanation:
      'Resuming by session ID picks up with full prior context, so the agent acts on its analysis without re-reading ' +
      'files. A fresh session loses that context, continue only finds the most recent session in the current directory, ' +
      'and compacting the analysis away defeats the purpose.',
    misconceptionTag: 'resume-session',
    sourceUrls: [SESS],
  }),
  defineQuestion({
    id: 'reg-d1-q37',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'agent-sdk',
    taskStatement: '1.7',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'From the same analyzed baseline, a developer wants to try a JWT refactor and an OAuth2 refactor independently, keeping both options open. Which session feature fits?',
    options: [
      'Fork the session so each approach branches from a copy of the baseline and the original stays intact',
      'Resume the same session for both refactors one after the other, so the second one can build on the first\'s edits',
      'Run both refactors from empty sessions with no shared analysis',
      'Raise maxTurns so one session performs both refactors in sequence',
    ],
    answerKey: 0,
    explanation:
      'Forking copies the baseline history into a new session that diverges while leaving the original unchanged, giving ' +
      'two independent threads to compare. Resuming one session would entangle the approaches, and empty sessions discard ' +
      'the shared analysis both refactors depend on.',
    misconceptionTag: 'fork-vs-resume',
    sourceUrls: [SESS],
  }),
  defineQuestion({
    id: 'reg-d1-q38',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'when-not-to-agent',
    taskStatement: '1.6',
    difficulty: 1,
    estimatedSeconds: 20,
    stem: 'A developer needs a one-line, well-scoped bug fix in a single known file. Which approach matches the "keep it simple" guidance?',
    options: [
      'Make the change directly; a well-scoped edit does not need an agent or multi-agent design',
      'Spin up a multi-agent system so several models can independently cross-check the one-line change',
      'Build an autonomous agent loop that rediscovers the fix at runtime from the failing behavior',
      'Fork three sessions and vote on the single-line change',
    ],
    answerKey: 0,
    explanation:
      'For a clear, well-scoped change, direct execution is enough; agentic complexity trades cost and latency for ' +
      'flexibility the task does not need. Multi-agent cross-checking, an autonomous loop, and vote-forking all over-build ' +
      'a trivial edit.',
    misconceptionTag: 'over-agentic',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q39',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.6',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'An agent tackles a 40-file migration by loading all 40 files into one prompt and editing them in a single pass. Quality drops on the later files. What is the design fix?',
    options: [
      'Decompose into per-file passes with a separate cross-file integration pass to preserve attention',
      'Load related files too, giving the model fuller context for every edit',
      'Keep the single pass but raise the temperature to sharpen later-file attention',
      'Keep the single pass, shuffling the file order to spread degradation evenly',
    ],
    answerKey: 0,
    explanation:
      'Cramming every file into one pass dilutes attention, which is why quality degrades late; per-file passes plus an ' +
      'integration pass fix it. Adding more files worsens the dilution, and temperature or ordering changes do not address ' +
      'the root cause.',
    misconceptionTag: 'attention-dilution',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q40',
    type: 'multi',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'hub-and-spoke',
    taskStatement: '1.6',
    difficulty: 2,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'Which two statements correctly match a decomposition strategy to the kind of coding work? Select TWO.',
    options: [
      'A fixed pipeline (prompt chaining) suits predictable, well-understood multi-step changes',
      'Dynamic, adaptive decomposition suits open-ended work where subtasks emerge as you go',
      'A fixed pipeline is the best fit when you cannot predict the subtasks until the work is underway',
      'Dynamic decomposition fits best when every run follows identical predefined steps',
    ],
    answerKey: [0, 1],
    explanation:
      'Fixed pipelines fit predictable multi-step work; dynamic decomposition fits open-ended work where subtasks are ' +
      'discovered. The other two options swap the pairings, applying a fixed pipeline to unpredictable work and dynamic ' +
      'decomposition to fully predictable steps.',
    misconceptionTag: 'fixed-vs-dynamic-decomposition',
    sourceUrls: [BEA],
  }),
  defineQuestion({
    id: 'reg-d1-q41',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'agent-sdk',
    taskStatement: '1.7',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A long code-generation job was interrupted, and files on disk changed since the session\'s last tool results. What is the more reliable way to continue?',
    options: [
      'Seed a fresh session with a structured summary of the current state instead of resuming on stale results',
      'Resume the old session and continue on its cached file contents, since a transcript replays every read it made',
      'Fork the stale session so the new branch inherits the cached reads and the original remains an untouched backup',
      'Pass continue: true so that the SDK reconciles the transcript with the current disk state before the first new turn',
    ],
    answerKey: 0,
    explanation:
      'When prior tool results are stale, a fresh session seeded with a structured summary of the real current state is ' +
      'often more robust than resuming with outdated cached data. Resuming or forking on stale results acts on data that ' +
      'no longer matches disk, and continue only picks the most recent session; it does not reconcile the transcript ' +
      'with the filesystem.',
    misconceptionTag: 'stale-resume',
    sourceUrls: [SESS],
  }),
  defineQuestion({
    id: 'reg-d1-q42',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: CGC_SCENARIO,
    conceptId: 'agentic-loop',
    taskStatement: '1.1',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'What makes a code-generation agent (rather than a fixed workflow) able to recover when a build breaks mid-task?',
    options: [
      'It gets ground truth from the environment each step and adapts its next action from the result',
      'It follows a predefined sequence of steps, so a broken build is retried at the same step until it passes',
      'It relies on its initial plan and treats tool results as informational only',
      'It halts at the first non-zero exit code and waits for a human',
    ],
    answerKey: 0,
    explanation:
      'An agent plans and operates from ground-truth environment feedback, like build and test output, adjusting its next ' +
      'step, which is how it recovers from a break. A fixed sequence or ignoring results removes that adaptation, and ' +
      'halting forever at the first error is neither recovery nor the agent\'s design.',
    misconceptionTag: 'ground-truth-verification',
    sourceUrls: [BEA],
  }),

  // ===================================================================================================
  // SCENARIO: developer-productivity-tools (7) — subagent isolation, tool restriction, per-agent model,
  // Agent-tool allowlisting, cross-host resumption, parallel subagents.
  // ===================================================================================================
  defineQuestion({
    id: 'reg-d1-q43',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A developer tool spawns a subagent to explore dozens of files, but the main conversation should stay uncluttered. What does subagent context isolation give here?',
    options: [
      'The exploration stays in the subagent\'s own context; only its final summary returns to the parent',
      'Every file the subagent reads is copied into the main conversation, but tagged so the parent can collapse it',
      'The subagent and parent share one history in both directions, so the parent sees each read as it happens',
      'The parent must read each file itself before the subagent can open it',
    ],
    answerKey: 0,
    explanation:
      'Each subagent runs in its own fresh context; intermediate tool calls and results stay inside it, and only the ' +
      'final message returns to the parent, keeping the main conversation clean. The other options describe the pollution ' +
      'that isolation specifically prevents.',
    misconceptionTag: 'context-isolation',
    sourceUrls: [SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q44',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A documentation-review subagent should be able to read files but must never modify them. How do you enforce that on the subagent?',
    options: [
      'Restrict its tools to read-only ones like Read, Grep, and Glob in its AgentDefinition',
      'Add a prompt line asking it never to edit or write files',
      'Give it every tool and rely on its description to discourage writing',
      'Register a Stop hook that reverts every file the subagent changed',
    ],
    answerKey: 0,
    explanation:
      'Limiting the subagent\'s tools field to read-only tools removes Edit and Write entirely, so modification is ' +
      'impossible, not merely discouraged. A prompt request or an all-tools grant leaves the capability in place and ' +
      'relies on probabilistic compliance, and a hook that reverts edits runs only after the file has already changed.',
    misconceptionTag: 'tool-restriction',
    sourceUrls: [SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q45',
    type: 'mc',
    variant: 'spot-bug',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A coordinator is supposed to delegate to a custom subagent, but it keeps doing the work itself and never invokes the subagent. Its allowedTools list omits one entry. What is missing?',
    options: [
      'Agent (the Task tool): without it, subagent invocations are not auto-approved',
      'Bash, since the Agent tool launches each subagent through a shell process that must be approved first',
      'Read, since the coordinator has to open a file before it can hand that file to a subagent',
      'Write, since the coordinator saves each subagent\'s prompt to disk before invoking it',
    ],
    answerKey: 0,
    explanation:
      'Subagents are invoked through the Agent (Task) tool, so it must be in allowedTools for those calls to be ' +
      'auto-approved; otherwise Claude falls back to doing the task directly. Bash, Read, and Write access do not control ' +
      'whether delegation is permitted: a subagent\'s prompt travels inside the tool call, not through a shell or a file.',
    misconceptionTag: 'agent-tool-allowlist',
    sourceUrls: [SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q46',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'In a productivity toolchain, routine lint-style subagent checks are cheap, but the security review must be thorough. How can one design balance cost and capability?',
    options: [
      'Use per-subagent model overrides: a smaller model for routine checks, a more capable one for security review',
      'Run every subagent on the strongest model, relying on tool restrictions to keep routine checks cheap',
      'Run every subagent on the smallest model and give the security review a longer system prompt',
      'Let the main agent choose a random model per spawn so cost averages out',
    ],
    answerKey: 0,
    explanation:
      'An AgentDefinition allows a model override per subagent, so you can match a smaller model to routine work and a ' +
      'stronger model to high-stakes review. Forcing one model everywhere either overpays for trivial checks or ' +
      'underpowers the security-critical one; tool restrictions and prompt length change neither cost nor capability, ' +
      'and random selection is uncontrolled.',
    misconceptionTag: 'per-agent-model',
    sourceUrls: [SUB],
  }),
  defineQuestion({
    id: 'reg-d1-q47',
    type: 'multi',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'subagents',
    taskStatement: '1.3',
    difficulty: 2,
    estimatedSeconds: 30,
    selectCount: 2,
    stem: 'Which two benefits does delegating to subagents provide in a developer tool? Select TWO.',
    options: [
      'Context isolation, so verbose exploration stays out of the main conversation',
      'Parallelization, so independent subtasks finish in the time of the slowest',
      'A guarantee of lower total token usage than a single agent would need for the same task',
      'Automatic sharing of the parent\'s history into each subagent',
    ],
    answerKey: [0, 1],
    explanation:
      'Subagents isolate context and let independent subtasks run in parallel. They do not guarantee lower token usage ' +
      '(multi-agent generally uses more), and they start from a fresh context rather than inheriting the parent\'s ' +
      'history.',
    misconceptionTag: 'subagent-benefits',
    sourceUrls: [SUB, MARS],
  }),
  defineQuestion({
    id: 'reg-d1-q48',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'agent-sdk',
    taskStatement: '1.7',
    difficulty: 3,
    estimatedSeconds: 30,
    stem: 'A CI worker must continue an earlier agent session on a different machine, where the original session file does not exist. Which approach is described as more robust?',
    options: [
      'Capture the results you need as application state and pass them into a fresh session\'s prompt',
      'Resume with the original session ID, since the lookup searches other project directories and hosts for it',
      'Pass continue: true on the new machine so the SDK fetches the most recent session over the network',
      'Reconstruct the session ID from the run timestamp and resume it',
    ],
    answerKey: 0,
    explanation:
      'Session files are local to the host that made them; capturing the needed results as application state and seeding a ' +
      'fresh session is often more robust than shipping transcript files around. Resume and continue both need the ' +
      'session file on the current machine, and a reconstructed ID restores no history.',
    misconceptionTag: 'resume-across-hosts',
    sourceUrls: [SESS],
  }),
  defineQuestion({
    id: 'reg-d1-q49',
    type: 'mc',
    variant: 'scenario',
    domain: 'd1',
    scenarioId: DPT_SCENARIO,
    conceptId: 'parallel-vs-sequential',
    taskStatement: '1.2',
    difficulty: 2,
    estimatedSeconds: 30,
    stem: 'A code-review tool runs a style checker, a security scanner, and a test-coverage analyzer that do not depend on each other. How should the coordinator run them to minimize wall-clock time?',
    options: [
      'Invoke them as subagents concurrently, so they finish in the time of the slowest',
      'Run them strictly one after another so the logs stay ordered and each can read the previous result',
      'Merge all three into a single subagent that performs the checks in sequence with one shared context',
      'Run only the security scanner and infer the style and coverage results from its findings',
    ],
    answerKey: 0,
    explanation:
      'Independent subtasks should run as concurrent subagents, so total time is the slowest one rather than the sum. ' +
      'Sequential execution or merging them into one serial subagent adds latency, and skipping checks to infer results ' +
      'sacrifices coverage.',
    misconceptionTag: 'parallel-vs-sequential',
    sourceUrls: [SUB],
  }),
];
