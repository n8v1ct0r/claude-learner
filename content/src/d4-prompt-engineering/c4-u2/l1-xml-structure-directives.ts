// content/src/d4-prompt-engineering/c4-u2/l1-xml-structure-directives.ts
//
// C4-U2-L1 — XML tags, prompt templates and variables, positive directives. Task statement 4.1
// (structure prompts so the model parses them unambiguously). Claims trace to Anthropic's "Prompting
// best practices" (Structure prompts with XML tags, Control the format of responses), verified
// 2026-07-14, and, for prompt templates, the Claude Cookbook page "Generate synthetic test data for
// your prompt template" (re-sourced 2026-09-24: the retired "Console prompting tools" page now
// redirects to Prompting best practices, which never states the template claim). The cookbook page
// defines the double-bracket placeholders as the template's "variables" and tests the template
// against many values of them.
//
// Confusion pair targeted: positive directives ("do this") beat negative ones ("do not do that"),
// and untagged user input can be mistaken for instructions.

import { defineLesson } from '../../index';

const PBP = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices';
const XML = `${PBP}#structure-prompts-with-xml-tags`;
const FORMAT = `${PBP}#control-the-format-of-responses`;
const TEMPLATES = 'https://platform.claude.com/cookbook/misc-generate-test-cases';

