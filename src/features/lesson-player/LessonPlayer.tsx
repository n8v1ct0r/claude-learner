// src/features/lesson-player/LessonPlayer.tsx
//
// The Feynman lesson player — the heart of the app. It drives the fixed spine (concept -> exercises ->
// explain-back -> gap -> ceremony) off the persisted lesson-session store, so a mid-lesson kill resumes
// at the exact question (GC-03b). It reads the lesson through the content hook (do NOT re-open the db)
// and the game numbers through the pure engines (never re-implemented here). Completion is synchronous
// and optimistic (GC-03a): tapping through the gap card computes XP via the engine and lands on the
// ceremony immediately — nothing async is awaited.

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, spacing, touchable } from '@/design/tokens';
import { comboAccuracy } from '@/engine/combo';
import { useContentDb, useLesson } from '@/db/content-provider';
import { StreakMilestone } from '@/features/ceremony/StreakMilestone';
import { tapLight } from '@/juice/haptics';
import { playCombo, playCorrect, playIncorrect } from '@/juice/sfx';
import { streakMilestone } from '@/juice/streak-milestone';
import {
  EXPLAIN_BACK_MAX_REFINES,
  missingKeyPointIds,
  useLessonSessionStore,
  type LessonCompletion,
} from '@/state/lesson-session';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { useGameStore } from '@/state/game';
import { useSrsStore } from '@/state/srs';

import { Ceremony } from './Ceremony';
import { ConceptCard } from './ConceptCard';
import { ExerciseStep } from './ExerciseStep';
import { ExplainBack } from './ExplainBack';
import { GapCard } from './GapCard';
import { filterLlmText } from './llm-text-filter';
import { SegmentedProgressBar } from './SegmentedProgressBar';
import type { Lesson } from '../../../content/schema/types';

/** Best-effort "did this complete its unit?" — precise unit membership lands with the path UI (M4). */
function computeUnitCompleted(
  reader: ReturnType<typeof useContentDb> | null,
  lesson: Lesson,
  completedIds: readonly string[],
): boolean {
  if (!reader) return false;
  // No lesson->unit backref on the Lesson type; scan courses for the unit that holds this lesson.
  for (const summary of reader.listCourses()) {
    const course = reader.getCourse(summary.id);
    for (const unit of course?.units ?? []) {
      if (unit.lessons.some((l) => l.id === lesson.id)) {
        const completedNow = new Set([...completedIds, lesson.id]);
        return unit.lessons.every((l) => completedNow.has(l.id));
      }
    }
  }
  return false;
}

export interface LessonPlayerProps {
  lessonId: string;
}

