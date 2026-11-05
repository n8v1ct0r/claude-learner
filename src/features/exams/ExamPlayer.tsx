import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { SourceLinks } from '@/components/SourceLinks';
import { useContentDb } from '@/db/content-provider';
import { colors, radii, spacing, touchable } from '@/design/tokens';
import {
  formatCountdown,
  gradeExamSelection,
  paceBand,
  remainingSeconds,
  type ExamSelection,
} from '@/engine/mock-exam';
import { answerAnnouncement, bestAnswerText } from '@/features/lesson-player/answer-text';
import { setExamSfxMuted } from '@/juice/sfx';
import { useExamAttemptStore, type ExamAttempt } from '@/state/exam-attempt';
import type { Question } from '../../../content/schema/types';

import { ConfirmPanel } from './ConfirmPanel';
import { ExamQuestionCard } from './ExamQuestionCard';

type SelectableQuestion = Extract<Question, { type: 'mc' | 'multi' }>;

/** Seconds left at which a timed simulation warns VoiceOver before it auto-submits. */
const TIME_WARNING_MARKS = [600, 300, 60] as const;

/** "1 hour 59 minutes", "4 minutes", "45 seconds" — a countdown VoiceOver can say naturally. */
function spokenDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const unit = (count: number, name: string): string => `${count} ${name}${count === 1 ? '' : 's'}`;
  if (seconds < 60) return unit(seconds, 'second');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return unit(minutes, 'minute');
  return minutes === 0 ? unit(hours, 'hour') : `${unit(hours, 'hour')} ${unit(minutes, 'minute')}`;
}

function QuestionPane({
  question,
  attempt,
  onNext,
}: {
  question: SelectableQuestion;
  attempt: ExamAttempt;
  onNext: (justAnsweredQuestionId: string) => void;
}) {
  const existing = attempt.answers[question.id];
  const [selection, setSelection] = useState<ExamSelection>(existing?.selection ?? []);
  const [revealed, setRevealed] = useState(attempt.mode === 'practice' && existing !== undefined);
  const answer = useExamAttemptStore((state) => state.answer);
  const submit = useExamAttemptStore((state) => state.submit);
  const correct = revealed ? gradeExamSelection(question, selection) : false;
  const required = question.type === 'multi' ? question.selectCount : 1;
  const ready = selection.length === required;

  function save(): void {
    const isCorrect = gradeExamSelection(question, selection);
    answer(question.id, selection, isCorrect, Date.now());
    if (attempt.mode === 'practice') {
      setRevealed(true);
      // Guided feedback is visual; VoiceOver hears the result and, after a miss, the best answer.
      AccessibilityInfo.announceForAccessibility(answerAnnouncement(isCorrect, bestAnswerText(question)));
    } else onNext(question.id);
  }

  function continueGuided(): void {
    const answeredAfterThis = new Set([...Object.keys(attempt.answers), question.id]).size;
    if (answeredAfterThis >= attempt.questionIds.length) submit('completed', Date.now());
    else onNext(question.id);
  }

  return (
    <View style={{ flex: 1, gap: spacing.lg }}>
      <ExamQuestionCard
        question={question}
        selection={selection}
        onChange={setSelection}
        locked={revealed}
        revealCorrect={revealed}
      />

      {revealed ? (
        <View style={[styles.feedback, { borderColor: correct ? colors.success : colors.review }]}>
          <AppText tier="display" size="xl" color={correct ? colors.success : colors.review}>
            {correct ? 'Correct' : 'Not quite'}
          </AppText>
          <AppText tier="body" size="base" color={colors.textPrimary}>
            {question.explanation}
          </AppText>
          <SourceLinks urls={question.sourceUrls} />
        </View>
      ) : null}

      <View style={{ marginTop: 'auto' }}>
        <Button3D
          label={revealed ? 'Continue' : attempt.mode === 'practice' ? 'Check answer' : existing ? 'Update answer' : 'Save & next'}
          disabled={!revealed && !ready}
          onPress={revealed ? continueGuided : save}
        />
      </View>
    </View>
  );
}

