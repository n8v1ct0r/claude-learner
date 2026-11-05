// src/features/practice/PracticeReviewPlayer.tsx
//
// The lightweight, ENERGY-FREE review player behind every Practice Hub launch (review mistakes,
// scenario lab, welcome-back, per-concept decks). It reuses the lesson player's ExerciseStep (every
// renderer) and SegmentedProgressBar unchanged — this file adds no new question UI. It is simpler
// than the Feynman LessonPlayer by design: no concept card, no explain-back, no XP, no energy.
//
// ADHD / no-shame rules honored here (PLAN-rev2 §4.7 #9):
//   • Progress is ADDITIVE — the segmented bar fills with cards done THIS session (0/N → N/N). There
//     is no "total due" number and never a red backlog.
//   • The session is already capped upstream, so reaching the end IS the gentle stop point: the
//     completion screen says "you can stop now" (anti-doomscroll) rather than dangling "more waiting".
//   • Energy-free: the only store it touches is the SRS deck (grade the card); it never reads or
//     mutates energy/progress.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, spacing, touchable } from '@/design/tokens';
import { ExerciseStep } from '@/features/lesson-player/ExerciseStep';
import { SegmentedProgressBar } from '@/features/lesson-player/SegmentedProgressBar';
import { useSrsStore } from '@/state/srs';
import { useProgressStore } from '@/state/progress';

import type { PracticeSession } from './practice-content';

export interface PracticeReviewPlayerProps {
  session: PracticeSession;
  /** Return to the hub (the completing "Done" tap and the close ✕). */
  onClose: () => void;
}

export function PracticeReviewPlayer({ session, onClose }: PracticeReviewPlayerProps) {
  const gradeReview = useSrsStore((s) => s.gradeReview);
  const recordMistake = useSrsStore((s) => s.recordMistake);

  const [cursor, setCursor] = useState(0);
  const [pending, setPending] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [missedQuestionIds, setMissedQuestionIds] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const questions = session.questions;
  const total = questions.length;

  if (total === 0) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          There’s nothing to review here right now.
        </AppText>
        <View style={{ height: spacing.xl }} />
        <Button3D label="Back to practice" onPress={onClose} />
      </SafeAreaView>
    );
  }

  if (finished) {
    const accuracy = Math.round((correctCount / total) * 100);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={styles.finishedContent}>
          <AppText tier="label" size="sm" color={session.kind === 'scenario' ? colors.gemTeal : colors.clay400}>
            {session.kind === 'scenario' ? 'SCENARIO LAB COMPLETE' : 'PRACTICE COMPLETE'}
          </AppText>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            {accuracy >= 80 ? 'Decisions are holding' : 'Your next review is ready'}
          </AppText>
          <View style={styles.scoreCard}>
            <AppText tier="ceremony" size="4xl" color={accuracy >= 80 ? colors.success : colors.xpGold}>{`${accuracy}%`}</AppText>
            <AppText tier="label" size="sm" color={colors.textSecondary}>{`${correctCount} OF ${total} DECISIONS CORRECT`}</AppText>
          </View>
          <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {missedQuestionIds.length > 0
              ? `${missedQuestionIds.length} ${missedQuestionIds.length === 1 ? 'objective was' : 'objectives were'} added to spaced review. The hard decisions will return when they are useful.`
              : 'No misses this round. You can stop now — this is a strong place to leave it.'}
          </AppText>
        </ScrollView>
        <View style={{ padding: spacing.xl, paddingTop: spacing.md }}>
          <Button3D label="Done" onPress={onClose} accessibilityHint="Back to your practice hub" />
        </View>
      </SafeAreaView>
    );
  }

  const current = questions[cursor];

  function handleAnswer(correct: boolean): void {
    // Review existing cards; scenario/concept drills create a card only when a decision is missed.
    const now = Date.now();
    const existing = useSrsStore.getState().cards[current.id];
    if (existing) gradeReview(current.id, correct, now);
    else if (!correct) recordMistake(current.id, current.conceptId, now);
    if (correct) setCorrectCount((count) => count + 1);
    else setMissedQuestionIds((ids) => [...ids, current.id]);
    setPending({ correct, explanation: current.explanation });
    setAnswered((n) => n + 1);
  }

  function handleContinue(): void {
    setPending(null);
    const next = cursor + 1;
    if (next >= total) {
      const progress = useProgressStore.getState();
      if (session.kind === 'welcome-back') progress.restoreFromWarmup(Date.now());
      else progress.restoreFromPractice(Date.now());
      setFinished(true);
    }
    else setCursor(next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close review"
          style={styles.close}
        >
          <AppText tier="label" size="xl" color={colors.textSecondary}>
            ✕
          </AppText>
        </Pressable>
        <AppText tier="label" size="base" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
          {session.title}
        </AppText>
      </View>

      {/* Additive progress: cards done this session — never a total-due count. */}
      <SegmentedProgressBar filled={Math.min(answered, total)} total={total} />

      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <ExerciseStep
          key={`${current.id}-${cursor}`}
          question={current}
          position={cursor + 1}
          total={total}
          pending={pending}
          onAnswer={handleAnswer}
          onContinue={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  finishedContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  close: { ...touchable(), alignItems: 'center', justifyContent: 'center' },
  scoreCard: {
    minWidth: 220,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
  },
});