/** The ✕ that leaves the lesson, matching the review and exam players' close control. */
function CloseLessonButton({ onPress, hint }: { onPress: () => void; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Close lesson"
        accessibilityHint={hint}
        style={{ ...touchable(), alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText tier="label" size="xl" color={colors.textSecondary}>
          ✕
        </AppText>
      </Pressable>
    </View>
  );
}

export function LessonPlayer({ lessonId }: LessonPlayerProps) {
  const lesson = useLesson(lessonId);
  const reader = useContentDb();
  const router = useRouter();
  const session = useLessonSessionStore();
  const streakCurrent = useProgressStore((s) => s.streak.current);
  // After the ceremony, a streak that landed on a milestone gets a full-screen gain-framed takeover
  // before we return to the path. This runs AFTER the ceremony (XP already shown synchronously,
  // GC-03a) and always ends by clearing the session and navigating back (no dead-end).
  const [streakTakeover, setStreakTakeover] = useState(false);

  // Initialize (or resume) the session for this lesson. A same-lesson session that hasn't reached the
  // ceremony is RESUMED untouched (the mid-kill case); anything else starts fresh.
  useEffect(() => {
    if (!lesson) return;
    const s = useLessonSessionStore.getState();
    const resuming = s.lessonId === lesson.id && s.phase !== 'ceremony';
    if (!resuming) s.startLesson(lesson, Date.now());
  }, [lesson]);

  // Leave the lesson: back to wherever it was opened from, or the Learn tab when there is no history
  // to go back to (a deep link or a web refresh) — never an unhandled GO_BACK dead-end.
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <CloseLessonButton onPress={leave} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl }}>
          <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            This lesson isn’t available yet.
          </AppText>
          <Button3D label="Back to Learn" onPress={() => router.dismissTo('/')} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  // Session may still point at a prior lesson for one render before the effect runs; guard on it.
  if (session.lessonId !== lesson.id) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  // Narrowed, non-null alias — TS does not carry the `if (!lesson)` narrowing into the nested
  // renderPhase() closure, so bind it explicitly here.
  const activeLesson: Lesson = lesson;

  // `now` is supplied by the event handler (impure Date.now belongs at the tap, not in the render body).
  const buildCompletion = (now: number): LessonCompletion => ({
    now,
    timezone: resolveTimezone(),
    unitCompleted: computeUnitCompleted(reader, activeLesson, useProgressStore.getState().completedLessonIds),
    alreadyCompleted: useProgressStore.getState().hasCompleted(activeLesson.id),
    boostWindow: useGameStore.getState().activeBoost,
  });

  const byId = new Map(activeLesson.exercises.map((q) => [q.id, q] as const));
  const taskStatements = [...new Set(session.queue.map((id) => byId.get(id)?.taskStatement).filter((task): task is string => Boolean(task)))];

  function renderPhase() {
    if (session.phase === 'concept') {
      return (
        <View style={{ flex: 1 }}>
          {/* The briefing's close control (IB-6); closing keeps the session. Later phases exit by swipe-back. */}
          <CloseLessonButton onPress={leave} hint="Your place in this lesson is saved" />
          <ConceptCard
            concept={activeLesson.concept}
            title={activeLesson.title}
            decisionCount={session.totalQuestions}
            taskStatements={taskStatements}
            onGotIt={() => session.advanceFromConcept()}
          />
        </View>
      );
    }

    if (session.phase === 'exercises') {
      const currentId = session.queue[session.cursor];
      const question = currentId ? byId.get(currentId) : undefined;
      const { filled, total } = { filled: new Set(session.answers.map((a) => a.questionId)).size, total: session.totalQuestions };
      if (!question) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
      const pending =
        session.pending && session.pending.questionId === currentId
          ? { correct: session.pending.correct, explanation: session.pending.explanation }
          : null;
      return (
        <View style={{ flex: 1 }}>
          <SegmentedProgressBar filled={Math.min(filled, total)} total={total} />
          <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
            <ExerciseStep
              // Key by the queue position so a re-queued repeat AND each new question remount fresh
              // renderer state (selection/placed choices reset per question).
              key={`${currentId}-${session.cursor}`}
              question={question}
              position={Math.min(session.cursor + 1, total)}
              total={total}
              pending={pending}
              onAnswer={(correct) => {
                const now = Date.now();
                // A wrong path-lesson answer is silently added to the review deck (no-shame): it
                // resurfaces later in the energy-free Practice hub, never as a punishment here.
                if (!correct) useSrsStore.getState().recordMistake(question.id, question.conceptId, now);
                session.answerCurrent(correct, question.explanation, now);
                // Answer-level juice. Audio/haptics are settings-gated inside the juice layer and are
                // deliberately NOT tied to reduce-motion. A miss gets a gentle, quiet cue and NO
                // haptic — never anything that reads as punishment (GC-13).
                if (correct) {
                  playCorrect();
                  tapLight();
                  // A fresh 5-in-a-row also earns the combo-flare cue (event set by answerCurrent).
                  if (useLessonSessionStore.getState().lastEvent?.flare) playCombo();
                } else {
                  playIncorrect();
                }
              }}
              onContinue={() => session.continueAfterFeedback()}
            />
          </View>
        </View>
      );
    }

    if (session.phase === 'explainBack') {
      const grade = session.explainBack.grade ?? null;
      const graded = session.explainBack.grading === 'graded';
      // Model prose is passed through the runtime no-shame filter before it ever renders (GC-13).
      const coachingHint =
        graded && grade ? filterLlmText(grade.next_step_hint, 'next-step-hint') : null;
      const canRefine =
        graded &&
        (grade?.missing_points.length ?? 0) > 0 &&
        session.explainBack.refinesUsed < EXPLAIN_BACK_MAX_REFINES;
      return (
        <ExplainBack
          prompt={activeLesson.explainBack.prompt}
          keyPoints={activeLesson.concept.keyPoints}
          status={session.explainBack.status}
          coveredIds={session.explainBack.coveredIds}
          grading={session.explainBack.grading}
          coachingHint={coachingHint}
          canRefine={canRefine}
          onSubmit={(transcript) => session.submitExplainBack(transcript)}
          onRefine={(refinement) => session.refineExplainBack(refinement)}
          onToggleCovered={(id) => session.toggleCovered(id)}
          onFinish={() => session.finishExplainBack(Date.now())}
          onSkip={() => session.skipExplainBack(buildCompletion(Date.now()))}
        />
      );
    }

    if (session.phase === 'gap') {
      const missedIds = missingKeyPointIds(session.keyPointIds, session.explainBack.coveredIds);
      const missedSet = new Set(missedIds);
      const missedKeyPoints = activeLesson.concept.keyPoints.filter((k) => missedSet.has(k.id));
      const grade = session.explainBack.grading === 'graded' ? session.explainBack.grade ?? null : null;
      const coachingHint = grade ? filterLlmText(grade.next_step_hint, 'next-step-hint') : null;
      const misconceptionNote =
        grade && grade.misconception ? filterLlmText(grade.misconception, 'misconception') : null;
      return (
        <GapCard
          missedKeyPoints={missedKeyPoints}
          coveredCount={session.explainBack.coveredIds.length}
          totalCount={session.keyPointIds.length}
          coachingHint={coachingHint}
          misconceptionNote={misconceptionNote}
          onContinue={() => session.finishGap(buildCompletion(Date.now()))}
        />
      );
    }

    // ceremony
    if (!session.xpBreakdown) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
    return (
      <Ceremony
        xp={session.xpBreakdown}
        chestTier={session.chestTier}
        accuracy={comboAccuracy(session.combo)}
        conceptCoverage={session.keyPointIds.length > 0 ? session.explainBack.coveredIds.length / session.keyPointIds.length : 0}
        comboBest={session.combo.bestStreak}
        streakCurrent={streakCurrent}
        onDone={() => {
          // Celebrate a milestone streak as a full-screen moment before leaving — only when THIS
          // completion moved the streak onto it (FT-9); otherwise return now.
          if (session.streakAdvanced && streakMilestone(streakCurrent)) setStreakTakeover(true);
          else {
            session.clearSession();
            leave();
          }
        }}
      />
    );
  }

  if (streakTakeover) {
    return (
      <StreakMilestone
        days={streakCurrent}
        onDone={() => {
          session.clearSession();
          leave();
        }}
      />
    );
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>{renderPhase()}</SafeAreaView>;
}
