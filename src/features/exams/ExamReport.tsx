import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { SourceLinks } from '@/components/SourceLinks';
import { useContentDb } from '@/db/content-provider';
import { colors, radii, spacing, touchable } from '@/design/tokens';
import { taskLabel } from '@/content/task-labels';
import { scoreExam, type DomainBand, type ReadinessBand } from '@/engine/mock-exam';
import { useExamAttemptStore, type ExamAttempt } from '@/state/exam-attempt';
import { useSrsStore } from '@/state/srs';
import { useGameStore } from '@/state/game';
import type { ExamDomain, Question } from '../../../content/schema/types';

const DOMAIN_LABELS: Record<ExamDomain, string> = {
  d1: 'Agentic Architecture',
  d2: 'Tool Design & MCP',
  d3: 'Claude Code',
  d4: 'Prompt Engineering',
  d5: 'Context Management',
};

const BAND_COPY: Record<DomainBand, string> = {
  strong: 'Strong',
  borderline: 'Borderline',
  'needs-work': 'Needs work',
};

const READINESS_COPY: Record<ReadinessBand, { title: string; body: string; color: string }> = {
  'keep-building': {
    title: 'Keep building',
    body: 'Your patch plan below targets the concepts that will move your score fastest.',
    color: colors.review,
  },
  'getting-close': {
    title: 'Getting close',
    body: 'You are in striking distance. Patch the weakest domains, then take a fresh form.',
    color: colors.xpGold,
  },
  'likely-ready': {
    title: 'Likely ready',
    body: 'Your practice result shows strong readiness. Keep the concepts warm before exam day.',
    color: colors.success,
  },
};

function selectionText(question: Question, selection: readonly number[] | undefined): string {
  if (!selection || selection.length === 0) return 'Unanswered';
  if (question.type !== 'mc' && question.type !== 'multi') return 'Unsupported response';
  return selection.map((index) => question.options[index]).filter(Boolean).join(' + ') || 'Unanswered';
}

function correctAnswerText(question: Question): string {
  if (question.type === 'mc') return question.options[question.answerKey] ?? '';
  if (question.type === 'multi') return question.answerKey.map((index) => question.options[index]).filter(Boolean).join(' + ');
  return '';
}

