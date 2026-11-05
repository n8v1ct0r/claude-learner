// src/features/lesson-player/renderers/MultiRenderer.tsx
//
// Multi-select. The stem states how many to pick (enforced by the schema); this renderer ENFORCES that
// stated count at the UI level: the Check button stays disabled until exactly `selectCount` options are
// chosen, so an under/over-selection can't be submitted. On check it grades the chosen set (order
// irrelevant) and reveals every correct option in sage; a wrong pick is warm amber.

import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, spacing } from '@/design/tokens';

import { gradeQuestion } from '../grade';
import { OptionCard, type OptionState } from '../OptionCard';
import type { MultiQuestion } from '../../../../content/schema/types';

export interface MultiRendererProps {
  question: MultiQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export function MultiRenderer({ question, answered, onAnswer }: MultiRendererProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const answerSet = new Set(question.answerKey);

  function toggle(index: number): void {
    if (answered) return;
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }

  function check(): void {
    if (answered || selected.length !== question.selectCount) return;
    onAnswer(gradeQuestion(question, { type: 'multi', indices: selected }));
  }

  function stateFor(index: number): OptionState {
    if (!answered) return selected.includes(index) ? 'selected' : 'idle';
    if (answerSet.has(index)) return 'correct';
    if (selected.includes(index)) return 'incorrect';
    return 'idle';
  }

  const ready = selected.length === question.selectCount;

  return (
    <View style={{ gap: spacing.md }}>
      <AppText tier="display" size="xl" color={colors.textPrimary}>
        {question.stem}
      </AppText>
      <AppText tier="label" size="sm" color={colors.textSecondary}>
        {`Select ${question.selectCount} — chosen ${selected.length} of ${question.selectCount}`}
      </AppText>
      <View style={{ gap: spacing.sm }}>
        {question.options.map((option, index) => (
          <OptionCard
            key={index}
            label={option}
            state={stateFor(index)}
            picked={selected.includes(index)}
            disabled={answered}
            onPress={() => toggle(index)}
          />
        ))}
      </View>
      {!answered ? (
        <Button3D
          label="Check"
          disabled={!ready}
          onPress={check}
          accessibilityHint={ready ? undefined : `Choose ${question.selectCount} options to check`}
        />
      ) : null}
    </View>
  );
}
