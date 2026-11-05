// content/src/meta/c0-u1/l3-how-the-app-maps.ts
//
// C0-U1-L3 — How this app maps to the exam: the Feynman loop (analogy + explain-back), spaced
// repetition, mock readiness, and an honest partner-gating note (the credential is Anthropic's paid,
// administered exam, not something the app can grant). A Meet-the-Exam (d0) lesson; questions carry a
// real exam domain (d1..d5) for tracing.
//
// Sources verified 2026-07-14, URLs re-verified 2026-09-24:
//   - Certification landing page (cost "Purchase | $125"; four covered technologies; "informed
//     decisions about tradeoffs"; links the public Exam Guide PDF). The original
//     anthropic.skilljar.com/.../444989 link now 302-redirects here, so this is the final URL:
//     https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
//   - Public CCA-F Exam Guide v1.0 PDF (exam fee "$125 USD"), linked from that landing page. Its S3
//     path carries a timestamp-like segment and may change on re-upload; the landing page is the
//     stable entry point.
//   - Model Context Protocol intro (one of the covered technologies), now served from the versioned
//     path: https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro
//   - Claude Partner Network (partner-gated access context):
//     https://www.anthropic.com/news/claude-partner-network
// App pedagogy (Feynman explain-back, spaced-repetition deck, mock forms) is this app's own design,
// stated in the concept card; the questions test the certification facts and the honest boundary.

import { defineLesson } from '../../index';

const SKILLJAR = 'https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification';
const EXAM_GUIDE =
  'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf';
const MCP = 'https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro';
const PARTNER = 'https://www.anthropic.com/news/claude-partner-network';

