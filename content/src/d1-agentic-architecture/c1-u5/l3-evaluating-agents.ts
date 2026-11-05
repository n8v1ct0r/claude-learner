// content/src/d1-agentic-architecture/c1-u5/l3-evaluating-agents.ts
//
// C1-U5-L3 — Evaluating agents (verification, LLM-as-judge, session state). Task statement 1.7
// (session state and resumability). Claims trace to the engineering post "Building agents with the
// Claude Agent SDK" and the "multi-agent research system" post (verified 2026-07-14):
//   SDKBLOG — verify work with rules-based feedback (linters/tests); LLM-as-judge is possible but
//             "generally not a very robust method" with "heavy latency tradeoffs".
//   MAR     — resume from where the agent was rather than restarting.
// Re-verified 2026-09-24: the SDK post moved to claude.com/blog (same title and text: "Code linting
// is an excellent form of rules-based feedback", LLM as a judge "is generally not a very robust
// method, and can have heavy latency tradeoffs"), cited as the final URL.

import { defineLesson } from '../../index';

const SDKBLOG = 'https://claude.com/blog/building-agents-with-the-claude-agent-sdk';
const MAR = 'https://www.anthropic.com/engineering/multi-agent-research-system';

export const l3EvaluatingAgents = defineLesson({
  id: 'c1-u5-l3',
  title: 'Evaluating agents',
  order: 2,
  concept: {
    conceptId: 'evaluating-agents',
    analogy:
      'Checking an agent\'s work is like grading homework: the most reliable grader is an answer key or rulebook ' +
      '(linters and tests), a quick spot-check is having another student mark it (an LLM judge, cheap but less ' +
      'reliable), and for visual work you compare against a picture of the goal.',
    plainExplanation:
      'Agents verify their work as part of the loop, and the strongest signal is rules-based feedback like ' +
      'linters and tests that state exactly which rule failed and why. You can also have another model judge the ' +
      'output, but that is generally less robust and adds heavy latency, so use it only when the marginal gain is ' +
      'worth the cost. For long runs, session state matters: resume from where the agent was rather than ' +
      'restarting, and a fresh session with a structured summary can beat resuming with stale results.',
    examWords: ['verify work', 'rules-based feedback', 'LLM-as-judge', 'session state', 'resume'],
    keyPoints: [
      { id: 'kp-evaluating-agents-1', text: 'Verification is part of the agent loop; rules-based feedback like linters and tests is the strongest signal.' },
      { id: 'kp-evaluating-agents-2', text: 'Good rules-based feedback states which rule failed and why, so the agent can self-correct.' },
      { id: 'kp-evaluating-agents-3', text: 'LLM-as-judge is possible but generally less robust and adds latency, so use it only when the gain justifies the cost.' },
      { id: 'kp-evaluating-agents-4', text: 'For long runs, resume from where the agent was rather than restarting, and a fresh session with a structured summary can beat stale results.' },
    ],
  },
  exercises: [
    {
      id: 'c1-u5-l3-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What is the strongest form of verification feedback for an agent?',
      options: [
        'Rules-based feedback like linters and tests',
        'Another model judging the output',
        'The agent\'s own self-reported confidence',
        'A fixed sleep timer between steps',
      ],
      answerKey: 0,
      explanation:
        'Clearly defined rules, such as linters and tests, give the strongest and most in-depth feedback. A second model ' +
        'judging the output is weaker and slower, and self-reported confidence is poorly calibrated.',
      misconceptionTag: 'rules-based-verification',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l3-q02',
      type: 'mc',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Why is LLM-as-judge described as a weaker verification method?',
      options: [
        'It is generally not very robust and can add heavy latency',
        'It is impossible to set up in practice',
        'It is always more accurate than tests',
        'It uses no tokens at all',
      ],
      answerKey: 0,
      explanation:
        'Having a model judge output is possible but generally not robust and carries heavy latency tradeoffs. "Always ' +
        'more accurate than tests" is the trap: rules-based checks are the stronger signal.',
      misconceptionTag: 'llm-as-judge-tradeoff',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An agent generates code and you want it to catch its own errors before returning. Which feedback loop is most reliable?',
      options: [
        'Run a linter and tests, then feed back exactly which rules failed and why',
        'Ask a second model to guess whether the code looks right',
        'Trust the agent\'s stated confidence in its answer',
        'Skip verification to keep it fast',
      ],
      answerKey: 0,
      explanation:
        'Linters and tests give precise, deterministic feedback the agent can act on. A second model guessing is the ' +
        'trap: it is less robust and slower than running the actual checks.',
      misconceptionTag: 'rules-based-verification',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l3-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team adds an LLM-as-judge on every single output of a latency-sensitive agent, and response times balloon. What is the flaw and the fix?',
      options: [
        'LLM-as-judge adds heavy latency and is less robust; reserve it for cases where the gain justifies the cost and prefer rules-based checks',
        'Judges are free, so keeping one on every output is fine',
        'Remove all verification to solve the latency',
        'The underlying model is simply too small',
      ],
      answerKey: 0,
      explanation:
        'A model judge on every output multiplies latency for a weak signal, so it should be used selectively with ' +
        'rules-based checks preferred. Removing all verification is the trap: it trades latency for unchecked errors.',
      misconceptionTag: 'llm-as-judge-tradeoff',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l3-q05',
      type: 'mc',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A long-running agent crashes mid-task. Which resumption strategy is preferred?',
      options: [
        'Resume from where it failed, or start fresh with a structured summary rather than stale tool results',
        'Always restart the whole task from scratch',
        'Keep every stale tool result and continue blindly',
        'Never resume the session under any circumstances',
      ],
      answerKey: 0,
      explanation:
        'Resuming from the failure point, or restarting fresh with a clean structured summary, preserves progress without ' +
        'stale state. Restarting from scratch discards good work, and continuing on stale results propagates errors.',
      misconceptionTag: 'resume-not-restart',
      sourceUrls: [MAR],
    },
    {
      id: 'c1-u5-l3-q06',
      type: 'multi',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two make rules-based verification effective? Select TWO.',
      options: [
        'It states exactly which rule failed and why',
        'It is deterministic feedback like a linter or test result',
        'It relies on the agent\'s self-reported confidence',
        'It always requires a second LLM to work',
        'It applies only to visual output',
      ],
      answerKey: [0, 1],
      explanation:
        'Effective rules-based feedback is deterministic and pinpoints which rule failed and why. It does not depend on ' +
        'self-reported confidence, a second LLM, or being limited to visual output.',
      misconceptionTag: 'rules-based-verification',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l3-q07',
      type: 'cloze',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: the strongest verification signal is ___-based feedback like linters and tests, while ___-as-judge is less robust and adds latency.',
      blanks: [
        { options: ['rules', 'confidence', 'sentiment'] },
        { options: ['LLM', 'rule', 'tool'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Rules-based feedback (linters, tests) is the strongest signal; LLM-as-judge is weaker and slower. Confidence and ' +
        'sentiment are poorly calibrated and are not the strong signal.',
      misconceptionTag: 'rules-based-verification',
      sourceUrls: [SDKBLOG],
    },
    {
      id: 'c1-u5-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'evaluating-agents',
      taskStatement: '1.7',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: having a second model judge every output is the most robust way to verify an agent.',
      options: [
        'False, rules-based feedback like tests and linters is the stronger and cheaper signal',
        'True',
      ],
      answerKey: 0,
      explanation:
        'LLM-as-judge is generally not robust and adds latency, so it is not the most reliable check. Deterministic ' +
        'rules-based feedback is stronger and cheaper.',
      misconceptionTag: 'llm-as-judge-tradeoff',
      sourceUrls: [SDKBLOG],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your agent writes code and you want it to check its own work. Which verification method is strongest, and when is an LLM judge worth the cost?',
    conceptId: 'evaluating-agents',
    keyPointIds: [
      'kp-evaluating-agents-1',
      'kp-evaluating-agents-2',
      'kp-evaluating-agents-3',
      'kp-evaluating-agents-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
