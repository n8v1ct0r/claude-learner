// src/features/practice/PracticeHub.tsx
//
// The Practice tab hub — the energy-free home for spaced review. It reads the persisted SRS deck and
// the bundled content, then offers a small set of warm, low-pressure launch points:
//   • Welcome back  — after ≥5 idle days the engine returns a gentle warmup; the hub greets warmly and
//                     leads with that small confidence-weighted session (no backlog wall).
//   • Review        — the day's capped review of missed questions (cap derived from the daily goal),
//                     lesson misses and exam misses alike; while lesson misses are due, exam misses
//                     take at most half the seats. Only cards whose question loads compete for a seat,
//                     so the hub never offers — or opens — an empty review (FT-1).
//   • Scenario lab  — production architecture decisions drawn from the whole curriculum; always
//                     available, even for a brand-new empty deck.
//   • Topics        — per-concept drill decks for the concepts the learner has cards in.
//
// No-shame / ADHD contract (PLAN-rev2 §4.7 #9): this screen NEVER renders a "due count" or a red
// backlog — availability is a boolean, copy is warm, and everything here is ENERGY-FREE. Launching a
// section hands a capped PracticeSession up to the screen, which swaps in the review player.

import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { useContentDb } from '@/db/content-provider';
import { colors, radii, spacing, touchable } from '@/design/tokens';
import { dailyPresentationCap, type SrsCard } from '@/engine/srs';
import { DAY_MS } from '@/engine/time';
import { useSettingsStore } from '@/state/settings';
import { useSrsStore } from '@/state/srs';

import {
  collectPracticeContent,
  conceptsWithCards,
  indexDeckQuestions,
  resolveSessionQuestions,
  selectConceptDeck,
  selectScenarioQuestions,
  type PracticeSession,
} from './practice-content';
import type { Course } from '../../../content/schema/types';

export interface PracticeHubProps {
  onLaunch: (session: PracticeSession) => void;
}

/** A chunky, tappable section card (≥44pt) — the hub's primary affordance. */
function SectionCard({
  title,
  body,
  accessibilityLabel,
  children,
}: {
  title: string;
  body: string;
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card} accessible={false}>
      <AppText tier="label" size="lg" color={colors.textPrimary} accessibilityLabel={accessibilityLabel}>
        {title}
      </AppText>
      <AppText tier="body" size="sm" color={colors.textSecondary}>
        {body}
      </AppText>
      {children}
    </View>
  );
}

