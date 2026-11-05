// content/src/meta/c0-u1/l1-exam-format.ts
//
// C0-U1-L1 — The CCA-F exam: format, five weighted domains, scaled scoring, the 720 line.
// This is a Meet-the-Exam (d0 course) lesson: it teaches the blueprint itself. Questions still carry
// a real exam domain (d1..d5) + a task-statement ref, because the schema traces every item to an
// objective; the domain tag here marks the domain each fact spotlights, not a subject-matter claim.
//
// Sources verified 2026-07-14, URLs re-verified 2026-09-24:
//   - Certification landing page (cost $125, four covered technologies, "informed decisions about
//     tradeoffs"). The original anthropic.skilljar.com/.../444989 link now 302-redirects here, so
//     this is the final URL:
//     https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
//   - Building effective agents (what Domain 1 covers):
//     https://www.anthropic.com/engineering/building-effective-agents
//   - Claude Code overview (what Domain 3 covers): https://code.claude.com/docs/en/overview
// Exam-structure numbers (60 Q / 120 min / 720 pass line / domain weights 27-18-20-20-15 / 4-of-6
// scenarios / percent-correct by domain on the score report) come from the official CCA-F Exam Guide
// v1.0, condensed in content/official-task-statements.md + content/blueprint.json (Gate 0 confirmed
// 2026-07-13). The guide is public: the landing page links the PDF, which the exam-format items cite
// directly (EXAM_GUIDE). Its S3 path carries a timestamp-like segment and may change on re-upload;
// the landing page is the stable entry point.

import { defineLesson } from '../../index';

const SKILLJAR = 'https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification';
const EXAM_GUIDE =
  'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf';
const BEA = 'https://www.anthropic.com/engineering/building-effective-agents';
const CC = 'https://code.claude.com/docs/en/overview';

