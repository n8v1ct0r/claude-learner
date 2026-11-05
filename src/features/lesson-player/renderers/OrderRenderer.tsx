// src/features/lesson-player/renderers/OrderRenderer.tsx
//
// Order-the-steps. A simple, working M3 version (the richer drag interaction is M4): steps are shown as
// tappable chips in a seeded per-question shuffle that is never the answer order or its reverse
// (presentation-order.ts); tapping a chip appends it to the answer sequence. When all steps are placed
// it grades the exact sequence (order IS the answer). "Undo last" lets the learner correct a
// misplacement before it's fully placed. Once graded, the correct order is revealed.

import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, radii, spacing } from '@/design/tokens';

import { gradeQuestion } from '../grade';
import { OptionCard } from '../OptionCard';
import { orderStepPresentation } from './presentation-order';
import type { OrderQuestion } from '../../../../content/schema/types';

export interface OrderRendererProps {
  question: OrderQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

export function OrderRenderer({ question, answered, onAnswer }: OrderRendererProps) {
  // Deterministic per question, and never the key order or its exact reverse (CS-4).
  const presentation = useMemo(() => orderStepPresentation(question), [question]);
  const [placed, setPlaced] = useState<number[]>([]);

  function place(stepIndex: number): void {
    if (answered || placed.includes(stepIndex)) return;
    const next = [...placed, stepIndex];
    setPlaced(next);
    if (next.length === question.steps.length) {
      onAnswer(gradeQuestion(question, { type: 'order', order: next }));
    }
  }

  function undo(): void {
    if (answered) return;
    setPlaced((prev) => prev.slice(0, -1));
  }

  // After grading, reveal the correct sequence; otherwise show what the learner has placed so far.
  const shown = answered ? question.answerKey : placed;

  return (
    <View style={{ gap: spacing.md }}>
      <AppText tier="display" size="xl" color={colors.textPrimary}>
        {question.stem}
      </AppText>

      <AppText tier="label" size="sm" color={colors.textSecondary}>
        {answered ? 'Correct order' : 'Your order'}
      </AppText>
      <View style={{ gap: spacing.sm }}>
        {shown.length === 0 ? (
          <AppText tier="body" size="sm" color={colors.textMuted}>
            Tap the steps below in order.
          </AppText>
        ) : (
          shown.map((stepIndex, position) => (
            <OptionCard
              key={`placed-${position}`}
              label={question.steps[stepIndex]}
              state={answered ? 'correct' : 'selected'}
              // Before grading these are the learner's placements; after, the revealed key order.
              picked={!answered}
              disabled
              marker={String(position + 1)}
              onPress={() => undefined}
            />
          ))
        )}
      </View>

      {!answered ? (
        <>
          <View style={{ height: 1, backgroundColor: colors.border, borderRadius: radii.pill }} />
          <AppText tier="label" size="sm" color={colors.textSecondary}>
            Steps
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {presentation
              .filter((stepIndex) => !placed.includes(stepIndex))
              .map((stepIndex) => (
                <OptionCard
                  key={`chip-${stepIndex}`}
                  label={question.steps[stepIndex]}
                  state="idle"
                  picked={false}
                  onPress={() => place(stepIndex)}
                />
              ))}
          </View>
          {placed.length > 0 ? <Button3D label="Undo last" color={colors.clay500} onPress={undo} /> : null}
        </>
      ) : null}
    </View>
  );
}