export const l3HowTheAppMaps = defineLesson({
  id: 'c0-u1-l3',
  title: 'How this app maps to the exam',
  order: 2,
  concept: {
    conceptId: 'cca-app-method',
    analogy:
      'This app is a flight simulator for the exam: you rehearse the real cockpit with explain-backs, ' +
      'spaced repetition, and full-length mock runs before the day it counts.',
    plainExplanation:
      'Each lesson opens with an analogy, then asks you to teach the idea back so gaps show up early. ' +
      'That is the Feynman loop. Questions you miss drop into a spaced-repetition deck that resurfaces ' +
      'them over time, and mock exams mirror the real 60-question, 120-minute weighted format. One honest ' +
      'note: Anthropic administers the paid certification, so the app prepares you but cannot grant the ' +
      'credential or promise a pass.',
    examWords: ['Feynman loop', 'explain-back', 'spaced repetition', 'mock exam', 'study prep only'],
    keyPoints: [
      {
        id: 'kp-cca-app-method-1',
        text: 'Concept cards open with an analogy, then an explain-back asks you to teach the idea so gaps surface early.',
      },
      {
        id: 'kp-cca-app-method-2',
        text: 'Questions you miss go into a spaced-repetition review deck that resurfaces them over time.',
      },
      {
        id: 'kp-cca-app-method-3',
        text: 'Mock exams mirror the real 60-question, 120-minute, weighted format.',
      },
      {
        id: 'kp-cca-app-method-4',
        text: 'The app tags every question by domain weight so practice matches where the exam spends points.',
      },
      {
        id: 'kp-cca-app-method-5',
        text: 'The app is study prep only; Anthropic administers the paid certification and no app can guarantee a pass.',
      },
    ],
  },
  exercises: [
    {
      id: 'c0-u1-l3-q01',
      type: 'mc',
      domain: 'd1',
      conceptId: 'cca-app-method',
      taskStatement: '1.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You have passed every mock exam in this app. What does that actually mean for the official credential?',
      options: [
        'It is good preparation, but Anthropic administers the paid certification, so only the real exam grants the credential',
        'The app automatically issues your official certificate',
        'You are exempt from taking the real exam',
        'Your mock scores transfer directly to Anthropic',
      ],
      answerKey: 0,
      explanation:
        'The app is study preparation; the certification is a paid exam administered by Anthropic, so passing ' +
        'mocks builds readiness but cannot grant the credential or replace the real sitting. Any claim that the ' +
        'app issues or substitutes for the certificate overstates what a prep tool can do.',
      misconceptionTag: 'prep-not-credential',
      sourceUrls: [SKILLJAR],
    },
    {
      id: 'c0-u1-l3-q02',
      type: 'mc',
      domain: 'd3',
      conceptId: 'cca-app-method',
      taskStatement: '3.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'How much does the Claude Certified Architect Foundations certification exam cost to take?',
      options: ['$125', 'It is free', '$25', '$1,250'],
      answerKey: 0,
      explanation:
        'The certification page lists the exam at $125. The app itself is preparation, but the credential comes ' +
        'from that paid Anthropic exam.',
      sourceUrls: [SKILLJAR, EXAM_GUIDE],
    },
    {
      id: 'c0-u1-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd1',
      conceptId: 'cca-app-method',
      taskStatement: '1.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You keep missing questions in the heaviest domain. Which use of the app raises your expected score the most?',
      options: [
        'Let the review deck resurface your missed items and spend extra practice on the highest-weighted domain',
        'Only redo questions you already answer correctly',
        'Skip the topics you find hardest',
        'Practice every domain equally regardless of weight or your misses',
      ],
      answerKey: 0,
      explanation:
        'Expected score climbs fastest when you close gaps in the domain worth the most points and let spaced ' +
        'repetition bring missed items back. Re-doing what you know, skipping hard topics, or ignoring both ' +
        'weight and your own misses leaves the biggest gains on the table.',
      misconceptionTag: 'weight-blind-study',
      sourceUrls: [SKILLJAR],
    },
    {
      id: 'c0-u1-l3-q04',
      type: 'multi',
      domain: 'd4',
      conceptId: 'cca-app-method',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two statements honestly describe what this app can and cannot do? Select TWO.',
      options: [
        'It prepares you with lessons, explain-backs, and mock exams',
        'It cannot guarantee that you will pass the real exam',
        'It issues the official Anthropic credential',
        'It removes the need to register for the paid exam',
        'It sets the exam\'s passing score',
      ],
      answerKey: [0, 1],
      explanation:
        'The app trains you and mirrors the exam, but it cannot promise a pass, mint the official credential, ' +
        "waive registration, or set Anthropic's scoring. Honesty about that boundary is part of the design.",
      sourceUrls: [SKILLJAR],
    },
    {
      id: 'c0-u1-l3-q05',
      type: 'mc',
      domain: 'd2',
      conceptId: 'cca-app-method',
      taskStatement: '2.4',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Which technologies should you be ready to reason about, based on what the exam covers?',
      options: [
        'Claude Code, the Claude Agent SDK, the Claude API, and MCP',
        'Only spreadsheet formulas',
        "A single vendor's chatbot UI",
        'Front-end CSS frameworks',
      ],
      answerKey: 0,
      explanation:
        'The exam validates decisions across Claude Code, the Claude Agent SDK, the Claude API, and MCP, so ' +
        'those are the technologies to practice reasoning about. The other options fall outside what the ' +
        'certification tests.',
      sourceUrls: [SKILLJAR, MCP],
    },
    {
      id: 'c0-u1-l3-q06',
      type: 'mc',
      domain: 'd5',
      conceptId: 'cca-app-method',
      taskStatement: '5.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Where do you actually earn the certification, as opposed to practicing for it?',
      options: [
        "By taking Anthropic's official exam through its certification program",
        'By finishing every lesson in this app',
        'By watching any Claude tutorial video',
        'By reading the documentation once',
      ],
      answerKey: 0,
      explanation:
        "The credential is awarded only through Anthropic's official, administered exam; the app, videos, and " +
        'docs are all preparation. Confusing preparation with the credential is exactly the gap this honest note ' +
        'closes.',
      misconceptionTag: 'prep-not-credential',
      sourceUrls: [SKILLJAR, PARTNER],
    },
    {
      id: 'c0-u1-l3-q07',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'cca-app-method',
      taskStatement: '4.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: "True or false: passing this app's mock exams automatically awards you the official Claude Certified Architect credential.",
      options: [
        "False, the credential comes only from Anthropic's official paid exam",
        'True',
      ],
      answerKey: 0,
      explanation:
        'Mocks build readiness, but the official credential is granted only by Anthropic\'s administered exam, ' +
        'not by any third-party study app.',
      misconceptionTag: 'prep-not-credential',
      sourceUrls: [SKILLJAR],
    },
    {
      id: 'c0-u1-l3-q08',
      type: 'mc',
      variant: 'scenario',
      domain: 'd2',
      conceptId: 'cca-app-method',
      taskStatement: '2.1',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'The certification says it validates making informed decisions about tradeoffs. What does that imply for how you should study?',
      options: [
        'Practice choosing between competing designs and justifying the tradeoffs, not memorizing definitions',
        'Memorize every term in the documentation word for word',
        'Focus only on trivia about product names and dates',
        'Skip design reasoning and rely on intuition alone',
      ],
      answerKey: 0,
      explanation:
        'Because the exam rewards tradeoff decisions, the highest-value prep is rehearsing design choices and ' +
        'the reasoning behind them. Rote definitions, trivia, and unexamined intuition do not build the judgment ' +
        'the exam measures.',
      misconceptionTag: 'definition-not-decision',
      sourceUrls: [SKILLJAR],
    },
  ],
  explainBack: {
    prompt:
      'Teach the agent: if you ace every mock in this app, what does that mean for the real certification, and how should you use the app to prepare?',
    conceptId: 'cca-app-method',
    keyPointIds: [
      'kp-cca-app-method-1',
      'kp-cca-app-method-2',
      'kp-cca-app-method-3',
      'kp-cca-app-method-4',
      'kp-cca-app-method-5',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
