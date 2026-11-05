// src/features/lesson-player/renderers/McRenderer.tsx
//
// Single-answer multiple choice — covers the base `mc` type AND its prop variants scenario / spot-bug
// / tf-speed (they differ only in framing and option count: tf-speed has 2 options, the rest 4). A tap
// selects and immediately grades (single answer). Once answered the inputs freeze and the correct
// option is revealed in sage; a wrong pick is marked in warm amber (never red, no-shame rule).
//
// A tf-speed variant additionally shows a calm per-question countdown (TfSpeedTimer) — UNLESS time
// pressure is reduced (useReduceTimePressure), in which case it renders untimed. Grading is identical
// either way, and the XP engine has no speed term, so timed and untimed tf-speed award the same XP
// (WCAG 2.2.1 / GC-10).

import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/design/tokens';
import { useReduceTimePressure } from '@/design/timePressure';

import { gradeQuestion } from '../grade';
import { OptionCard, type OptionState } from '../OptionCard';
import { TfSpeedTimer } from '../TfSpeedTimer';
import type { McQuestion } from '../../../../content/schema/types';

const VARIANT_TAG: Record<NonNullable<McQuestion['variant']>, string> = {
  scenario: 'Scenario',
  'spot-bug': 'Spot the bug',
  'tf-speed': 'Quick check',
};

export interface McRendererProps {
  question: McQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export function McRenderer({ question, answered, onAnswer }: McRendererProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const reduceTimePressure = useReduceTimePressure();
  const timed = question.variant === 'tf-speed' && !reduceTimePressure;

  function handlePress(index: number): void {
    if (answered) return;
    setSelected(index);
    onAnswer(gradeQuestion(question, { type: 'mc', index }));
  }

  function stateFor(index: number): OptionState {
    if (!answered) return selected === index ? 'selected' : 'idle';
    if (index === question.answerKey) return 'correct';
    if (index === selected) return 'incorrect';
    return 'idle';
  }

  return (
    <View style={{ gap: spacing.md }}>
      {question.variant ? (
        <AppText tier="label" size="sm" color={colors.clay400}>
          {VARIANT_TAG[question.variant]}
        </AppText>
      ) : null}
      <AppText tier="display" size="xl" color={colors.textPrimary}>
        {question.stem}
      </AppText>
      {timed ? <TfSpeedTimer seconds={question.estimatedSeconds} running={!answered} /> : null}
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {question.options.map((option, index) => (
          <OptionCard
            key={index}
            label={option}
            state={stateFor(index)}
            picked={selected === index}
            disabled={answered}
            onPress={() => handlePress(index)}
          />
        ))}
      </View>
    </View>
  );
}
