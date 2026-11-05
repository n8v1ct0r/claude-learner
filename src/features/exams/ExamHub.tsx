import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { useContentDb } from '@/db/content-provider';
import type { ContentReader, ExamSummary } from '@/db/content-reader';
import { colors, radii, spacing } from '@/design/tokens';
import { isLocalOnlyBuild } from '@/features/account/local-only';
import { useProgressStore } from '@/state/progress';
import type { ExamAttempt, ExamMode } from '@/state/exam-attempt';

import { ConfirmPanel } from './ConfirmPanel';

export interface ExamHubProps {
  activeAttempt: ExamAttempt | null;
  /**
   * Start an exam. While another attempt is in progress the hub asks first (FT-3) and calls this only
   * after the learner confirms; the store then closes the saved attempt as abandoned.
   */
  onStart: (examId: string, mode: ExamMode) => void;
  onResume: () => void;
}

/** An in-card "replace your saved exam?" step, shown instead of the start buttons. */
interface StartConfirmation {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** The in-card confirm step, shown in place of the Start buttons (the shared exam ConfirmPanel). */
function StartConfirmPanel({ examTitle, confirmation }: { examTitle: string; confirmation: StartConfirmation }) {
  return (
    <ConfirmPanel
      title="Start a new exam?"
      message={confirmation.message}
      confirmLabel="Start new exam"
      confirmHint={`Closes your saved attempt and starts ${examTitle}`}
      onConfirm={confirmation.onConfirm}
      cancelLabel="Keep saved exam"
      cancelHint="Keeps your saved attempt so you can resume it"
      onCancel={confirmation.onCancel}
    />
  );
}

function countCompletedDomainCourses(reader: ContentReader, completedIds: readonly string[]): number {
  const completed = new Set(completedIds);
  return reader
    .listCourses()
    .filter((summary) => summary.domain !== 'd0')
    .map((summary) => reader.getCourse(summary.id))
    .filter((course) =>
      course?.units.every((unit) => unit.lessons.every((lesson) => completed.has(lesson.id))),
    ).length;
}

function ExamCard({
  exam,
  locked,
  onStart,
  confirmation,
}: {
  exam: ExamSummary;
  locked: boolean;
  onStart: (mode: ExamMode) => void;
  confirmation: StartConfirmation | null;
}) {
  return (
    <View style={[styles.card, locked && styles.locked]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText tier="label" size="sm" color={exam.kind === 'mock' ? colors.clay400 : colors.gemTeal}>
            {exam.kind === 'mock' ? 'FULL MOCK' : 'DOMAIN MINI'}
          </AppText>
          <AppText tier="display" size="xl" color={colors.textPrimary}>
            {exam.title}
          </AppText>
        </View>
        <View style={styles.countPill}>
          <AppText tier="label" size="sm" color={colors.textPrimary}>
            {`${exam.questionCount} Q`}
          </AppText>
        </View>
      </View>

      <AppText tier="body" size="sm" color={colors.textSecondary}>
        {`${exam.timeLimitMinutes} min simulation · guided practice available · energy-free`}
      </AppText>

      {locked ? (
        <View style={styles.lockNotice}>
          <AppText tier="label" size="sm" color={colors.review}>
            Finish any 2 domain paths to unlock full mock exams. Mini exams are ready now.
          </AppText>
        </View>
      ) : confirmation ? (
        <StartConfirmPanel examTitle={exam.title} confirmation={confirmation} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button3D
            label="Start simulation"
            onPress={() => onStart('simulation')}
            accessibilityHint={`Starts a timed ${exam.questionCount}-question exam`}
          />
          <Button3D
            label="Guided practice"
            color={colors.gemTeal}
            shadowColor="#226F6D"
            onPress={() => onStart('practice')}
            accessibilityHint="Starts untimed practice with feedback after every answer"
          />
        </View>
      )}
    </View>
  );
}

export function ExamHub({ activeAttempt, onStart, onResume }: ExamHubProps) {
  const reader = useContentDb();
  const completedLessonIds = useProgressStore((state) => state.completedLessonIds);
  const exams = reader.listExams();
  const fullMocks = exams.filter((exam) => exam.kind === 'mock');
  const minis = exams.filter((exam) => exam.kind === 'mini');
  const completedDomainCourses = countCompletedDomainCourses(reader, completedLessonIds);
  const fullMocksLocked = completedDomainCourses < 2;

  // Starting another exam would replace the saved one, so ask first (FT-3).
  const [pendingStart, setPendingStart] = useState<{ examId: string; mode: ExamMode } | null>(null);
  const inProgress = activeAttempt && activeAttempt.completedAt === null ? activeAttempt : null;
  const requestStart = (examId: string, mode: ExamMode): void => {
    if (inProgress) setPendingStart({ examId, mode });
    else onStart(examId, mode);
  };
  const confirmationFor = (examId: string): StartConfirmation | null => {
    const pending = pendingStart;
    if (!inProgress || !pending || pending.examId !== examId) return null;
    const savedTitle = exams.find((exam) => exam.id === inProgress.examId)?.title ?? 'exam';
    const answered = Object.keys(inProgress.answers).length;
    return {
      message: `Your saved ${savedTitle} attempt (${answered}/${inProgress.questionIds.length} answered) will close without a score, and it won't count toward readiness.`,
      onConfirm: () => {
        setPendingStart(null);
        onStart(pending.examId, pending.mode);
      },
      onCancel: () => setPendingStart(null),
    };
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <AppText tier="label" size="sm" color={colors.clay400}>
              CERTIFICATION LAB
            </AppText>
            <AppText tier="display" size="3xl" color={colors.textPrimary} accessibilityRole="header">
              Exam readiness
            </AppText>
            <AppText tier="body" size="base" color={colors.textSecondary}>
              Train under real timing or slow it down and learn from every answer.
            </AppText>
          </View>
          <ClaudeAgentMascot size={88} mood="thinking" accessibilityLabel="Claude Code agent studying" />
        </View>

        {activeAttempt && activeAttempt.completedAt === null ? (
          <View style={styles.resumeCard}>
            {/* The local-only build has no online side, so "offline" would describe nothing. */}
            <AppText tier="label" size="sm" color={colors.xpGold}>
              {isLocalOnlyBuild ? 'SAVED ON THIS DEVICE' : 'SAVED OFFLINE'}
            </AppText>
            <AppText tier="display" size="xl" color={colors.textPrimary}>
              Resume where you stopped
            </AppText>
            <AppText tier="body" size="sm" color={colors.textSecondary}>
              {`${Object.keys(activeAttempt.answers).length}/${activeAttempt.questionIds.length} answered · ${activeAttempt.mode === 'simulation' ? 'timer continues' : 'guided practice'}`}
            </AppText>
            <Button3D label="Resume exam" color={colors.xpGold} shadowColor="#A96E16" onPress={onResume} />
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            Full simulations
          </AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            Three distinct 60-question forms built to the CCA-F domain blueprint.
          </AppText>
        </View>
        {fullMocks.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            locked={fullMocksLocked}
            onStart={(mode) => requestStart(exam.id, mode)}
            confirmation={confirmationFor(exam.id)}
          />
        ))}

        <View style={styles.sectionHeading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            Domain mini exams
          </AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            Focused 18-question checks for each exam domain. Always available.
          </AppText>
        </View>
        {minis.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            locked={false}
            onStart={(mode) => requestStart(exam.id, mode)}
            confirmation={confirmationFor(exam.id)}
          />
        ))}

        <AppText tier="body" size="sm" color={colors.textMuted} style={{ textAlign: 'center' }}>
          Scores are practice estimates, not Anthropic official equating or certification results.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 3 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.clayPressed,
  },
  sectionHeading: { gap: spacing.xs, marginTop: spacing.md },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locked: { opacity: 0.8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  countPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lockNotice: {
    backgroundColor: colors.bg,
    borderRadius: radii.button,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.review,
  },
  resumeCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.xpGold,
  },
});