export function ExamReport({
  attempt,
  onDone,
  onRelearn,
}: {
  attempt: ExamAttempt;
  onDone: () => void;
  onRelearn: (lessonId: string) => void;
}) {
  const reader = useContentDb();
  const recordMistake = useSrsStore((state) => state.recordMistake);
  const markMistakesCaptured = useExamAttemptStore((state) => state.markMistakesCaptured);
  const recordResult = useExamAttemptStore((state) => state.recordResult);
  const recordExam = useGameStore((state) => state.recordExam);
  const questions = useMemo(
    () => attempt.questionIds.map((id) => reader.getQuestion(id)).filter((q): q is Question => q !== undefined),
    [attempt.questionIds, reader],
  );
  const result = useMemo(
    () => scoreExam(questions.map((question) => ({ question, selection: attempt.answers[question.id]?.selection }))),
    [attempt.answers, questions],
  );
  const readiness = READINESS_COPY[result.readiness];
  const [showMissedReview, setShowMissedReview] = useState(false);

  // Capture every miss into the existing FSRS deck exactly once, including unanswered questions.
  useEffect(() => {
    if (attempt.mistakesCapturedAt !== null) return;
    const now = Date.now();
    for (const questionId of result.missedQuestionIds) {
      const question = questions.find((candidate) => candidate.id === questionId);
      if (question) recordMistake(question.id, question.conceptId, now);
    }
    markMistakesCaptured(now);
  }, [attempt.mistakesCapturedAt, markMistakesCaptured, questions, recordMistake, result.missedQuestionIds]);

  useEffect(() => {
    recordExam(attempt.attemptId);
  }, [attempt.attemptId, recordExam]);

  useEffect(() => {
    if (attempt.result !== null) return;
    const now = Date.now();
    recordResult({
      rawScore: result.correct,
      scaledScore: result.estimatedScore,
      passed: result.estimatedScore >= 720,
      domainScores: Object.fromEntries(result.domains.map((domain) => [domain.domain, {
        correct: domain.correct,
        total: domain.total,
        percent: domain.percent,
        band: domain.band,
      }])),
      durationSeconds: Math.max(0, Math.round(((attempt.completedAt ?? now) - attempt.startedAt) / 1000)),
    }, now);
  }, [attempt.completedAt, attempt.result, attempt.startedAt, recordResult, result.correct, result.domains, result.estimatedScore]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreHero}>
          <ClaudeAgentMascot size={96} mood={result.readiness === 'likely-ready' ? 'celebrate' : 'thinking'} accessibilityLabel="Claude Code study agent" />
          <AppText tier="label" size="sm" color={colors.clay400}>ESTIMATED PRACTICE SCORE</AppText>
          <AppText tier="ceremony" size="5xl" color={readiness.color} accessibilityLabel={`Estimated score ${result.estimatedScore} out of 1000`}>
            {result.estimatedScore}
          </AppText>
          <AppText tier="display" size="2xl" color={readiness.color}>{readiness.title}</AppText>
          <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {readiness.body}
          </AppText>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <AppText tier="display" size="xl" color={colors.textPrimary}>{`${result.correct}/${result.total}`}</AppText>
              <AppText tier="label" size="sm" color={colors.textSecondary}>CORRECT</AppText>
            </View>
            <View style={styles.stat}>
              <AppText tier="display" size="xl" color={colors.textPrimary}>{`${result.percent}%`}</AppText>
              <AppText tier="label" size="sm" color={colors.textSecondary}>RAW</AppText>
            </View>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            This is an estimated practice score using Claude Learners&apos; transparent 100–1000 formula. It is not Anthropic official equating and does not predict an official certification result.
          </AppText>
        </View>

        <View style={{ gap: spacing.xs }}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">Domain report</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>Weakest areas appear first so your next move is clear.</AppText>
        </View>

        {result.domains.map((domain) => {
          const color = domain.band === 'strong' ? colors.success : domain.band === 'borderline' ? colors.xpGold : colors.review;
          return (
            <View key={domain.domain} style={styles.domainCard}>
              <View style={styles.domainHeader}>
                <AppText tier="display" size="lg" color={colors.textPrimary} style={{ flex: 1 }}>{DOMAIN_LABELS[domain.domain]}</AppText>
                <AppText tier="label" size="base" color={color}>{`${domain.percent}%`}</AppText>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${domain.percent}%`, backgroundColor: color }]} />
              </View>
              <AppText tier="label" size="sm" color={color}>{`${BAND_COPY[domain.band]} · ${domain.correct}/${domain.total}`}</AppText>
            </View>
          );
        })}

        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">Objective diagnostics</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            The weakest tested task statements appear first. Small samples are directional, not proof of mastery.
          </AppText>
        </View>

        {result.tasks.map((task) => {
          const color = task.band === 'strong' ? colors.success : task.band === 'borderline' ? colors.xpGold : colors.review;
          return (
            <View key={task.taskStatement} style={styles.taskRow}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <AppText tier="label" size="xs" color={color}>{`TASK ${task.taskStatement}`}</AppText>
                <AppText tier="label" size="base" color={colors.textPrimary}>{taskLabel(task.taskStatement)}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                <AppText tier="display" size="lg" color={color}>{`${task.percent}%`}</AppText>
                <AppText tier="label" size="xs" color={colors.textSecondary}>{`${task.correct}/${task.total}`}</AppText>
              </View>
            </View>
          );
        })}

        {result.missedQuestionIds.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">Your patch plan</AppText>
              <AppText tier="body" size="sm" color={colors.textSecondary}>Missed questions are already in Practice. Relearn these lessons first.</AppText>
            </View>
            {result.domains.filter((domain) => domain.missedQuestionIds.length > 0).map((domain, index) => {
              const firstQuestion = reader.getQuestion(domain.missedQuestionIds[0]);
              const lesson = firstQuestion ? reader.getLessonForConcept(firstQuestion.conceptId) : undefined;
              return (
                <Pressable
                  key={domain.domain}
                  disabled={!lesson}
                  onPress={() => lesson && onRelearn(lesson.id)}
                  accessibilityRole="button"
                  accessibilityLabel={lesson ? `Relearn ${lesson.title}` : `${DOMAIN_LABELS[domain.domain]} review added to practice`}
                  style={styles.patchRow}
                >
                  <View style={styles.patchNumber}>
                    <AppText tier="label" size="sm" color={colors.textOnAccent}>{index + 1}</AppText>
                  </View>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <AppText tier="label" size="base" color={colors.textPrimary}>{DOMAIN_LABELS[domain.domain]}</AppText>
                    <AppText tier="body" size="sm" color={colors.textSecondary}>
                      {lesson ? `Relearn: ${lesson.title}` : `${domain.missedQuestionIds.length} cards added to Practice`}
                    </AppText>
                  </View>
                  {lesson ? <AppText tier="label" size="xl" color={colors.clay400}>→</AppText> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {result.missedQuestionIds.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Button3D
              label={showMissedReview ? 'Hide missed decisions' : `Review ${result.missedQuestionIds.length} missed decisions`}
              color={colors.gemTeal}
              shadowColor="#226F6D"
              onPress={() => setShowMissedReview((visible) => !visible)}
            />
            {showMissedReview ? result.missedQuestionIds.map((questionId, index) => {
              const question = questions.find((candidate) => candidate.id === questionId);
              if (!question || (question.type !== 'mc' && question.type !== 'multi')) return null;
              return (
                <View key={question.id} style={styles.reviewCard}>
                  <AppText tier="label" size="xs" color={colors.clay400}>{`MISSED DECISION ${index + 1} · TASK ${question.taskStatement}`}</AppText>
                  <AppText tier="display" size="lg" color={colors.textPrimary}>{question.stem}</AppText>
                  <View
                    accessible
                    accessibilityLabel={
                      attempt.answers[question.id]?.selection.length
                        ? `Your answer, not quite: ${selectionText(question, attempt.answers[question.id]?.selection)}`
                        : 'Your answer: Unanswered'
                    }
                    style={styles.answerBlock}
                  >
                    <AppText tier="label" size="xs" color={colors.review}>• YOUR ANSWER</AppText>
                    <AppText tier="body" size="sm" color={colors.textPrimary}>
                      {selectionText(question, attempt.answers[question.id]?.selection)}
                    </AppText>
                  </View>
                  <View
                    accessible
                    accessibilityLabel={`Best answer: ${correctAnswerText(question)}`}
                    style={[styles.answerBlock, { borderLeftColor: colors.success }]}
                  >
                    <AppText tier="label" size="xs" color={colors.success}>✓ BEST ANSWER</AppText>
                    <AppText tier="body" size="sm" color={colors.textPrimary}>{correctAnswerText(question)}</AppText>
                  </View>
                  <AppText tier="label" size="xs" color={colors.textSecondary}>DECISION RULE</AppText>
                  <AppText tier="body" size="base" color={colors.textPrimary}>{question.explanation}</AppText>
                  <SourceLinks urls={question.sourceUrls} />
                </View>
              );
            }) : null}
          </View>
        ) : null}

        <Button3D label="Done" onPress={onDone} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 3 },
  scoreHero: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 2, borderColor: colors.clayPressed },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  stat: { minWidth: 110, alignItems: 'center', padding: spacing.md, borderRadius: radii.button, backgroundColor: colors.bg },
  disclaimer: { padding: spacing.md, borderRadius: radii.button, borderWidth: 1, borderColor: colors.info, backgroundColor: colors.bgElevated },
  domainCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  domainHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.button, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  barTrack: { height: 10, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.border },
  barFill: { height: '100%', borderRadius: radii.pill },
  patchRow: { ...touchable(), flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  patchNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.clay400 },
  reviewCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  answerBlock: { gap: spacing.xs, padding: spacing.md, borderRadius: radii.button, backgroundColor: colors.bg, borderLeftWidth: 4, borderLeftColor: colors.review },
});
