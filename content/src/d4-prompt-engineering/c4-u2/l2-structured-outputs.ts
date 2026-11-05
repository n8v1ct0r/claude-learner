// content/src/d4-prompt-engineering/c4-u2/l2-structured-outputs.ts
//
// C4-U2-L2 — Structured Outputs. Task statement 4.3 (schema-guaranteed output; shape not semantics;
// refusal and max_tokens edges). Claims trace to Anthropic's "Structured outputs" page, verified
// 2026-07-14.
//
// Confusion pair targeted: a schema guarantees the SHAPE of the output, not the correctness of the
// values; and the refusal / max_tokens edge cases where the output may not match the schema.

import { defineLesson } from '../../index';

const SO = 'https://platform.claude.com/docs/en/build-with-claude/structured-outputs';

export const l2StructuredOutputs = defineLesson({
  id: 'c4-u2-l2',
  title: 'Structured Outputs',
  order: 1,
  concept: {
    conceptId: 'structured-outputs',
    analogy:
      'Structured Outputs are a fill-in-the-form guarantee. Instead of hoping Claude returns tidy JSON, you ' +
      'hand it a form (a schema) and constrained decoding makes sure every field comes back in the right shape.',
    plainExplanation:
      'Structured Outputs use constrained decoding to guarantee a response that conforms to your JSON schema, ' +
      'so you stop getting parse errors and missing required fields. You turn it on with output_config.format ' +
      'set to a json_schema. It guarantees the shape, not the meaning: the values can still be wrong. Two edge ' +
      'cases can break the guarantee, a safety refusal and hitting the max_tokens limit, so handle them.',
    examWords: ['Structured Outputs', 'output_config.format', 'json_schema', 'constrained decoding', 'stop_reason "refusal"', 'stop_reason "max_tokens"'],
    keyPoints: [
      { id: 'kp-structured-outputs-1', text: 'Structured Outputs use constrained decoding to guarantee responses conform to your JSON schema, eliminating parse errors and missing required fields.' },
      { id: 'kp-structured-outputs-2', text: 'Enable JSON output with output_config.format set to type json_schema plus your schema.' },
      { id: 'kp-structured-outputs-3', text: 'The schema is guaranteed but the values are not: Claude can still return semantically wrong data that still validates.' },
      { id: 'kp-structured-outputs-4', text: 'On a refusal (stop_reason "refusal") or truncation (stop_reason "max_tokens"), the output may not match the schema; retry with higher max_tokens.' },
    ],
  },
  exercises: [
    {
      id: 'c4-u2-l2-q01',
      type: 'mc',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 1,
      estimatedSeconds: 15,
      stem: 'What does the Structured Outputs feature guarantee?',
      options: [
        'The response conforms to your JSON schema: valid, correctly typed, required fields present',
        'The response is always factually correct',
        'The response is always shorter',
        'The response can never trigger a refusal',
      ],
      answerKey: 0,
      explanation:
        'Constrained decoding guarantees schema conformance, so no parse errors and no missing required fields. It does not ' +
        'promise factual correctness, brevity, or immunity from refusals.',
      misconceptionTag: 'schema-shape-not-semantics',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q02',
      type: 'mc',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 15,
      stem: 'Which request field turns on schema-conformant JSON output?',
      options: [
        'output_config.format with type json_schema',
        'temperature set to 0',
        'stop_sequences',
        'the system role',
      ],
      answerKey: 0,
      explanation:
        'JSON structured output is enabled through output_config.format with a json_schema. Temperature, stop sequences, and ' +
        'the system role do not constrain the response to a schema.',
      misconceptionTag: 'output-config-format',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q03',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Structured Outputs give you valid JSON, but an extracted total is sometimes wrong even though it validates. What does this show?',
      options: [
        'The schema guarantees shape, not correctness; semantic errors still need their own validation',
        'The schema was not applied to the request',
        'You must lower max_tokens',
        'A JSON schema disables the model reasoning',
      ],
      answerKey: 0,
      explanation:
        'A validating-but-wrong value is the classic sign that the schema constrains structure, not meaning. The schema was ' +
        'clearly applied (the JSON is valid), so the fix is semantic validation, not a token change.',
      misconceptionTag: 'schema-shape-not-semantics',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q04',
      type: 'mc',
      variant: 'spot-bug',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'A structured-output call sometimes returns truncated, invalid JSON and stop_reason is "max_tokens". What is the correct response?',
      options: [
        'The output hit the token limit; retry with a higher max_tokens',
        'The schema is malformed and must be removed',
        'Switch to an assistant prefill',
        'It refused for safety reasons',
      ],
      answerKey: 0,
      explanation:
        'A max_tokens stop reason means the response was cut off before the JSON completed, so raising max_tokens is the fix. ' +
        'The schema is fine, and this is truncation, not a refusal.',
      misconceptionTag: 'max-tokens-truncation',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q05',
      type: 'mc',
      variant: 'scenario',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      stem: 'Your app assumes every structured-output response matches the schema, but one comes back as a safety refusal that breaks the parser. What should the design account for?',
      options: [
        'On stop_reason "refusal" the output may not match the schema, so handle refusals separately',
        'Refusals always still match the schema',
        'Refusals return a 400 status code',
        'Refusals cannot happen once a schema is set',
      ],
      answerKey: 0,
      explanation:
        'A refusal takes precedence over the schema, so the message may not conform and needs separate handling. Refusals return ' +
        'a 200 status and are still billed, so assuming schema conformance is the bug.',
      misconceptionTag: 'refusal-edge',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q06',
      type: 'multi',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 2,
      estimatedSeconds: 20,
      selectCount: 2,
      stem: 'Which two are true of Structured Outputs? Select TWO.',
      options: [
        'They use constrained decoding to enforce the schema',
        'They remove the need to retry for schema violations',
        'They guarantee the values are factually correct',
        'They require an assistant prefill',
        'They only work with tool_choice "any"',
      ],
      answerKey: [0, 1],
      explanation:
        'Constrained decoding enforces the schema and removes retries for schema violations. They do not guarantee correct values, ' +
        'do not need a prefill, and are independent of tool_choice.',
      misconceptionTag: 'schema-shape-not-semantics',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q07',
      type: 'mc',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 3,
      estimatedSeconds: 20,
      stem: 'You add minLength and maximum constraints to your JSON schema for structured outputs and they seem ignored. Why?',
      options: [
        'Structured outputs do not support numeric or string-length constraints like minimum, maximum, or minLength',
        'Constraints only work when the schema is in the system prompt',
        'You must set additionalProperties to true for constraints to apply',
        'Constraints require tool_choice "any"',
      ],
      answerKey: 0,
      explanation:
        'The supported subset excludes numeric and string-length constraints, so those keywords have no effect. Object schemas ' +
        'actually require additionalProperties false, and constraints are unrelated to tool_choice or prompt placement.',
      misconceptionTag: 'schema-supported-subset',
      sourceUrls: [SO],
    },
    {
      id: 'c4-u2-l2-q08',
      type: 'mc',
      variant: 'tf-speed',
      domain: 'd4',
      conceptId: 'structured-outputs',
      taskStatement: '4.3',
      difficulty: 1,
      estimatedSeconds: 10,
      stem: 'True or false: Structured Outputs guarantee the returned values are correct, not just well formed.',
      options: [
        'False, they guarantee schema shape, not semantic correctness',
        'True',
      ],
      answerKey: 0,
      explanation:
        'Structured Outputs constrain the structure of the response; a value can validate against the schema and still be wrong.',
      misconceptionTag: 'schema-shape-not-semantics',
      sourceUrls: [SO],
    },
  ],
  explainBack: {
    prompt: 'Teach the agent: a teammate says "we use Structured Outputs, so the data must be right." What is true and what is not, and which edge cases still break the schema?',
    conceptId: 'structured-outputs',
    keyPointIds: [
      'kp-structured-outputs-1',
      'kp-structured-outputs-2',
      'kp-structured-outputs-3',
      'kp-structured-outputs-4',
    ],
    estimatedSeconds: 90,
  },
  estimatedSecondsTotal: 230,
});
