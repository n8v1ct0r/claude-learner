// src/features/lesson-player/ExerciseStep.tsx
//
// Dispatches a single question to the right renderer (mc/multi/order/cloze; match is an M4 stub) and,
// once answered, shows the Feedback panel with a Continue button. A presentational component: it holds
// no session state — the LessonPlayer owns progression and passes `pending` (the just-answered result)
// plus the answer/continue callbacks. `answered` freezes the renderer so the revealed correct answer
// can't be re-tapped.

import { useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { scenarioLabel } from '@/content/scenario-labels';
import { useReduceMotion } from '@/design/motion';
import { colors, radii, spacing } from '@/design/tokens';

import { bestAnswerText } from './answer-text';
import { Feedback } from './Feedback';
import { ClozeRenderer } from './renderers/ClozeRenderer';
import { MatchRenderer } from './renderers/MatchRenderer';
import { McRenderer } from './renderers/McRenderer';
import { MultiRenderer } from './renderers/MultiRenderer';
import { OrderRenderer } from './renderers/OrderRenderer';
import type { Question } from '../../../content/schema/types';

export interface ExerciseStepProps {
  question: Question;
  position?: number;
  total?: number;
  /** The just-answered feedback state for THIS question, or null while awaiting an answer. */
  pending: { correct: boolean; explanation: string } | null;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

const TYPE_LABELS: Record<Question['type'], string> = {
  mc: 'Single response',
  multi: 'Multiple response',
  match: 'Architecture match',
  cloze: 'Complete the design',
  order: 'Sequence the workflow',
};

export function ExerciseStep({ question, position, total, pending, onAnswer, onContinue }: ExerciseStepProps) {
  const answered = pending !== null;
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReduceMotion();

  function renderer() {
    switch (question.type) {
      case 'mc':
        return <McRenderer question={question} answered={answered} onAnswer={onAnswer} />;
      case 'multi':
        return <MultiRenderer question={question} answered={answered} onAnswer={onAnswer} />;
      case 'order':
        return <OrderRenderer question={question} answered={answered} onAnswer={onAnswer} />;
      case 'cloze':
        return <ClozeRenderer question={question} answered={answered} onAnswer={onAnswer} />;
      case 'match':
        return <MatchRenderer question={question} answered={answered} onAnswer={onAnswer} />;
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      testID="exercise-scroll"
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, gap: spacing.lg, paddingBottom: spacing.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => {
        // Answer feedback is appended after the options. On compact iPhones and at large Dynamic
        // Type sizes it can land below the fold, so reveal it automatically while preserving full
        // manual scrolling back through the question and explanation. Reduce Motion jumps instead.
        if (pending) scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {position !== undefined && total !== undefined ? (
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.clayPressed }}>
              <AppText tier="label" size="xs" color={colors.textPrimary}>{`DECISION ${position} OF ${total}`}</AppText>
            </View>
          ) : null}
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border }}>
            <AppText tier="label" size="xs" color={colors.textSecondary}>{`TASK ${question.taskStatement} · ${TYPE_LABELS[question.type]}`}</AppText>
          </View>
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border }}>
            <AppText tier="label" size="xs" color={question.difficulty === 3 ? colors.review : colors.gemTeal}>
              {question.difficulty === 3 ? 'EXAM HARD' : question.difficulty === 2 ? 'EXAM STANDARD' : 'FOUNDATION'}
            </AppText>
          </View>
        </View>
        {question.scenarioId ? (
          <View style={{ padding: spacing.md, gap: spacing.xs, borderRadius: radii.button, backgroundColor: '#24352F', borderLeftWidth: 4, borderLeftColor: colors.gemTeal }}>
            <AppText tier="label" size="xs" color={colors.gemTeal}>PRODUCTION SCENARIO</AppText>
            <AppText tier="label" size="base" color={colors.textPrimary}>
              {scenarioLabel(question.scenarioId)}
            </AppText>
          </View>
        ) : null}
      </View>
      {renderer()}
      {pending ? (
        <Feedback
          correct={pending.correct}
          explanation={pending.explanation}
          correctAnswer={bestAnswerText(question)}
          sourceUrls={question.sourceUrls}
          onContinue={onContinue}
        />
      ) : null}
    </ScrollView>
  );
}
