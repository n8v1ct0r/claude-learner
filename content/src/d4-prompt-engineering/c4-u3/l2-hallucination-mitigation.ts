// content/src/d4-prompt-engineering/c4-u3/l2-hallucination-mitigation.ts
//
// C4-U3-L2 — Hallucination mitigation. Task statements 4.1 (permission to say "I don't know",
// citation grounding, external-knowledge restriction) and 4.3 (optional/nullable fields prevent
// fabrication). Claims trace to Anthropic's "Reduce hallucinations" guardrails page (and Structured
// outputs for nullable fields), verified 2026-07-14.
//
// Confusion pair targeted: forcing a definite answer INCREASES fabrication; allowing "I don't know"
// and grounding in quotes reduces it.

import { defineLesson } from '../../index';

const HALL = 'https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations';
const SO = 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs';

export const l2HallucinationMitigation = defineLesson({
  id: 'c4-u3-l2',
  title: 'Hallucination mitigation',
  order: 1,
  concept: {
    conceptId: 'hallucination-mitigation',
    analogy:
      'Give Claude an honorable way out. Telling it to say "I am not sure" when the text does not cover ' +
      'something works like telling a witness they may answer "I do not know" instead of guessing, which sharply ' +
      'cuts made-up answers.',
    plainExplanation:
      'To reduce hallucinations, explicitly give Claude permission to admit it does not know or lacks enough ' +
      'information. Ground answers by asking for direct quotes first and restricting Claude to the provided ' +
      'documents. Make output auditable by having Claude attach a supporting quote to each claim and retract ' +
      'any it cannot support. In structured extraction, optional or nullable fields let Claude leave a field ' +
      'empty instead of fabricating.',
    examWords: ['permission to say "I don\'t know"', 'citation grounding', 'external knowledge restriction', 'optional / nullable fields'],
    keyPoints: [
      { id: 'kp-hallucination-mitigation-1', text: 'Explicitly allowing Claude to say it does not know or lacks enough information sharply reduces false information.' },
      { id: 'kp-hallucination-mitigation-2', text: 'Ground answers by asking for direct quotes first and restricting Claude to the provided documents.' },
      { id: 'kp-hallucination-mitigation-3', text: 'Make output auditable: have Claude cite a supporting quote for each claim and retract claims it cannot support.' },
      { id: 'kp-hallucination-mitigation-4', text: 'In extraction, optional or nullable fields let Claude leave data blank instead of fabricating when the source lacks it.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u3-l2-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What simple instruction most reduces made-up answers when a document may lack the information?',
      options: [
        'Give Claude explicit permission to admit it does not know',
        'Increase max_tokens',
        'Ask for a longer answer',
        'Raise the temperature',
      ],
      answerKey: 0,
      explanation:
        'Permission to admit uncertainty is a simple, high-impact way to cut fabrication. More tokens, longer answers, or higher ' +
        'temperature do not give the model an honest way to say the text does not cover something.',
      misconceptionTag: 'permission-to-not-know',
      sourceUrls: [HALL],
    },
    {
      id: 'c4-u3-l2-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An assistant confidently invents figures that are not in the source report. Which change grounds it?',
      options: [
        'Tell it to answer only from the provided documents and quote the supporting text',
        'Ask it to be more creative',
        'Remove the documents from the prompt',
        'Add an assistant prefill',
      ],
      answerKey: 0,
      explanation:
        'Restricting the model to the provided documents and requiring supporting quotes ties answers to real text. Encouraging ' +
        'creativity or removing the source would make invention more likely, not less.',
      misconceptionTag: 'external-knowledge-restriction',
      sourceUrls: [HALL],
    },
    {
      id: 'c4-u3-l2-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A summarizer makes claims you cannot trace to the source. You want each claim checkable. What matches the guidance?',
      options: [
        'Have it attach a supporting quote to each claim and drop claims it cannot support',
        'Ask it to sound more confident',
        'Lower max_tokens',
        'Disable XML tags',
      ],
      answerKey: 0,
      explanation:
        'Citing a supporting quote per claim, and retracting unsupported ones, makes the output auditable. Asking for confidence ' +
        'would encourage unsupported claims, and token or tag changes do not add traceability.',
      misconceptionTag: 'citation-grounding',
      sourceUrls: [HALL],
    },
    {
      id: 'c4-u3-l2-q04',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'In structured extraction, Claude invents a value for a field the document leaves blank. Which schema design helps?',
      options: [
        'Make the field optional or nullable so Claude can leave it empty',
        'Make every field required',
        'Remove the schema entirely',
        'Add more retries',
      ],
      answerKey: 0,
      explanation:
        'Optional or nullable fields give the model a valid way to represent missing data instead of fabricating one. Forcing ' +
        'every field to be required pressures it to invent a value, and retries do not create missing facts.',
      misconceptionTag: 'nullable-fields',
      sourceUrls: [SO, HALL],
    },
    {
      id: 'c4-u3-l2-q05',
      type: 'mc',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What does "external knowledge restriction" mean as a hallucination control?',
      options: [
        'Instruct Claude to use only the provided documents, not its general knowledge',
        'Turn off the model tokenizer',
        'Reduce the context window size',
        'Force a tool call on every turn',
      ],
      answerKey: 0,
      explanation:
        'Restricting the model to provided documents keeps it from filling gaps with unverified general knowledge. The other ' +
        'options describe unrelated mechanics that do not constrain the source of the answer.',
      misconceptionTag: 'external-knowledge-restriction',
      sourceUrls: [HALL],
    },
    {
      id: 'c4-u3-l2-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 3,
      stem: 'Which three reduce hallucinations? Select THREE.',
      options: [
        'Allow Claude to admit it does not know',
        'Ask for direct quotes before answering',
        'Use optional or nullable fields for missing data',
        'Tell Claude to always produce a definite answer',
        'Raise temperature for more variety',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Permission to admit uncertainty, quote-first grounding, and nullable fields all reduce fabrication. Forcing a definite ' +
        'answer and adding randomness push the model toward inventing content.',
      misconceptionTag: 'permission-to-not-know',
      sourceUrls: [HALL, SO],
    },
    {
      id: 'c4-u3-l2-q07',
      type: 'cloze',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: giving Claude permission to admit ___ reduces fabrication, and grounding claims in ___ from the source makes the output auditable.',
      blanks: [
        { options: ['uncertainty', 'speed', 'markdown'] },
        { options: ['direct quotes', 'guesses', 'its training data'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Admitting uncertainty and grounding in direct quotes are the two levers. Speed, formatting, guesses, or training-data ' +
        'recall do not tie the answer to verifiable source text.',
      misconceptionTag: 'citation-grounding',
      sourceUrls: [HALL],
    },
    {
      id: 'c4-u3-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: forcing Claude to always give a definite answer reduces hallucinations.',
      options: [
        'False, allowing an "I do not know" answer reduces made-up answers',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Forcing a definite answer pressures the model to fabricate when it lacks the information. Allowing it to admit uncertainty ' +
        'is what reduces made-up answers.',
      misconceptionTag: 'permission-to-not-know',
      sourceUrls: [HALL],
    },
    {
      id: 'c4-u3-l2-q09',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'hallucination-mitigation',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A high-stakes extraction pipeline occasionally emits a fabricated figure that slips past your other checks, and you want an automated way to flag likely hallucinations before a human reviews them. Which technique from the guidance fits?',
      options: [
        'Best-of-N verification: run the same prompt several times and compare outputs, treating inconsistencies across runs as likely hallucinations',
        'Raise the temperature so the outputs vary more and then average them together',
        'Increase max_tokens so the model has more room to be accurate',
        'Instruct the model to sound more confident so it commits to a single answer',
      ],
      answerKey: 0,
      explanation:
        'Best-of-N verification runs the same prompt multiple times and compares the outputs; disagreement across runs ' +
        'is the signal that a value may be fabricated. Raising the temperature is the trap: it adds randomness for its ' +
        'own sake, and averaging invented figures never reveals which ones lack support. More tokens or more ' +
        'confidence do not test consistency at all.',
      misconceptionTag: 'best-of-n-verification',
      sourceUrls: [HALL],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a teammate forces the model to always answer to avoid blanks, and it starts inventing facts. Explain the better approach and why it grounds the output.',
    conceptId: 'hallucination-mitigation',
    keyPointIds: [
      'kp-hallucination-mitigation-1',
      'kp-hallucination-mitigation-2',
      'kp-hallucination-mitigation-3',
      'kp-hallucination-mitigation-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 250,
});