export const l1ExamFormat = defineLesson({
  id: 'c0-u1-l1',
  title: 'Know the exam: format and weights',
  order: 0,
  concept: {
    conceptId: 'cca-exam-format',
    analogy:
      'Preparing for this exam is like training for a decathlon whose events are not worth equal ' +
      'points: you win by putting the most practice into the events that score the most.',
    plainExplanation:
      'The CCA-F exam is 60 questions in 120 minutes, spread across five domains that each carry a ' +
      'different share of your score. You pass with a scaled score of 720, and your report shows how ' +
      'you did in each domain. Because the domains are weighted, the smartest prep puts the most effort ' +
      'where the points are: Agentic Architecture is the heaviest at 27 percent, and Context Management ' +
      'is the lightest at 15 percent.',
    examWords: ['60 questions', '120 minutes', 'scaled score', '720', 'domain weights'],
    keyPoints: [
      { id: 'kp-cca-exam-format-1', text: 'The exam is 60 questions answered in 120 minutes.' },
      {
        id: 'kp-cca-exam-format-2',
        text: 'The five domains are weighted: Agentic Architecture 27 percent, Claude Code 20 percent, Prompt Engineering 20 percent, Tool Design and MCP 18 percent, and Context Management 15 percent.',
      },
      {
        id: 'kp-cca-exam-format-3',
        text: 'You pass with a scaled score of 720, and the report shows percent correct per domain, not five separate cut lines.',
      },
      {
        id: 'kp-cca-exam-format-4',
        text: 'The exam covers Claude Code, the Claude Agent SDK, the Claude API, and MCP.',
      },
      {
        id: 'kp-cca-exam-format-5',
        text: 'Prep effort should track domain weight, so the 27 percent domain deserves the most study time.',
      },
    ],
  },
  exercises: [
    {
      id: 'c0-u1-l1-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'cca-exam-format',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You have limited study time and want to raise your expected score the most. The five domains are weighted, with Agentic Architecture the largest. Where should most of your prep go?',
      options: [
        'Into Agentic Architecture, the highest-weighted domain',
        'Split evenly across all five domains regardless of weight',
        'Into Context Management, the lowest-weighted domain',
        'Into whichever domain you already know best',
      ],
      answerKey: 0,
      explanation:
        'Because the domains are weighted, expected score rises fastest when prep tracks the weights, and ' +
        'Agentic Architecture carries the most points at 27 percent. Splitting evenly ignores that some ' +
        'domains are worth more, and leaning into the lightest domain or what you already know leaves the ' +
        'biggest point pool underprepared.',
      misconceptionTag: 'weight-blind-study',
      sourceUrls: [SKILLJAR, EXAM_GUIDE, BEA],
    },
    {
      id: 'c0-u1-l1-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'cca-exam-format',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'The certification says it validates skills across four core technologies. Which set does the exam cover?',
      options: [
        'Claude Code, the Claude Agent SDK, the Claude API, and MCP',
        'Only the Claude API and its Python SDK',
        'Claude Code and a proprietary no-code builder',
        'Third-party LangChain, Pinecone, and a vector database',
      ],
      answerKey: 0,
      explanation:
        'The certification page states the exam covers Claude Code, the Claude Agent SDK, the Claude API, ' +
        'and the Model Context Protocol. The other sets narrow it to one tool or swap in third-party stacks ' +
        'the exam does not test.',
      sourceUrls: [SKILLJAR, CC],
    },
    {
      id: 'c0-u1-l1-q03',
      type: 'mc',
      domain: 'd4',
      conceptId: 'cca-exam-format',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A study partner says, "I need to score 720 in each of the five domains to pass." What is the accurate correction?',
      options: [
        'Passing is a single scaled score of 720 overall; the per-domain percentages are shown for insight, not as separate cut lines',
        'You need exactly 720 raw points in every domain',
        'There is no passing score; attendance alone passes you',
        'Only the Agentic Architecture domain has a cut line',
      ],
      answerKey: 0,
      explanation:
        'The exam uses one scaled score with 720 as the pass line, and the report breaks results down by ' +
        'domain so you can see strengths and gaps, not as five independent gates. Treating 720 as a per-domain ' +
        'requirement invents cut lines the exam does not use.',
      misconceptionTag: 'per-domain-cutline',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l1-q04',
      type: 'mc',
      variant: 'scenario',
      domain: 'd5',
      conceptId: 'cca-exam-format',
      taskStatement: '5.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'It is exam day. You have 60 questions and 120 minutes, and you have spent five minutes on question 3. What is the sound pacing decision?',
      options: [
        'Aim for about two minutes per question on average, flag the hard one, and move on',
        'Spend as long as needed on each question in order, even if you do not finish',
        'Answer only the questions you are certain about and skip the rest permanently',
        'Rush every question in the first 30 minutes to leave a long buffer',
      ],
      answerKey: 0,
      explanation:
        'Sixty questions in 120 minutes is a two-minute average, so flagging a hard item and returning later ' +
        'protects the many easier points ahead. Grinding in strict order risks leaving scorable questions ' +
        'unseen, and rushing everything trades accuracy for a buffer you do not need.',
      misconceptionTag: 'pacing',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l1-q05',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd1',
      conceptId: 'cca-exam-format',
      taskStatement: '1.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: you must reach a 720 scaled score in every single domain to pass the exam.',
      options: [
        'False, 720 is the overall scaled pass line and per-domain results are shown for insight',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The 720 pass line is an overall scaled score, and the per-domain breakdown is diagnostic rather than ' +
        'five separate gates.',
      misconceptionTag: 'per-domain-cutline',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l1-q06',
      type: 'multi',
      domain: 'd2',
      conceptId: 'cca-exam-format',
      taskStatement: '2.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: "Two of these describe the exam's structure correctly. Select TWO.",
      options: [
        'It has 60 questions with a 120-minute limit',
        'The five domains carry different weights',
        'Every question is worth an equal share of every domain',
        'It is an open-book oral interview',
        'There is no time limit',
      ],
      answerKey: [0, 1],
      explanation:
        'The exam has 60 questions with a 120-minute limit, and its five domains carry different weights, so ' +
        'those two statements hold. Equal weighting contradicts the published domain weights, and the exam is ' +
        'a timed, item-based test, not an untimed oral interview.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l1-q07',
      type: 'order',
      domain: 'd1',
      conceptId: 'cca-exam-format',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order these steps for building a weight-aware study plan, from first to last.',
      steps: [
        'List the five domains and their weights',
        'Rank the domains from heaviest to lightest',
        'Allocate the most study time to the 27 percent domain',
      ],
      answerKey: [0, 1, 2],
      explanation:
        "You first surface each domain's weight, then rank them, then let the ranking drive where your hours " +
        'go, with the heaviest domain getting the most. Allocating before you know the weights would just be ' +
        'guessing.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l1-q08',
      type: 'mc',
      domain: 'd3',
      conceptId: 'cca-exam-format',
      taskStatement: '3.6',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'After the exam, what does your score report actually show you?',
      options: [
        'Your overall result plus percent correct in each domain',
        'The exact questions you missed with full answer keys',
        'A single pass or fail with no other detail',
        'Your rank against every other test taker',
      ],
      answerKey: 0,
      explanation:
        'The report pairs your overall outcome with percent correct per domain, which is what lets you target ' +
        'weak areas on a retake. It does not release the item-level answer key, reduce to a bare outcome with ' +
        'no detail, or publish a competitive ranking.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
  ],
  explainBack: {
    prompt:
      'Teach the agent: you have limited hours to prepare and the five domains are weighted. How would you decide where to spend the most study time, and why?',
    conceptId: 'cca-exam-format',
    keyPointIds: [
      'kp-cca-exam-format-1',
      'kp-cca-exam-format-2',
      'kp-cca-exam-format-3',
      'kp-cca-exam-format-4',
      'kp-cca-exam-format-5',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
