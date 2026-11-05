// content/src/d5-context-management/c5-u3/l3-escalation-degradation.ts
//
// C5-U3-L3 — Human-in-the-loop escalation, graceful degradation, and structured error propagation.
// Task statements 5.2 (escalation and ambiguity), 5.3 (error propagation in multi-agent systems),
// and 5.6 (provenance in synthesis). Every claim traces to the cited pages (verified 2026-07-14):
//   BEA       — "Building effective agents": agents pause for human feedback at checkpoints or when
//               encountering blockers; include stopping conditions; guardrails and testing for
//               autonomy and compounding errors.
//   MULTIAGENT— "How we built our multi-agent research system": resume from where errors occurred
//               rather than restarting entirely; let the agent know when a tool is failing so it can
//               adapt; a dedicated citation step maps claims back to their sources.
//
// Confusion pair targeted: when to escalate (a real blocker or checkpoint) vs continue, and
// propagating a structured failure so a coordinator can recover vs swallowing it or killing the run.
//
// Re-verified 2026-09-24: the "built-multi-agent-research-system" URL redirects to
// /engineering/multi-agent-research-system (the same post, also cited elsewhere), so MULTIAGENT now
// points at that final URL.

import { defineLesson } from '../../index';

const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';
const MULTIAGENT = 'https://www.anthropic.com/engineering/multi-agent-research-system';

