// src/features/path/UnitReviewPlayer.tsx
//
// The unit-review player — a lightweight, ENERGY-FREE pass over a whole unit's questions (PLAN-rev2
// §4.4). It reuses the lesson player's ExerciseStep (every renderer) and SegmentedProgressBar, but is
// intentionally simpler than the Feynman LessonPlayer: no concept card, no explain-back, no XP/energy
// side effects, no chest. It exists so a learner can re-meet a unit's material with zero cost — the
// guaranteed low-stakes practice surface.
//
// Question order comes from the pure selectUnitReviewQuestions selector, mistakes-first: questions with
// a card in the SRS deck (every card starts as a miss) lead, in spine order. The order is fixed when the
// review opens, so answering never reshuffles it. Answers feed the same deck as Practice (FT-6): a miss
// is captured, and a question that already has a card is graded — so the feedback's "added to Practice"
// is true. Local component state drives the cursor; the review itself is disposable by design.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { useContentDb } from '@/db/content-provider';
import { colors, spacing, touchable } from '@/design/tokens';
import { ExerciseStep } from '@/features/lesson-player/ExerciseStep';
import { SegmentedProgressBar } from '@/features/lesson-player/SegmentedProgressBar';
import { useSrsStore } from '@/state/srs';

import { selectUnitReviewQuestions } from './unit-review';

export interface UnitReviewPlayerProps {
  unitId: string;
}

export function UnitReviewPlayer({ unitId }: UnitReviewPlayerProps) {
  const reader = useContentDb();
  const router = useRouter();
  const gradeReview = useSrsStore((s) => s.gradeReview);
  const recordMistake = useSrsStore((s) => s.recordMistake);

  const unit = useMemo(() => reader.getUnit(unitId), [reader, unitId]);
  // Mistakes-first from the SRS deck, read once when the review opens (not subscribed), so capturing
  // a miss during this review never reorders the questions under the cursor.
  const questions = useMemo(
    () =>
      unit
        ? selectUnitReviewQuestions({ unit, mistakenQuestionIds: Object.keys(useSrsStore.getState().cards) })
        : [],
    [unit],
  );

  const [cursor, setCursor] = useState(0);
  const [pending, setPending] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [answered, setAnswered] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!unit || questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          There’s nothing to review here yet.
        </AppText>
        <View style={{ height: spacing.xl }} />
        <Button3D label="Back to path" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            Review complete
          </AppText>
          <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {`You refreshed ${questions.length} ${questions.length === 1 ? 'card' : 'cards'} from ${unit.title}. No energy spent.`}
          </AppText>
        </ScrollView>
        <View style={{ padding: spacing.xl, paddingTop: spacing.md }}>
          <Button3D label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityHint="Back to your path" />
        </View>
      </SafeAreaView>
    );
  }

  const current = questions[cursor];

  function handleAnswer(correct: boolean) {
    // Energy-free: no progress/energy mutation here, ever (§4.4). The review deck is updated exactly as
    // Practice does: grade an existing card, or capture a new miss (FT-6).
    const now = Date.now();
    if (useSrsStore.getState().cards[current.id]) gradeReview(current.id, correct, now);
    else if (!correct) recordMistake(current.id, current.conceptId, now);
    setPending({ correct, explanation: current.explanation });
    setAnswered((n) => n + 1);
  }

  function handleContinue() {
    setPending(null);
    const next = cursor + 1;
    if (next >= questions.length) setFinished(true);
    else setCursor(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Close review"
          style={{ ...touchable(), alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText tier="label" size="xl" color={colors.textSecondary}>
            ✕
          </AppText>
        </Pressable>
        <AppText tier="label" size="base" color={colors.textSecondary} style={{ flex: 1 }}>
          {`Review — ${unit.title}`}
        </AppText>
      </View>

      <SegmentedProgressBar filled={Math.min(answered, questions.length)} total={questions.length} />

      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <ExerciseStep
          key={`${current.id}-${cursor}`}
          question={current}
          pending={pending}
          onAnswer={handleAnswer}
          onContinue={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
