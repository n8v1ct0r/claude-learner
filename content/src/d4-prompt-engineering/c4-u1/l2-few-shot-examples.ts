// content/src/d4-prompt-engineering/c4-u1/l2-few-shot-examples.ts
//
// C4-U1-L2 — Few-shot (multishot) prompting. Task statement 4.2 (examples are the most effective way
// to get consistent formatted output; diverse examples reduce hallucination). Every claim traces to
// Anthropic's "Prompting best practices" (Use examples effectively section), verified 2026-07-14.
//
// Confusion pair targeted: the belief that examples mainly teach facts, and that a few near-identical
// examples are as good as diverse ones. Distractors attack both.

import { defineLesson } from '../../index';

const PBP = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices';
const EXAMPLES = `${PBP}#use-examples-effectively`;

export const l2FewShotExamples = defineLesson({
  id: 'c4-u1-l2',
  title: 'Few-shot examples',
  order: 1,
  concept: {
    conceptId: 'few-shot-examples',
    analogy:
      'Showing beats telling. Handing a new cook three finished plates to match teaches the format faster ' +
      'than a paragraph of rules, and a few worked examples teach Claude the shape of the output the same way.',
    plainExplanation:
      'Few-shot (also called multishot) prompting gives Claude a few examples of the input-to-output pattern ' +
      'you want. Examples are one of the most reliable ways to steer output format, tone, and structure. Make ' +
      'them relevant to your real case, diverse enough to cover edge cases, and structured by wrapping each in ' +
      'an example tag so Claude can tell examples from instructions.',
    examWords: ['few-shot', 'multishot', '<example> tags', '<examples>', '3 to 5 examples'],
    keyPoints: [
      { id: 'kp-few-shot-examples-1', text: 'Few-shot (multishot) prompting steers output format, tone, and structure more reliably than instructions alone.' },
      { id: 'kp-few-shot-examples-2', text: 'Include 3 to 5 examples for best results.' },
      { id: 'kp-few-shot-examples-3', text: 'Make examples relevant, diverse (covering edge cases), and structured with <example> tags inside <examples>.' },
      { id: 'kp-few-shot-examples-4', text: 'Diverse examples stop Claude from picking up unintended patterns, and tags separate examples from instructions.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u1-l2-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What is one of the most reliable ways to get consistent output formatting from Claude?',
      options: [
        'Provide a few well-crafted examples of the desired input-to-output format',
        'Increase max_tokens',
        'Write the instructions in all capital letters',
        'Add more adjectives to the request',
      ],
      answerKey: 0,
      explanation:
        'Examples are described as one of the most reliable ways to steer output format, tone, and structure. Token limits, ' +
        'capitalization, and adjectives do not demonstrate the pattern you want the way an example does.',
      misconceptionTag: 'examples-for-format',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q02',
      type: 'mc',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'You are adding examples to steer an extraction format. How many does the multishot guidance recommend for best results?',
      options: [
        '3 to 5 examples',
        'Exactly 1 example',
        'At least 20 examples',
        'As many as fit in the context window',
      ],
      answerKey: 0,
      explanation:
        'The guidance recommends including 3 to 5 examples for best results. A single example gives little signal, and piling ' +
        'in dozens wastes context without a proportional gain in consistency.',
      misconceptionTag: 'example-count',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your classifier works on clean tickets but fails on messy ones. Your three examples are all short, well-formed tickets. What is the best fix?',
      options: [
        'Add diverse examples that cover edge cases such as long or malformed tickets',
        'Remove the examples so the model generalizes on its own',
        'Duplicate the cleanest example several more times',
        'Rewrite every example to use the exact same template',
      ],
      answerKey: 0,
      explanation:
        'Diverse examples that cover edge cases are exactly what keep the model from overfitting to clean inputs. Removing ' +
        'examples loses the steering, and duplicating one clean example makes the narrowness worse, not better.',
      misconceptionTag: 'diverse-examples',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A prompt pastes three examples as plain paragraphs mixed in with the instructions, and Claude sometimes treats an example as a command. What is the fix?',
      options: [
        'Wrap each example in <example> tags, all inside <examples>, so Claude separates them from instructions',
        'Delete two of the three examples',
        'Move the examples into the system prompt as a role',
        'Convert the examples to uppercase text',
      ],
      answerKey: 0,
      explanation:
        'Structuring examples in tags is what lets Claude distinguish demonstrations from instructions, which is the exact ' +
        'failure here. Cutting examples or shouting them in uppercase does not solve the parsing ambiguity that caused the bug.',
      misconceptionTag: 'structured-examples',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q05',
      type: 'mc',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Why does the guidance stress diverse examples rather than several near-identical ones?',
      options: [
        'So Claude does not pick up unintended patterns from the examples',
        'To reduce the token cost of the prompt',
        'Because identical examples cause a 400 error',
        'Because diversity disables markdown in the output',
      ],
      answerKey: 0,
      explanation:
        'Varied examples keep Claude from latching onto an accidental shared trait as if it were the rule. Diversity is about ' +
        'signal quality, not cost or API errors, so the other options miss why it matters.',
      misconceptionTag: 'diverse-examples',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 3,
      stem: 'Which three traits should few-shot examples have? Select THREE.',
      options: [
        'Relevant to your actual use case',
        'Diverse, covering edge cases',
        'Structured in <example> tags',
        'Identical to one another',
        'Hidden inside an assistant prefill',
      ],
      answerKey: [0, 1, 2],
      explanation:
        'Relevant, diverse, and structured are the three properties the guidance calls for. Identical examples teach narrow ' +
        'patterns, and prefill is not where examples belong, so both are traps.',
      misconceptionTag: 'diverse-examples',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q07',
      type: 'cloze',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: for best results include ___ examples, and wrap each one in ___ so Claude can tell examples from instructions.',
      blanks: [
        { options: ['3 to 5', 'exactly 10', '20 or more'] },
        { options: ['<example> tags', '<system> tags', '<thinking> tags'] },
      ],
      answerKey: [0, 0],
      explanation:
        'The guidance recommends 3 to 5 examples wrapped in example tags. Ten or twenty examples overloads context, and system ' +
        'or thinking tags serve different purposes than marking a demonstration.',
      misconceptionTag: 'structured-examples',
      sourceUrls: [EXAMPLES],
    },
    {
      id: 'c4-u1-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'few-shot-examples',
      taskStatement: '4.2',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: examples are mainly useful for teaching Claude facts, not for controlling output format.',
      options: [
        'False, examples are one of the most reliable ways to steer output format',
        'True',
      ],
      answerKey: 0,
      explanation:
        'The primary value of few-shot examples is steering format, tone, and structure. Treating them as a way to inject facts ' +
        'misses the reason the guidance highlights them.',
      misconceptionTag: 'examples-for-format',
      sourceUrls: [EXAMPLES],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: how would you use few-shot examples to make Claude return the exact output format you want, and what makes a good set of examples?',
    conceptId: 'few-shot-examples',
    keyPointIds: [
      'kp-few-shot-examples-1',
      'kp-few-shot-examples-2',
      'kp-few-shot-examples-3',
      'kp-few-shot-examples-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 225,
});