export function PracticeHub({ onLaunch }: PracticeHubProps) {
  const reader = useContentDb();
  const cards = useSrsStore((s) => s.cards);
  const dailyGoalMinutes = useSettingsStore((s) => s.dailyGoalMinutes);

  const content = useMemo(() => {
    const courses = reader
      .listCourses()
      .map((c) => reader.getCourse(c.id))
      .filter((c): c is Course => c !== undefined);
    return collectPracticeContent(courses);
  }, [reader]);

  const cap = dailyPresentationCap(dailyGoalMinutes);

  // Every question the deck points at: lesson exercises from the course tree, plus the exam-register
  // questions that mocks and minis capture as misses (they resolve through the reader). A card is
  // presentable exactly when its question is in this index (FT-1).
  const deckQuestions = useMemo(
    () => indexDeckQuestions(content.byId, Object.keys(cards), (id) => reader.getQuestion(id)),
    [cards, content, reader],
  );
  const isPresentable = useCallback((card: SrsCard) => deckQuestions.has(card.id), [deckQuestions]);
  // A card that is not a lesson exercise is an exam-register question: a mock or mini miss.
  const isExamCard = useCallback((card: SrsCard) => !content.byId.has(card.id), [content]);

  // The review snapshot decides which copy/CTA to show. The wall clock is read at the edge (in an
  // effect that calls a store action — the app-wide convention), never during render, so render stays
  // pure. The actual launched session is recomputed with a fresh Date.now() at the tap, so a stale
  // snapshot can only affect framing, never the cards you get.
  const reviewMode = useSrsStore((s) => s.reviewMode);
  const reviewHasCards = useSrsStore((s) => s.reviewHasCards);
  useEffect(() => {
    useSrsStore.getState().refreshReview({ now: Date.now(), dailyGoalMinutes, isPresentable, isExamCard });
  }, [dailyGoalMinutes, isPresentable, isExamCard]);

  const isWelcomeBack = reviewMode === 'warmup' && reviewHasCards;
  const hasReview = reviewHasCards;

  const deckConceptIds = useMemo(
    () => conceptsWithCards(Object.values(cards), content.conceptOrder, deckQuestions),
    [cards, content, deckQuestions],
  );

  const launchReview = (): void => {
    const now = Date.now();
    const session = useSrsStore.getState().selectSession({ now, dailyGoalMinutes, isPresentable, isExamCard });
    const questions = resolveSessionQuestions(session.cards, deckQuestions);
    if (questions.length === 0) {
      // The snapshot was stale (the last due card was just reviewed): refresh the framing rather than
      // open an empty session.
      useSrsStore.getState().refreshReview({ now, dailyGoalMinutes, isPresentable, isExamCard });
      return;
    }
    const welcome = session.mode === 'warmup';
    onLaunch({
      kind: welcome ? 'welcome-back' : 'review',
      title: welcome ? 'Welcome back' : 'Review',
      questions,
      cap: session.cap,
    });
  };

  const launchScenario = (): void => {
    const questions = selectScenarioQuestions(content.scenarioPool, Math.min(cap, 8), Math.floor(Date.now() / DAY_MS));
    onLaunch({ kind: 'scenario', title: 'Scenario Lab', questions, cap: Math.min(cap, 8) });
  };

  const launchConcept = (conceptId: string): void => {
    const questions = selectConceptDeck(Object.values(useSrsStore.getState().cards), conceptId, deckQuestions, cap);
    onLaunch({
      kind: 'concept',
      title: content.conceptLabels.get(conceptId) ?? 'Review',
      questions,
      cap,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <AppText tier="display" size="3xl" color={colors.textPrimary} accessibilityRole="header">
          Practice
        </AppText>
        <AppText tier="body" size="base" color={colors.textSecondary}>
          Practice anytime — nothing here costs energy.
        </AppText>

        {isWelcomeBack ? (
          <SectionCard
            title="Welcome back"
            body="Good to see you. Here’s a small, gentle set to ease back in — no rush."
          >
            <Button3D label="Ease back in" onPress={launchReview} accessibilityHint="Starts a short energy-free warmup" />
          </SectionCard>
        ) : (
          <SectionCard
            title="Review your misses"
            body={
              hasReview
                ? 'A short set of questions you’ve tripped on before. A calm way to lock them in.'
                : 'You’re all caught up. Questions you miss in lessons will show up here to revisit later.'
            }
          >
            {hasReview ? (
              <Button3D label="Start review" onPress={launchReview} accessibilityHint="Starts an energy-free review session" />
            ) : null}
          </SectionCard>
        )}

        {content.scenarioPool.length > 0 ? (
          <SectionCard
            title="Scenario Lab"
            body="Production architecture decisions from the six exam scenario families. No trivia, no timer — diagnose the tradeoff."
          >
            <Button3D
              label="Start scenario drill"
              color={colors.gemTeal}
              shadowColor={colors.clayPressed}
              onPress={launchScenario}
              accessibilityHint="Starts a short production architecture scenario drill"
            />
          </SectionCard>
        ) : null}

        {deckConceptIds.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <AppText tier="label" size="base" color={colors.textSecondary} accessibilityRole="header">
              Topics to revisit
            </AppText>
            {deckConceptIds.map((conceptId) => {
              const label = content.conceptLabels.get(conceptId) ?? 'Review topic';
              return (
                <Pressable
                  key={conceptId}
                  onPress={() => launchConcept(conceptId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${label}`}
                  accessibilityHint="Opens an energy-free review of this topic"
                  style={styles.deckRow}
                >
                  <AppText tier="label" size="base" color={colors.textPrimary} style={{ flex: 1 }} numberOfLines={2}>
                    {label}
                  </AppText>
                  <AppText tier="label" size="lg" color={colors.textSecondary}>
                    →
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deckRow: {
    ...touchable(),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