export function ExamPlayer({ attempt, onExit }: { attempt: ExamAttempt; onExit: () => void }) {
  const reader = useContentDb();
  const navigate = useExamAttemptStore((state) => state.navigate);
  const toggleFlag = useExamAttemptStore((state) => state.toggleFlag);
  const submit = useExamAttemptStore((state) => state.submit);
  const [now, setNow] = useState(() => Date.now());
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  // Submitting with questions left asks first, in place of the Submit button (reset with the navigator).
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const questions = useMemo(
    () => attempt.questionIds.map((id) => reader.getQuestion(id)).filter((q): q is Question => q !== undefined),
    [attempt.questionIds, reader],
  );
  const current = questions[attempt.cursor];
  const answeredCount = Object.keys(attempt.answers).length;
  const total = attempt.questionIds.length;
  const unansweredCount = total - answeredCount;
  const flagged = current ? attempt.flaggedQuestionIds.includes(current.id) : false;
  const secondsLeft = attempt.deadlineAt === null ? null : remainingSeconds(attempt.deadlineAt, now);
  const allowedSeconds = attempt.timeLimitMinutes * 60;
  const elapsedSeconds = Math.max(0, Math.min(allowedSeconds, Math.floor((now - attempt.startedAt) / 1000)));
  const pace = paceBand({ answered: answeredCount, total, elapsedSeconds, allowedSeconds });

  // Silence all juice SFX while a timed simulation is on screen — an exam is not a place for cues
  // (PLAN-rev2 D15). Practice mode keeps sound; only the exam-sim is muted, and it un-mutes on exit.
  useEffect(() => {
    if (attempt.mode !== 'simulation') return;
    setExamSfxMuted(true);
    return () => setExamSfxMuted(false);
  }, [attempt.mode]);

  useEffect(() => {
    if (attempt.deadlineAt === null || attempt.completedAt !== null) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [attempt.completedAt, attempt.deadlineAt]);

  useEffect(() => {
    if (attempt.mode === 'simulation' && secondsLeft === 0 && attempt.completedAt === null) {
      submit('time-expired', Date.now());
    }
  }, [attempt.completedAt, attempt.mode, secondsLeft, submit]);

  // The position pill is visual, so say where the learner is whenever the question changes.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Question ${attempt.cursor + 1} of ${total}`);
  }, [attempt.cursor, total]);

  // A timed simulation submits itself at 0:00. The amber pill is visual only, so warn VoiceOver as
  // the clock passes 10, 5 and 1 minutes left (once per mark; a resumed exam warns for its bracket).
  const lastTimeWarning = useRef<number | null>(null);
  useEffect(() => {
    if (attempt.mode !== 'simulation' || attempt.completedAt !== null || secondsLeft === null || secondsLeft <= 0) return;
    const reached = TIME_WARNING_MARKS.filter((mark) => secondsLeft <= mark);
    if (reached.length === 0) return;
    const mark = Math.min(...reached);
    if (lastTimeWarning.current !== null && lastTimeWarning.current <= mark) return;
    lastTimeWarning.current = mark;
    AccessibilityInfo.announceForAccessibility(
      `${spokenDuration(secondsLeft)} left. The exam submits automatically when time runs out.`,
    );
  }, [attempt.completedAt, attempt.mode, secondsLeft]);

  function goNext(justAnsweredQuestionId: string): void {
    const next = attempt.cursor + 1;
    if (next < total) navigate(next);
    else {
      // The store write from the current tap is synchronous, but this render's `attempt` prop is a
      // snapshot from just before that write. Treat the just-saved ID as answered so the final item
      // opens Submit instead of looping back onto itself for one render.
      const unanswered = attempt.questionIds.findIndex(
        (id) => id !== justAnsweredQuestionId && !attempt.answers[id],
      );
      if (unanswered >= 0) navigate(unanswered);
      else setNavigatorOpen(true);
    }
  }

  function toggleNavigator(): void {
    setNavigatorOpen((open) => !open);
    setConfirmingSubmit(false);
  }

  function closeNavigator(): void {
    setNavigatorOpen(false);
    setConfirmingSubmit(false);
  }

  function requestSubmit(): void {
    if (unansweredCount > 0) setConfirmingSubmit(true);
    else submit('manual', Date.now());
  }

  /** "Keep going": back to the first question still without an answer. */
  function keepGoing(): void {
    const firstUnanswered = attempt.questionIds.findIndex((id) => !attempt.answers[id]);
    if (firstUnanswered >= 0) navigate(firstUnanswered);
    closeNavigator();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Save and exit exam" style={styles.iconButton}>
          <AppText tier="label" size="xl" color={colors.textSecondary}>✕</AppText>
        </Pressable>
        <Pressable
          onPress={toggleNavigator}
          accessibilityRole="button"
          // The label carries the position the pill shows ("3 / 60"), not just the action.
          accessibilityLabel={`Question ${attempt.cursor + 1} of ${total}`}
          accessibilityHint={navigatorOpen ? 'Closes the question navigator' : 'Opens the question navigator'}
          accessibilityState={{ expanded: navigatorOpen }}
          style={styles.progressPill}
        >
          <AppText tier="label" size="sm" color={colors.textPrimary}>
            {`${attempt.cursor + 1} / ${total}`}
          </AppText>
        </Pressable>
        {secondsLeft === null ? (
          <View style={styles.modePill}>
            <AppText tier="label" size="sm" color={colors.gemTeal}>GUIDED</AppText>
          </View>
        ) : (
          <View
            accessible
            accessibilityRole="timer"
            accessibilityLabel={`Time left: ${spokenDuration(secondsLeft)}`}
            style={[styles.timerPill, secondsLeft <= 300 && { borderColor: colors.review }]}
          >
            <AppText tier="label" size="base" color={secondsLeft <= 300 ? colors.review : colors.textPrimary}>
              {formatCountdown(secondsLeft)}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.utilityRow}>
        <AppText tier="label" size="sm" color={pace === 'behind' ? colors.review : colors.textSecondary}>
          {pace === 'ahead' ? 'Ahead of pace' : pace === 'behind' ? 'A little behind pace' : 'On pace'}
        </AppText>
        <Pressable
          onPress={() => current && toggleFlag(current.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: flagged }}
          accessibilityLabel={flagged ? 'Remove question flag' : 'Flag question for review'}
          style={[styles.flagButton, flagged && styles.flagged]}
        >
          <AppText tier="label" size="sm" color={flagged ? colors.textOnAccent : colors.textSecondary}>
            {flagged ? '⚑ FLAGGED' : '⚐ FLAG'}
          </AppText>
        </Pressable>
      </View>

      {navigatorOpen ? (
        <ScrollView contentContainerStyle={styles.navigator}>
          <View style={{ gap: spacing.xs }}>
            <AppText tier="display" size="xl" color={colors.textPrimary}>Question navigator</AppText>
            <AppText tier="body" size="sm" color={colors.textSecondary}>
              {`${answeredCount} answered · ${attempt.flaggedQuestionIds.length} flagged`}
            </AppText>
          </View>
          <View style={styles.grid}>
            {attempt.questionIds.map((id, index) => {
              const answered = Boolean(attempt.answers[id]);
              const isFlagged = attempt.flaggedQuestionIds.includes(id);
              const isCurrent = index === attempt.cursor;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    navigate(index);
                    closeNavigator();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  accessibilityLabel={`Question ${index + 1}${isCurrent ? ', current' : ''}${answered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`}
                  style={[
                    styles.numberButton,
                    answered && styles.numberAnswered,
                    isFlagged && styles.numberFlagged,
                    index === attempt.cursor && styles.numberCurrent,
                  ]}
                >
                  <AppText tier="label" size="sm" color={colors.textPrimary}>{index + 1}</AppText>
                </Pressable>
              );
            })}
          </View>
          {confirmingSubmit && unansweredCount > 0 ? (
            <ConfirmPanel
              title={`Submit with ${unansweredCount} unanswered?`}
              message={`${unansweredCount} of ${total} ${total === 1 ? 'question' : 'questions'} ${unansweredCount === 1 ? 'has' : 'have'} no answer yet. Unanswered questions count as misses in your estimated score.`}
              confirmLabel="Submit anyway"
              confirmHint="Scores the exam now"
              confirmColor={colors.review}
              confirmShadowColor="#9A601D"
              onConfirm={() => submit('manual', Date.now())}
              cancelLabel="Keep going"
              cancelHint="Opens the first unanswered question"
              onCancel={keepGoing}
            />
          ) : (
            <>
              <Button3D
                label={answeredCount === total ? 'Submit exam' : `Submit ${answeredCount}/${total} answered`}
                color={answeredCount === total ? colors.success : colors.review}
                shadowColor={answeredCount === total ? '#286A49' : '#9A601D'}
                onPress={requestSubmit}
              />
              <Button3D label="Back to question" color={colors.muted} shadowColor={colors.border} textColor={colors.textPrimary} onPress={closeNavigator} />
            </>
          )}
        </ScrollView>
      ) : current && (current.type === 'mc' || current.type === 'multi') ? (
        // Keyed by question, so every question opens at the top in a fresh scroller instead of keeping
        // the previous question's offset (which hid the task chips and left "Save & next" under the tab
        // bar). Guided feedback on the same question keeps the learner's place.
        <ScrollView key={current.id} contentContainerStyle={styles.questionContent} keyboardShouldPersistTaps="handled">
          <QuestionPane key={`${current.id}:${attempt.answers[current.id]?.answeredAt ?? 'new'}`} question={current} attempt={attempt} onNext={goNext} />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <AppText tier="body" size="base" color={colors.textSecondary}>This exam question could not be loaded.</AppText>
          <Button3D label="Open navigator" onPress={() => setNavigatorOpen(true)} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  iconButton: { ...touchable(), alignItems: 'center', justifyContent: 'center' },
  progressPill: { ...touchable(), flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated, borderRadius: radii.pill },
  timerPill: { minWidth: 92, alignItems: 'center', padding: spacing.sm, borderWidth: 2, borderColor: colors.border, borderRadius: radii.pill },
  modePill: { minWidth: 92, alignItems: 'center', padding: spacing.sm, borderWidth: 2, borderColor: colors.gemTeal, borderRadius: radii.pill },
  utilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  flagButton: { ...touchable(), alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  flagged: { backgroundColor: colors.xpGold, borderColor: colors.xpGold },
  questionContent: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xl * 2 },
  feedback: { padding: spacing.lg, gap: spacing.sm, borderRadius: radii.card, borderWidth: 2, backgroundColor: colors.bgElevated },
  navigator: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  numberButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bgElevated },
  numberAnswered: { backgroundColor: '#29382E', borderColor: colors.success },
  numberFlagged: { borderColor: colors.xpGold },
  numberCurrent: { borderColor: colors.clay400, borderWidth: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
