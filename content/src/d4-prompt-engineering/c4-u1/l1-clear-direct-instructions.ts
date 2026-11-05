// content/src/d4-prompt-engineering/c4-u1/l1-clear-direct-instructions.ts
//
// C4-U1-L1 — Clear, direct instructions; system prompts and role prompting. Task statement 4.1
// (explicit, specific criteria beat vague instructions). Every claim traces to Anthropic's
// "Prompting best practices" (claude-prompting-best-practices), verified 2026-07-14 against the
// cited page (Be clear and direct, Add context, Give Claude a role sections).
//
// Confusion pair targeted: vague-vs-specific instructions, and where a role belongs (system prompt,
// not an assistant prefill). The explain-back and several distractors attack "the model will infer
// what I want from a short, vague prompt".

import { defineLesson } from '../../index';

const PBP = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices';
const CLEAR = `${PBP}#be-clear-and-direct`;
const CONTEXT = `${PBP}#add-context-to-improve-performance`;
const ROLE = `${PBP}#give-claude-a-role`;

export const l1ClearDirectInstructions = defineLesson({
  id: 'c4-u1-l1',
  title: 'Clear, direct instructions',
  order: 0,
  concept: {
    conceptId: 'clear-direct-instructions',
    analogy:
      'Treat Claude like a brilliant new hire on day one: it is capable but has none of your unspoken ' +
      'context. The more precisely you spell out the task, the format, and why it matters, the better the result.',
    plainExplanation:
      'Clear, explicit, specific instructions beat vague ones. State the exact output format and any ' +
      'constraints, give steps as a numbered list when order matters, and add the reason behind an ' +
      'instruction so Claude can generalize. Set a role in the system prompt to focus tone and behavior. ' +
      'If a colleague with minimal context would be confused by your prompt, Claude will be too.',
    examWords: ['system prompt', 'role prompting', 'golden rule', 'sequential steps', 'specific instructions'],
    keyPoints: [
      { id: 'kp-clear-direct-instructions-1', text: 'Clear, explicit, specific instructions produce better results than vague prompts; state the exact output format and constraints.' },
      { id: 'kp-clear-direct-instructions-2', text: 'Golden rule of clear prompting: if a colleague with minimal context would be confused by your prompt, Claude will be too.' },
      { id: 'kp-clear-direct-instructions-3', text: 'Give instructions as sequential numbered steps when order matters, and add context or motivation so Claude can generalize.' },
      { id: 'kp-clear-direct-instructions-4', text: 'Set a role in the system prompt to focus Claude behavior and tone for your use case.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u1-l1-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You ask Claude to "make a dashboard" and get a bare-bones result. Following the be-clear-and-direct guidance, what is the most reliable fix?',
      options: [
        'Add specific instructions about the desired features, format, and constraints',
        'Resend the same prompt several times and keep the best output',
        'Lower max_tokens to force the model to focus',
        'Move the same vague request into the system prompt unchanged',
      ],
      answerKey: 0,
      explanation:
        'The guidance is to be specific about the desired output and explicitly request "above and beyond" work rather ' +
        'than relying on the model to infer it from a vague prompt. Resending the same vague prompt changes nothing about ' +
        'the missing detail that caused the thin result.',
      misconceptionTag: 'vague-vs-specific',
      sourceUrls: [CLEAR],
    },
    {
      id: 'c4-u1-l1-q02',
      type: 'mc',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Which check best predicts whether a prompt is clear enough for Claude, per the golden rule?',
      options: [
        'Show it to a colleague with minimal context; if they would be confused, Claude will be too',
        'Confirm the prompt is under 50 words',
        'Make sure it contains at least one code block',
        'Verify it uses no XML tags',
      ],
      answerKey: 0,
      explanation:
        'The golden rule of clear prompting is exactly the colleague test: minimal-context confusion predicts model ' +
        'confusion. Length and formatting rules are not the test; a short prompt can still be perfectly clear or hopelessly vague.',
      misconceptionTag: 'golden-rule',
      sourceUrls: [CLEAR],
    },
    {
      id: 'c4-u1-l1-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A legal-analysis app returns generic answers. You want a consistent expert tone and sharper domain focus with one change. What fits best?',
      options: [
        'Set a role in the system prompt, such as "You are a seasoned securities lawyer"',
        'Prefill the final assistant turn with the expert persona',
        'Raise temperature so the answers vary more',
        'Repeat the same instructions three times in the user turn',
      ],
      answerKey: 0,
      explanation:
        'A role set in the system prompt focuses Claude behavior and tone, and even a single sentence makes a difference. ' +
        'Prefilling the last assistant turn is the trap: it is no longer supported on current models and is the wrong lever for a persona.',
      misconceptionTag: 'role-in-system-vs-prefill',
      sourceUrls: [ROLE],
    },
    {
      id: 'c4-u1-l1-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'An engineer prompts "write good code" and is unhappy with the output. Per the be-clear-and-direct guidance, what is the core flaw?',
      options: [
        'It is not specific: it names no language, constraints, or desired output format',
        'It is too short to be parsed by the model',
        'It should have been placed in an assistant prefill',
        'It needs a higher effort setting to work',
      ],
      answerKey: 0,
      explanation:
        'Being specific about the desired output and constraints is the whole point; "good" is undefined, so the model has ' +
        'nothing concrete to aim at. Length is not the problem, and effort settings do not substitute for saying what you want.',
      misconceptionTag: 'vague-vs-specific',
      sourceUrls: [CLEAR],
    },
    {
      id: 'c4-u1-l1-q05',
      type: 'mc',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Why does explaining the reason behind an instruction (for example, "this will be read aloud by a text-to-speech engine") help?',
      options: [
        'Claude generalizes from the explanation to handle related cases the rule did not spell out',
        'It reduces the token cost of the request',
        'It disables markdown in the response automatically',
        'It forces the response to be valid JSON',
      ],
      answerKey: 0,
      explanation:
        'Providing context or motivation lets Claude understand the goal and apply it to cases you did not enumerate. It is ' +
        'about comprehension, not cost or formatting side effects, so the other options describe things adding context does not do.',
      misconceptionTag: 'context-motivation',
      sourceUrls: [CONTEXT],
    },
    {
      id: 'c4-u1-l1-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two practices make instructions clearer per the guidance? Select TWO.',
      options: [
        'Specify the desired output format and constraints',
        'Give ordered steps as a numbered list when order matters',
        'Keep the prompt vague so the model stays flexible',
        'Rely on the model to infer above-and-beyond behavior on its own',
        'Avoid stating any role in the system prompt',
      ],
      answerKey: [0, 1],
      explanation:
        'Explicit format and constraints plus ordered numbered steps are exactly what the guidance recommends. The other ' +
        'options invert it: vagueness and hoping the model infers ambition are what cause thin, inconsistent output.',
      misconceptionTag: 'vague-vs-specific',
      sourceUrls: [CLEAR],
    },
    {
      id: 'c4-u1-l1-q07',
      type: 'multi',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 3,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'A prompt asks for a "fully featured" result but the model stays minimal. Which two moves match the be-clear-and-direct guidance? Select TWO.',
      options: [
        'Explicitly request the extra behavior, such as "go beyond the basics and include as many relevant features as possible"',
        'Add modifiers that describe the exact quality and level of detail you want',
        'Assume the model will infer ambition from a short prompt',
        'Reduce max_tokens to encourage the model to be thorough',
        'Remove all constraints so the model has more freedom',
      ],
      answerKey: [0, 1],
      explanation:
        'Explicitly requesting more and adding quality or detail modifiers is how the guidance turns a minimal answer into a ' +
        'thorough one. Assuming inference, cutting max_tokens, and stripping constraints all work against the specificity that drives better output.',
      misconceptionTag: 'vague-vs-specific',
      sourceUrls: [CLEAR],
    },
    {
      id: 'c4-u1-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'clear-direct-instructions',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: putting a one-sentence role in the system prompt can meaningfully shift Claude tone and focus.',
      options: [
        'True, even a single sentence role makes a difference',
        'False',
      ],
      answerKey: 0,
      explanation:
        'Setting a role in the system prompt focuses behavior and tone, and the guidance notes even a single sentence helps. ' +
        'It is a small, reliable lever for steering how Claude responds.',
      misconceptionTag: 'role-in-system-vs-prefill',
      sourceUrls: [ROLE],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your teammate says "the model should just know what I want from a short prompt." Using the golden rule, explain what to change and why.',
    conceptId: 'clear-direct-instructions',
    keyPointIds: [
      'kp-clear-direct-instructions-1',
      'kp-clear-direct-instructions-2',
      'kp-clear-direct-instructions-3',
      'kp-clear-direct-instructions-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