export const l3EscalationDegradation = defineLesson({
  id: 'c5-u3-l3',
  title: 'Escalation and graceful degradation',
  order: 2,
  concept: {
    conceptId: 'escalation-and-degradation',
    analogy:
      'A good field medic handles what they can and, for anything above their training, escalates up the ' +
      'chain with a clear handoff note instead of guessing or going silent. When a supply runs out, they ' +
      'note the gap and keep treating what they can rather than abandoning the patient.',
    plainExplanation:
      'Agents should pause for human feedback at defined checkpoints or when they hit a blocker they ' +
      'cannot resolve, rather than running autonomously without limits. When a request is ambiguous, such ' +
      'as multiple records matching, ask for a disambiguating detail instead of guessing. In multi-agent ' +
      'systems, propagate structured error context (what failed, what was attempted, any partial results) ' +
      'so a coordinator can adapt and resume rather than restart from scratch. Silently swallowing a ' +
      'failure and killing the whole workflow on a single failure are both anti-patterns; keep partial ' +
      'results, and preserve claim-to-source citations when you synthesize.',
    examWords: [
      'escalation',
      'human-in-the-loop',
      'blocker',
      'structured error context',
      'provenance',
    ],
    keyPoints: [
      { id: 'kp-escalation-and-degradation-1', text: 'Agents should pause for human feedback at checkpoints or when they hit a blocker they cannot resolve, not run autonomously without limits.' },
      { id: 'kp-escalation-and-degradation-2', text: 'When a request is ambiguous, such as multiple matching records, ask for a disambiguating detail instead of guessing one.' },
      { id: 'kp-escalation-and-degradation-3', text: 'Propagate structured error context (what failed, what was attempted, partial results) so a coordinator can adapt and resume rather than restart.' },
      { id: 'kp-escalation-and-degradation-4', text: 'Silently swallowing a failure and terminating the whole workflow on one failure are both anti-patterns; keep partial results and preserve claim-to-source citations in synthesis.' },
    ],
  },
  exercises: [
    {
      id: 'c5-u3-l3-q01',
      type: 'mc',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'When does the guidance say an agent should pause for human feedback?',
      options: [
        'At defined checkpoints or when it encounters a blocker it cannot resolve',
        'On every single tool call, before running any of them',
        'Only after it has already completed the entire task',
        'Never, since autonomy means no human involvement',
      ],
      answerKey: 0,
      explanation:
        'Agents pause for human input at checkpoints or when they hit a blocker, balancing autonomy with oversight. ' +
        'Pausing on every tool call is the trap that removes the benefit of autonomy, while never pausing ignores the ' +
        'guardrails autonomous systems need.',
      misconceptionTag: 'escalation-triggers',
      sourceUrls: [BEA],
    },
    {
      id: 'c5-u3-l3-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A customer writes in an irritated tone, but their request is clearly within policy and the agent can fully handle it. Should the irritated tone alone trigger escalation to a human?',
      options: [
        'No: tone alone is not a blocker or checkpoint, so the agent should resolve the in-policy request',
        'Yes: any negative sentiment should immediately hand off to a human',
        'Yes: irritated tone always means the agent lacks the tools to help',
        'No: the agent should stop responding until the customer calms down',
      ],
      answerKey: 0,
      explanation:
        'Escalation is warranted by blockers or checkpoints, and a solvable in-policy request is neither, so the ' +
        'agent should just handle it. Treating any negative sentiment as an automatic handoff is the trap: tone is ' +
        'not the same as an unresolvable situation.',
      misconceptionTag: 'sentiment-not-a-trigger',
      sourceUrls: [BEA],
    },
    {
      id: 'c5-u3-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A lookup returns two different customers who share the same name, and the next action would modify an account. What should the agent do?',
      options: [
        'Ask for a disambiguating identifier before acting, rather than guessing which record is right',
        'Pick the first record returned and proceed',
        'Modify both accounts to be safe',
        'Abort the entire session with no explanation',
      ],
      answerKey: 0,
      explanation:
        'Ambiguity with a consequential next step is a blocker, so the agent should request an identifier instead of ' +
        'guessing. Picking the first record is the trap: a heuristic guess on a consequential action risks changing ' +
        'the wrong account.',
      misconceptionTag: 'ambiguity-ask-identifier',
      sourceUrls: [BEA],
    },
    {
      id: 'c5-u3-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.3',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'In a multi-agent system, a subagent whose search tool errored out returns "no results found" to the coordinator, which then reports the topic as fully covered. What is the flaw?',
      options: [
        'A tool failure is being reported as an empty result, hiding the failure so the coordinator cannot adapt or retry',
        'The subagent should have terminated the entire workflow on the error',
        'The coordinator should never receive results from subagents at all',
        'The subagent should retry silently forever until the tool works',
      ],
      answerKey: 0,
      explanation:
        'Reporting an access failure as an empty result is silent suppression: the coordinator cannot tell a real ' +
        'gap from a broken tool, so it cannot adapt. Letting the coordinator know the tool is failing is what lets ' +
        'the system recover. Killing the whole workflow is the opposite over-reaction, and also wrong.',
      misconceptionTag: 'access-failure-not-empty',
      sourceUrls: [MULTIAGENT],
    },
    {
      id: 'c5-u3-l3-q05',
      type: 'multi',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are anti-patterns for handling a single subagent failure in a multi-agent run? Select TWO.',
      options: [
        'Silently swallowing the failure so nothing downstream knows it happened',
        'Terminating the entire workflow because one subagent failed',
        'Reporting the failure with partial results so the coordinator can adapt',
        'Letting the coordinator retry a targeted query after the failure',
        'Resuming from where the error occurred instead of restarting',
      ],
      answerKey: [0, 1],
      explanation:
        'Silent suppression and whole-workflow termination both destroy recoverability: one hides the problem, the ' +
        'other over-reacts to it. Reporting partial results, retrying a targeted query, and resuming are the ' +
        'constructive behaviors that keep the run alive.',
      misconceptionTag: 'error-propagation-antipatterns',
      sourceUrls: [MULTIAGENT],
    },
    {
      id: 'c5-u3-l3-q06',
      type: 'mc',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What makes an error report from a subagent most useful to a coordinator that needs to recover?',
      options: [
        'Structured context: what failed, what was attempted, and any partial results, so the coordinator can adapt',
        'A single generic message like "operation failed" with no detail',
        'The full raw stack trace pasted into the conversation',
        'No report at all, to avoid alarming the coordinator',
      ],
      answerKey: 0,
      explanation:
        'A structured report of the failure, the attempted action, and partial results lets the coordinator adapt and ' +
        'resume. A bare "operation failed" is the trap: it strips out exactly the context needed to decide what to ' +
        'do next.',
      misconceptionTag: 'structured-error-context',
      sourceUrls: [MULTIAGENT],
    },
    {
      id: 'c5-u3-l3-q07',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A research system synthesizes a report from many source documents, and reviewers need to trust each claim. What step best preserves provenance?',
      options: [
        'A dedicated citation step that maps each claim back to the specific source it came from',
        'Dropping all source references so the report reads more smoothly',
        'Letting each subagent invent citations that look plausible',
        'Merging sources into one blob so individual origins are no longer tracked',
      ],
      answerKey: 0,
      explanation:
        'A dedicated citation step attributes every claim to its source, which is what makes the synthesis ' +
        'verifiable. Dropping references or merging sources into an untraceable blob is the trap: it destroys the ' +
        'provenance reviewers depend on.',
      misconceptionTag: 'provenance-citation',
      sourceUrls: [MULTIAGENT],
    },
    {
      id: 'c5-u3-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: an autonomous agent should keep running without any human checkpoints as long as it has not thrown an error.',
      options: [
        'False, autonomous agents need checkpoints and stopping conditions, not unbounded autonomy',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Because autonomy raises cost and the risk of compounding errors, the guidance calls for checkpoints, ' +
        'stopping conditions, and guardrails. "No error yet" is not the same as "safe to run unbounded."',
      misconceptionTag: 'unbounded-autonomy',
      sourceUrls: [BEA],
    },
    {
      id: 'c5-u3-l3-q09',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'escalation-and-degradation',
      taskStatement: '5.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A long multi-agent research run fails partway through when one subagent hits a transient tool error, and the orchestrator already has the completed work saved. What is the most efficient correct recovery?',
      options: [
        'Resume from where the error occurred, reusing the completed work, instead of restarting the whole run',
        'Restart the entire run from scratch to guarantee a clean state',
        'Silently drop the failed subagent branch and report the topic as fully covered',
        'Terminate the whole workflow because one subagent failed',
      ],
      answerKey: 0,
      explanation:
        'Because agents can resume from where they were when the error occurred, the run should continue from the ' +
        'saved progress rather than pay to redo everything; letting the agent know a tool is failing and adapt is ' +
        'what makes this work. Restarting from scratch is the trap: it discards completed work over a transient ' +
        'failure. Silently dropping the branch and killing the workflow are the two familiar anti-patterns.',
      misconceptionTag: 'resume-not-restart',
      sourceUrls: [MULTIAGENT],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a subagent hits a failing tool. Why is reporting a structured error better than either returning "no results" or killing the whole run?',
    conceptId: 'escalation-and-degradation',
    keyPointIds: [
      'kp-escalation-and-degradation-1',
      'kp-escalation-and-degradation-2',
      'kp-escalation-and-degradation-3',
      'kp-escalation-and-degradation-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 250,
});
