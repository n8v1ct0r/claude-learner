// content/src/d4-prompt-engineering/c4-u4/l2-ai-fluency-4d.ts
//
// C4-U4-L2 — AI Fluency 4D framework (Delegation, Description, Discernment, Diligence). Task
// statements 4.1 (Description = clear communication) and 4.6 (Discernment = evaluating outputs).
// Concepts paraphrased from Anthropic's "AI Fluency: Framework & Foundations" (the four Ds), verified
// 2026-07-14. Skilljar course text is Anthropic IP: paraphrase only, never mirror.
//
// Re-sourced 2026-09-24: the anthropic.com/ai-fluency/* lesson links now redirect to a Skilljar
// registration gate, so the items cite two login-free Anthropic pages instead:
//   AIF  — "The AI Fluency Framework" one-page PDF (www-cdn.anthropic.com): "Four interconnected
//          competencies necessary to ensure our interactions with AI are effective, efficient, ethical
//          and safe"; Delegation = "Setting goals and deciding whether, when and how to engage with
//          AI"; Description = "Effectively describing goals to prompt useful AI behaviors and outputs";
//          Discernment = "Accurately assessing the usefulness of AI outputs and behaviours";
//          Diligence = "Taking responsibility for ..." (responsible AI collaboration).
//   AIFC — the public Claude Academy course page (academy.claude.com): "collaborate with AI
//          effectively, efficiently, ethically, and safely using the 4D framework: Delegation,
//          Description, Discernment, and Diligence", with one line per D.
// The exam guide v1.0 never mentions AI Fluency; the lesson stays as breadth on tasks 4.1 / 4.6.

import { defineLesson } from '../../index';

const AIF = 'https://www-cdn.anthropic.com/334975cdec18f744b4fa511dc8518bd8d119d29d.pdf';
const AIFC = 'https://academy.claude.com/courses/ai-fluency-framework-foundations';

