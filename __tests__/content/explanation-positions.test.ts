// __tests__/content/explanation-positions.test.ts  (smoke fix: content)
//
// The content build reorders every mc, multi and cloze option list (canonicalizeQuestionOptions in
// content/src/index.ts) so the correct answer is not always written first, and the match renderer
// shuffles its answers. An explanation that points at options by POSITION ("the first two statements",
// "option B", "the last two") therefore points at the wrong ones on screen: c0-u1-l1-q06 said "the first
// two statements hold" while its true statements show 1st and 4th. Explanations name options by what
// they say. Order questions are exempt: "first" and "last" there describe the sequence being taught.

import { describe, expect, it } from '@jest/globals';

// Importing the course modules and the exam register registers every question into the catalog.
import '../../content/src/meta/course';
import '../../content/src/d1-agentic-architecture/course';
import '../../content/src/d2-tool-design-mcp/course';
import '../../content/src/d3-claude-code-config/course';
import '../../content/src/d4-prompt-engineering/course';
import '../../content/src/d5-context-management/course';
import '../../content/src/exams';
import { getCatalog } from '../../content/src/index';

const POSITIONAL: readonly RegExp[] = [
  // "the first two statements", "the last option", "the top two answers"
  /\b(?:first|second|third|fourth|fifth|last|final|top|bottom|middle)\s+(?:two|three|four|ones?|options?|choices?|answers?|statements?|items?|picks?|pairs?)\b/i,
  // "option B", "answer 3" (capital letters only, so "answers a question" is not a hit)
  /\b(?:[Oo]ptions?|[Cc]hoices?|[Aa]nswers?|[Ss]tatements?)\s+(?:[A-F]|[1-6])\b/,
  // "the options above", "the below choices"
  /\b(?:options?|choices?|answers?|statements?)\s+(?:above|below)\b|\b(?:above|below)\s+(?:options?|choices?|answers?|statements?)\b/i,
  // "listed first", "(B)"
  /\blisted\s+(?:first|second|last|above|below)\b/i,
  /\(\s*[A-F]\s*\)/,
];

describe('question explanations', () => {
  const questions = getCatalog().questions.filter((question) => question.type !== 'order');

  it('covers the whole catalog', () => {
    expect(questions.length).toBeGreaterThan(600);
  });

  it('name options by what they say, never by their position on screen', () => {
    const positional = questions
      .filter((question) => POSITIONAL.some((pattern) => pattern.test(question.explanation)))
      .map((question) => `${question.id}: ${question.explanation}`);
    expect(positional).toEqual([]);
  });
});
