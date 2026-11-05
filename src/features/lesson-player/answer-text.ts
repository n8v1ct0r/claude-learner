// src/features/lesson-player/answer-text.ts
//
// Spoken answer feedback for VoiceOver. `accessibilityRole="alert"` does nothing on iOS, so the players
// announce the result explicitly (AccessibilityInfo.announceForAccessibility): "Correct." or, after a
// miss, "Not quite. Best answer: …" with the keyed answer written out for every question type. The
// wording follows the no-shame reframe in evals/banned-copy.json ("Not quite").

import type { Question } from '../../../content/schema/types';

/** The keyed answer written out as one speakable phrase. */
export function bestAnswerText(question: Question): string {
  switch (question.type) {
    case 'mc':
      return question.options[question.answerKey] ?? '';
    case 'multi':
      return question.answerKey.map((index) => question.options[index]).filter(Boolean).join('; ');
    case 'cloze':
      return question.blanks
        .map((blank, index) => `Blank ${index + 1}: ${blank.options[question.answerKey[index]] ?? ''}`)
        .join('; ');
    case 'order':
      return question.answerKey.map((stepIndex, position) => `${position + 1}. ${question.steps[stepIndex]}`).join('; ');
    case 'match':
      return question.pairs.map((pair) => `${pair.left}: ${pair.right}`).join('; ');
  }
}

/** What VoiceOver says when an answer is graded. */
export function answerAnnouncement(correct: boolean, bestAnswer: string | undefined): string {
  if (correct) return 'Correct.';
  const answer = bestAnswer?.trim().replace(/[.!?]+$/, '');
  return answer ? `Not quite. Best answer: ${answer}.` : 'Not quite.';
}