export const l1XmlStructureDirectives = defineLesson({
  id: 'c4-u2-l1',
  title: 'XML tags and positive directives',
  order: 0,
  concept: {
    conceptId: 'xml-structure-directives',
    analogy:
      'XML tags are labeled bins. When a prompt mixes instructions, context, and data, putting each in its ' +
      'own tagged bin keeps Claude from mistaking your data for a command.',
    plainExplanation:
      'XML tags help Claude parse a complex prompt unambiguously; wrap each content type in its own ' +
      'descriptive tag such as instructions, context, or input. Prompt templates separate the fixed part of ' +
      'a prompt from variable inputs, marked with double-bracket placeholders, so prompts are consistent and ' +
      'testable. To steer formatting, tell Claude what to do rather than what not to do, and use XML tags as ' +
      'format indicators.',
    examWords: ['XML tags', '<instructions>', '<context>', 'prompt template', '{{variable}}', 'positive directives'],
    keyPoints: [
      { id: 'kp-xml-structure-directives-1', text: 'XML tags let Claude parse complex prompts unambiguously; wrap each content type in its own descriptive tag.' },
      { id: 'kp-xml-structure-directives-2', text: 'Use consistent, descriptive tag names and nest tags when content has a natural hierarchy.' },
      { id: 'kp-xml-structure-directives-3', text: 'Prompt templates separate fixed instructions from variable inputs (double-bracket placeholders) so prompts stay consistent and testable.' },
      { id: 'kp-xml-structure-directives-4', text: 'Steer formatting by telling Claude what to do instead of what not to do, and by using XML tags as format indicators.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u2-l1-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'Why wrap different parts of a complex prompt in XML tags like instructions and context?',
      options: [
        'They help Claude parse the prompt unambiguously and separate instructions from data',
        'They compress the prompt to save tokens',
        'They are required or the API returns an error',
        'They switch the model into JSON mode',
      ],
      answerKey: 0,
      explanation:
        'Tags reduce misinterpretation by marking which text is instructions, context, or input. They are not a compression ' +
        'trick, are not mandatory, and do not toggle a JSON mode.',
      misconceptionTag: 'xml-structure',
      sourceUrls: [XML],
    },
    {
      id: 'c4-u2-l1-q02',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A prompt pastes user-provided text right after the instructions, and Claude sometimes obeys instructions hidden in that text. What is the cleanest fix?',
      options: [
        'Wrap the user text in its own tag such as <input> so Claude treats it as data, not instructions',
        'Delete the instructions from the prompt',
        'Merge everything into one paragraph',
        'Add more exclamation marks to the instructions',
      ],
      answerKey: 0,
      explanation:
        'Tagging the user text marks it as data and separates it from your instructions, which is what stops the confusion. ' +
        'Removing instructions or merging everything makes the ambiguity worse.',
      misconceptionTag: 'xml-structure',
      sourceUrls: [XML],
    },
    {
      id: 'c4-u2-l1-q03',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A formatting instruction reads "Do not use markdown." Claude still uses it sometimes. Per the guidance, what works better?',
      options: [
        'State it positively, for example "Write your response in smoothly flowing prose paragraphs"',
        'Repeat "no markdown" three times',
        'Put the rule in an assistant prefill',
        'Lower the effort setting',
      ],
      answerKey: 0,
      explanation:
        'Telling Claude what to do instead of what not to do is the recommended way to steer formatting. Repetition and prefill ' +
        'do not address that a negative instruction leaves the desired format undefined.',
      misconceptionTag: 'positive-directives',
      sourceUrls: [FORMAT],
    },
    {
      id: 'c4-u2-l1-q04',
      type: 'mc',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What is the main benefit of a prompt template with double-bracket variable placeholders?',
      options: [
        'It keeps the fixed prompt stable while the variables are swapped in, so you can test it across many inputs',
        'It doubles the context window',
        'It forces extended thinking on',
        'It removes the need for examples',
      ],
      answerKey: 0,
      explanation:
        'A template marks the parts that change per call as double-bracket variables, so the same fixed prompt can be ' +
        'run against many different values, including generated test cases, while the instructions stay put. It has ' +
        'nothing to do with context size, thinking, or examples.',
      misconceptionTag: 'templates-variables',
      sourceUrls: [TEMPLATES, XML],
    },
    {
      id: 'c4-u2-l1-q05',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'You want only the summary portion of the response wrapped so you can extract it programmatically. What matches the guidance?',
      options: [
        'Ask Claude to put that section inside a named XML tag such as <summary>',
        'Ask it to bold the section',
        'Tell it "do not forget the summary"',
        'Add an assistant prefill',
      ],
      answerKey: 0,
      explanation:
        'Using an XML tag as a format indicator gives you a reliable delimiter to parse. Bolding is not machine-reliable, and a ' +
        'negative reminder does not define where the section starts and ends.',
      misconceptionTag: 'positive-directives',
      sourceUrls: [FORMAT],
    },
    {
      id: 'c4-u2-l1-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are XML-tag best practices? Select TWO.',
      options: [
        'Use consistent, descriptive tag names across your prompts',
        'Nest tags when content has a natural hierarchy',
        'Randomize tag names so the model cannot overfit',
        'Put all content inside a single generic tag',
        'Avoid tags entirely for multi-document prompts',
      ],
      answerKey: [0, 1],
      explanation:
        'Consistent descriptive names and nesting for hierarchy are the recommended practices. Random names, one catch-all tag, ' +
        'and dropping tags for multi-document prompts all reduce the clarity tags exist to provide.',
      misconceptionTag: 'xml-structure',
      sourceUrls: [XML],
    },
    {
      id: 'c4-u2-l1-q07',
      type: 'cloze',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Fill the blanks: to steer formatting, tell Claude ___ instead of what not to do, and wrap distinct content types in ___ so it separates data from instructions.',
      blanks: [
        { options: ['what to do', 'less', 'nothing specific'] },
        { options: ['XML tags', 'emoji', 'quotation marks'] },
      ],
      answerKey: [0, 0],
      explanation:
        'Positive directives plus XML tags are the two levers here. A vaguer instruction or decorative marks do not give the ' +
        'model a clear target or a clean delimiter.',
      misconceptionTag: 'positive-directives',
      sourceUrls: [FORMAT, XML],
    },
    {
      id: 'c4-u2-l1-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'xml-structure-directives',
      taskStatement: '4.1',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: "Do not use bullet points" is a stronger formatting instruction than describing the prose you want.',
      options: [
        'False, positive instructions such as "write flowing prose" steer formatting better',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Telling Claude what to produce is more effective than telling it what to avoid, because a negative leaves the target ' +
        'format undefined.',
      misconceptionTag: 'positive-directives',
      sourceUrls: [FORMAT],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: how do XML tags and positive directives make a messy prompt reliable, and where do template variables fit in?',
    conceptId: 'xml-structure-directives',
    keyPointIds: [
      'kp-xml-structure-directives-1',
      'kp-xml-structure-directives-2',
      'kp-xml-structure-directives-3',
      'kp-xml-structure-directives-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
