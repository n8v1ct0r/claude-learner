// content/src/d4-prompt-engineering/c4-u2/l3-extraction-methods.ts
//
// C4-U2-L3 — Tool-based extraction vs structured outputs vs legacy prefill, and validation-retry
// loops. Task statements 4.3 (schema-forcing methods) and 4.4 (validation/retry fixes format, not
// missing data). Claims trace to "Structured outputs" and the "Prompting best practices" prefill
// migration section, verified 2026-07-14.
//
// Confusion pair targeted: retries fix format and structural errors, NOT information the source never
// contained; and prefill-based format forcing is retired on current models.
//
// Source note (2026-09-24): the "limits of retry" claim (q04, q06, q08) is stated by the public CCA-F
// Exam Guide v1.0, task 4.4 ("retries are ineffective when the required information is simply absent
// from the source document (vs format or structural errors)"), not by the structured-outputs page,
// which mentions retries only for schema violations and max_tokens. Those items cite the guide too.
// Its S3 path carries a timestamp-like segment and may change on re-upload.

import { defineLesson } from '../../index';

const SO = 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs';
const PREFILL = 'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#migrating-away-from-prefilled-responses';
const EXAM_GUIDE =
  'https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf';

export const l3ExtractionMethods = defineLesson({
  id: 'c4-u2-l3',
  title: 'Extraction methods and retry loops',
  order: 2,
  concept: {
    conceptId: 'extraction-methods',
    analogy:
      'Three ways to make Claude return clean data are like three ways to collect answers: a strict form ' +
      '(structured outputs), a function-call slip (tool use), or the old trick of starting the sentence for it ' +
      '(prefill). The old trick is retired on current models.',
    plainExplanation:
      'To force machine-readable output you can use Structured Outputs (a JSON schema) or strict tool use ' +
      '(schema-validated tool inputs). Prefilling the last assistant turn to force a format is no longer ' +
      'supported on current models and returns a 400 error, so migrate that to structured outputs or tools. ' +
      'When output must satisfy rules a schema cannot express, add a validation step and retry with the ' +
      'specific error fed back; retries fix format and structural errors, not information the source never had.',
    examWords: ['strict tool use', 'Structured Outputs', 'prefill (400 error)', 'validation-retry', 'tool_choice'],
    keyPoints: [
      { id: 'kp-extraction-methods-1', text: 'Force machine-readable output with Structured Outputs (JSON schema) or strict tool use (schema-validated tool inputs).' },
      { id: 'kp-extraction-methods-2', text: 'Prefilling the last assistant turn to force a format is unsupported on current models and returns a 400 error; migrate to structured outputs or tools.' },
      { id: 'kp-extraction-methods-3', text: 'A validation-and-retry loop that feeds the specific validation error back fixes format and structural errors.' },
      { id: 'kp-extraction-methods-4', text: 'Retries do not recover information the source never contained, so separate format errors from missing data.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u2-l3-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'You need guaranteed JSON matching a schema on a current model. Which approach fits?',
      options: [
        'Use Structured Outputs (json_schema) or strict tool use',
        'Prefill the assistant turn with an opening brace',
        'Ask politely and hope the output parses',
        'Only lower the temperature',
      ],
      answerKey: 0,
      explanation:
        'Structured Outputs and strict tool use both enforce a schema on current models. Prefill is deprecated, and lowering ' +
        'temperature or asking nicely does not guarantee schema conformance.',
      misconceptionTag: 'schema-forcing-methods',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l3-q02',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Legacy code prefills the assistant message with an opening brace to force JSON, and now returns a 400 error on the new model. What is the right migration?',
      options: [
        'Remove the prefill and use Structured Outputs or a tool schema instead',
        'Add a second prefill block',
        'Set additionalProperties to true',
        'Increase max_tokens',
      ],
      answerKey: 0,
      explanation:
        'Prefilling the last assistant turn is unsupported on current models, so the format-forcing job moves to Structured ' +
        'Outputs or tools. Adding prefills, flipping additionalProperties, or raising max_tokens does not address the 400.',
      misconceptionTag: 'prefill-deprecated',
      sourceUrls: [PREFILL],
    },
    {
      id: 'c4-u2-l3-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your extractor occasionally returns JSON that parses but violates a business rule (end date before start date). What design catches it?',
      options: [
        'Add a validation step and, on failure, retry with the specific error appended',
        'Raise max_tokens',
        'Trust the schema, since it prevents this',
        'Switch to an assistant prefill',
      ],
      answerKey: 0,
      explanation:
        'A schema cannot express "end date after start date," so a validation step plus an error-feedback retry is the fix. The ' +
        'schema does not catch semantic rules, and prefill and token changes are irrelevant here.',
      misconceptionTag: 'validation-retry',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l3-q04',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.4',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'A field stays blank because the source document never stated it. Your loop keeps retrying and still gets nothing. What is the right conclusion?',
      options: [
        'Retries fix format errors, not missing information; make the field optional or return "not found"',
        'Retry more times and it will eventually appear',
        'The schema must be broken',
        'A prefill will supply the missing value',
      ],
      answerKey: 0,
      explanation:
        'If the information is not in the source, no number of retries will produce it; a retry loop only fixes format and ' +
        'structural problems. The correct design lets the field be optional or explicitly reports it as not found.',
      misconceptionTag: 'retries-vs-missing-data',
      sourceUrls: [SO, EXAM_GUIDE],
    },
    {
      id: 'c4-u2-l3-q05',
      type: 'mc',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'What does strict tool use (strict set to true) guarantee?',
      options: [
        'The tool name and inputs validate against your schema',
        'The tool result is factually correct',
        'Parallel tool calls are disabled',
        'The model always calls a tool',
      ],
      answerKey: 0,
      explanation:
        'Strict tool use guarantees schema-valid tool names and inputs. It says nothing about whether the result is correct, and ' +
        'it does not control parallel calls or force a tool call.',
      misconceptionTag: 'strict-tool-use',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l3-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.4',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are true when choosing an output method? Select TWO.',
      options: [
        'Structured Outputs and strict tool use both enforce a schema',
        'Prefill-based format forcing is deprecated on current models',
        'A validation-retry loop can recover facts missing from the source',
        'tool_choice "any" guarantees correct field values',
        'A schema guarantees semantic correctness',
      ],
      answerKey: [0, 1],
      explanation:
        'Both schema-based methods enforce structure, and prefill format forcing is retired. Retries cannot invent missing facts, ' +
        'tool_choice does not fix values, and schemas do not guarantee meaning.',
      misconceptionTag: 'retries-vs-missing-data',
      sourceUrls: [SO, PREFILL, EXAM_GUIDE],
    },
    {
      id: 'c4-u2-l3-q07',
      type: 'order',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.4',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Order the steps of a robust validation-retry loop.',
      steps: [
        'Request output constrained to your schema',
        'Validate the output against rules the schema cannot express',
        'On failure, append the specific validation error and retry',
        'After success or a max retry count, return the result or escalate',
      ],
      answerKey: [0, 1, 2, 3],
      explanation:
        'Constrain, then validate the semantics, then retry with the exact error, and finally return or escalate at a retry cap. ' +
        'Retrying without feeding back the specific error, or looping forever, are the failure modes this order avoids.',
      misconceptionTag: 'validation-retry',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l3-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'extraction-methods',
      taskStatement: '4.4',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: adding more retries will eventually extract a value the source document never contained.',
      options: [
        'False, retries fix format errors, not missing information',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Retries only help with format and structural failures. If the source never held the value, retrying cannot conjure it.',
      misconceptionTag: 'retries-vs-missing-data',
      sourceUrls: [SO, EXAM_GUIDE],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: your extractor keeps retrying an empty field that the document never mentioned. Explain what retries can and cannot fix, and which method to use to force the schema.',
    conceptId: 'extraction-methods',
    keyPointIds: [
      'kp-extraction-methods-1',
      'kp-extraction-methods-2',
      'kp-extraction-methods-3',
      'kp-extraction-methods-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