export const l2AiFluency4d = defineLesson({
  id: 'c4-u4-l2',
  title: 'AI Fluency: the four Ds',
  order: 1,
  concept: {
    conceptId: 'ai-fluency-4d',
    analogy:
      'The four Ds are a pre-flight checklist for working with AI: decide what to hand off (Delegation), say ' +
      'it clearly (Description), check the result (Discernment), and do it responsibly (Diligence).',
    plainExplanation:
      'Anthropic\'s AI Fluency framework names four competencies for working with AI in ways that are ' +
      'effective, efficient, ethical, and safe. Delegation is deciding what to do with AI versus yourself. ' +
      'Description is communicating clearly with the system. Discernment is critically evaluating its outputs ' +
      'and behavior. Diligence is interacting responsibly, including verifying before you rely on a result.',
    examWords: ['AI Fluency', 'Delegation', 'Description', 'Discernment', 'Diligence'],
    keyPoints: [
      { id: 'kp-ai-fluency-4d-1', text: 'AI Fluency is interacting with AI in ways that are effective, efficient, ethical, and safe.' },
      { id: 'kp-ai-fluency-4d-2', text: 'Delegation is thoughtfully deciding what to do with AI versus doing it yourself.' },
      { id: 'kp-ai-fluency-4d-3', text: 'Description is communicating clearly with the AI; Discernment is critically evaluating its outputs and behavior.' },
      { id: 'kp-ai-fluency-4d-4', text: 'Diligence is interacting with AI responsibly, including verifying results before relying on them.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u4-l2-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'In the AI Fluency framework, which competency is about deciding what work to hand to AI versus doing it yourself?',
      options: [
        'Delegation',
        'Description',
        'Discernment',
        'Diligence',
      ],
      answerKey: 0,
      explanation:
        'Delegation is the competency of thoughtfully choosing what to do with AI versus on your own. Description, Discernment, ' +
        'and Diligence cover communicating, evaluating, and acting responsibly.',
      misconceptionTag: 'four-ds',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q02',
      type: 'mc',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Which of the four Ds maps most directly to writing clear, well-structured prompts?',
      options: [
        'Description',
        'Delegation',
        'Discernment',
        'Diligence',
      ],
      answerKey: 0,
      explanation:
        'Description is communicating clearly with the AI, which is exactly what prompt-writing skill is. Delegation is about ' +
        'what to hand off, Discernment about evaluating output, and Diligence about responsible use.',
      misconceptionTag: 'four-ds',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An analyst accepts an AI-written report without checking its figures against the source, and it contains an invented statistic. Which competency was weak?',
      options: [
        'Discernment: critically evaluating AI outputs',
        'Delegation',
        'Description',
        'None; the model alone is at fault',
      ],
      answerKey: 0,
      explanation:
        'Failing to evaluate the output before trusting it is a Discernment gap. The task was delegated and described fine; the ' +
        'missing step was critically checking the result.',
      misconceptionTag: 'discernment',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.6',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A team ships AI output directly to customers with no process for checking accuracy, bias, or safety. Which competency is missing?',
      options: [
        'Diligence: interacting with AI responsibly and verifying before relying on it',
        'Delegation',
        'Description',
        'Compression',
      ],
      answerKey: 0,
      explanation:
        'Having no responsible-use process before shipping is a Diligence gap. Delegation and Description concern what to hand off ' +
        'and how to ask, and "compression" is not one of the four Ds.',
      misconceptionTag: 'diligence',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q05',
      type: 'mc',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What does AI Fluency aim for?',
      options: [
        'Interacting with AI in ways that are effective, efficient, ethical, and safe',
        'Replacing all human judgment with AI',
        'Maximizing token usage per request',
        'Avoiding AI tools entirely',
      ],
      answerKey: 0,
      explanation:
        'AI Fluency is about effective, efficient, ethical, and safe collaboration with AI. It is neither replacing judgment nor ' +
        'avoiding AI, and it has nothing to do with maximizing tokens.',
      misconceptionTag: 'ai-fluency-goal',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.6',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two competencies are about checking and responsibility rather than input? Select TWO.',
      options: [
        'Discernment',
        'Diligence',
        'Delegation',
        'Description',
        'Compression',
      ],
      answerKey: [0, 1],
      explanation:
        'Discernment (evaluating outputs) and Diligence (responsible use and verification) are the checking-and-responsibility ' +
        'competencies. Delegation and Description are about what to hand off and how to communicate, and compression is not a D.',
      misconceptionTag: 'four-ds',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q07',
      type: 'cloze',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: in the four Ds, ___ is deciding what to hand to AI, while ___ is communicating clearly with it.',
      blanks: [
        { options: ['Delegation', 'Discernment', 'Diligence'] },
        { options: ['Description', 'Delegation', 'Diligence'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Delegation is choosing what to hand off, and Description is clear communication. Discernment and Diligence cover ' +
        'evaluating outputs and responsible use, so they do not fit these blanks.',
      misconceptionTag: 'four-ds',
      sourceUrls: [AIF, AIFC],
    },
    {
      id: 'c4-u4-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'ai-fluency-4d',
      taskStatement: '4.6',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: Discernment in the AI Fluency framework means trusting AI outputs without review.',
      options: [
        'False, Discernment is critically evaluating AI outputs and behavior',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Discernment is the opposite of blind trust: it is the practice of critically evaluating what the AI produces and how it ' +
        'behaves.',
      misconceptionTag: 'discernment',
      sourceUrls: [AIF, AIFC],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: name the four Ds of AI Fluency and give a one-line example of Discernment versus Diligence.',
    conceptId: 'ai-fluency-4d',
    keyPointIds: [
      'kp-ai-fluency-4d-1',
      'kp-ai-fluency-4d-2',
      'kp-ai-fluency-4d-3',
      'kp-ai-fluency-4d-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
