// src/features/lesson-player/renderers/ClozeRenderer.tsx
//
// Fill-in-the-blanks. A simple, working M3 version: the stem is shown with its "___" markers, and each
// blank gets its own row of option chips (single choice per blank). The Check button enables once every
// blank has a choice; on check it grades each blank against its answer key. After grading, each blank's
// correct option is revealed in sage and a wrong choice in warm amber.

import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, spacing } from '@/design/tokens';

import { gradeQuestion } from '../grade';
import { OptionCard, type OptionState } from '../OptionCard';
import type { ClozeQuestion } from '../../../../content/schema/types';

export interface ClozeRendererProps {
  question: ClozeQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export function ClozeRenderer({ question, answered, onAnswer }: ClozeRendererProps) {
  const [choices, setChoices] = useState<(number | null)[]>(() => question.blanks.map(() => null));

  function choose(blankIndex: number, optionIndex: number): void {
    if (answered) return;
    setChoices((prev) => {
      const next = [...prev];
      next[blankIndex] = optionIndex;
      return next;
    });
  }

  const allChosen = choices.every((c) => c !== null);

  function check(): void {
    if (answered || !allChosen) return;
    onAnswer(gradeQuestion(question, { type: 'cloze', indices: choices as number[] }));
  }

  function stateFor(blankIndex: number, optionIndex: number): OptionState {
    const chosen = choices[blankIndex];
    if (!answered) return chosen === optionIndex ? 'selected' : 'idle';
    if (optionIndex === question.answerKey[blankIndex]) return 'correct';
    if (optionIndex === chosen) return 'incorrect';
    return 'idle';
  }

  return (
    <View style={{ gap: spacing.md }}>
      <AppText tier="display" size="lg" color={colors.textPrimary}>
        {question.stem}
      </AppText>
      {question.blanks.map((blank, blankIndex) => (
        <View key={blankIndex} style={{ gap: spacing.sm }}>
          <AppText tier="label" size="sm" color={colors.textSecondary}>
            {`Blank ${blankIndex + 1}`}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {blank.options.map((option, optionIndex) => (
              <OptionCard
                key={optionIndex}
                label={option}
                state={stateFor(blankIndex, optionIndex)}
                picked={choices[blankIndex] === optionIndex}
                disabled={answered}
                onPress={() => choose(blankIndex, optionIndex)}
              />
            ))}
          </View>
        </View>
      ))}
      {!answered ? <Button3D label="Check" disabled={!allChosen} onPress={check} /> : null}
    </View>
  );
}
