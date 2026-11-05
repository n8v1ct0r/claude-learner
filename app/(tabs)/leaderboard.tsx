import { useRouter, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { useContentDb } from '@/db/content-provider';
import { colors, radii, spacing } from '@/design/tokens';
import { isAbandonedAttempt, useExamAttemptStore } from '@/state/exam-attempt';
import { useProgressStore } from '@/state/progress';

const WEIGHTS: Record<string, number> = { d1: 27, d2: 18, d3: 20, d4: 20, d5: 15 };

function coverageColor(percent: number): string {
  if (percent >= 80) return colors.success;
  if (percent >= 40) return colors.xpGold;
  return colors.clay400;
}

export default function ReadinessScreen() {
  const router = useRouter();
  const reader = useContentDb();
  const completedLessonIds = useProgressStore((state) => state.completedLessonIds);
  const history = useExamAttemptStore((state) => state.history);
  const abandonedAttemptIds = useExamAttemptStore((state) => state.abandonedAttemptIds);
  const completed = new Set(completedLessonIds);

  const domains = reader
    .listCourses()
    .filter((summary) => summary.domain !== 'd0')
    .map((summary) => reader.getCourse(summary.id))
    .filter((course) => course !== undefined)
    .map((course) => {
      const lessons = course.units.flatMap((unit) => unit.lessons);
      const done = lessons.filter((lesson) => completed.has(lesson.id)).length;
      return {
        id: course.domain,
        title: course.title,
        weight: WEIGHTS[course.domain] ?? 0,
        done,
        total: lessons.length,
        percent: lessons.length === 0 ? 0 : Math.round((done / lessons.length) * 100),
      };
    });

  // Scored attempts only: an abandoned attempt (closed without a submit, or remembered as abandoned)
  // never counts, even if a copy of it carries a result.
  const abandoned = new Set(abandonedAttemptIds);
  const completedAttempts = history.filter(
    (attempt) => attempt.result !== null && !isAbandonedAttempt(attempt) && !abandoned.has(attempt.attemptId),
  );
  const bestOf = (attempts: typeof completedAttempts): number =>
    attempts.reduce((best, attempt) => Math.max(best, attempt.result?.scaledScore ?? 0), 0);
  const bestScore = bestOf(completedAttempts);
  // "Best mock score" is a full-mock figure: a domain mini (18 questions, often partial) is not a mock.
  const fullMockIds = new Set(reader.listExams().filter((exam) => exam.kind === 'mock').map((exam) => exam.id));
  const bestMockScore = bestOf(completedAttempts.filter((attempt) => fullMockIds.has(attempt.examId)));
  const passedMocks = completedAttempts.filter((attempt) => attempt.result?.passed).length;
  const curriculumCoverage = domains.length === 0
    ? 0
    : Math.round(domains.reduce((sum, domain) => sum + domain.percent * (domain.weight / 100), 0));
  const nextDomain = [...domains].sort(
    (a, b) => a.percent - b.percent || b.weight - a.weight,
  )[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText tier="label" size="sm" color={colors.gemTeal}>READINESS CENTER</AppText>
            <AppText tier="display" size="3xl" color={colors.textPrimary} accessibilityRole="header">
              Know what to study next
            </AppText>
            <AppText tier="body" size="sm" color={colors.textSecondary}>
              Coverage follows the official five-domain blueprint. Mock evidence appears after you complete an exam.
            </AppText>
          </View>
          <ClaudeAgentMascot size={92} mood="thinking" accessibilityLabel="Claude Code study agent analyzing readiness" />
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <AppText tier="ceremony" size="3xl" color={coverageColor(curriculumCoverage)}>{`${curriculumCoverage}%`}</AppText>
            <AppText tier="label" size="xs" color={colors.textSecondary}>WEIGHTED COVERAGE</AppText>
          </View>
          <View style={styles.metric}>
            <AppText tier="ceremony" size="3xl" color={bestMockScore >= 720 ? colors.success : colors.xpGold}>
              {bestMockScore > 0 ? bestMockScore : '—'}
            </AppText>
            <AppText tier="label" size="xs" color={colors.textSecondary}>BEST MOCK SCORE</AppText>
          </View>
        </View>

        <View style={styles.nextCard}>
          <AppText tier="label" size="sm" color={colors.review}>HIGHEST-LEVERAGE NEXT STEP</AppText>
          <AppText tier="display" size="xl" color={colors.textPrimary}>{nextDomain?.title ?? 'Start the curriculum'}</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            {nextDomain
              ? `${nextDomain.percent}% covered · ${nextDomain.weight}% of the certification blueprint`
              : 'Complete the orientation path to begin.'}
          </AppText>
          <Button3D label="Continue curriculum" onPress={() => router.push('/' as Href)} />
        </View>

        <View style={styles.sectionHeading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary}>Blueprint coverage</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            A completed lesson means you studied the objective. Domain mastery is proven separately in mocks.
          </AppText>
        </View>

        {domains.map((domain) => {
          const color = coverageColor(domain.percent);
          return (
            <View key={domain.id} style={styles.domainCard}>
              <View style={styles.domainHeader}>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <AppText tier="label" size="xs" color={color}>{`DOMAIN ${domain.id.slice(1)} · ${domain.weight}% OF EXAM`}</AppText>
                  <AppText tier="display" size="lg" color={colors.textPrimary}>{domain.title}</AppText>
                </View>
                <AppText tier="display" size="xl" color={color}>{`${domain.percent}%`}</AppText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${domain.percent}%`, backgroundColor: color }]} />
              </View>
              <AppText tier="body" size="sm" color={colors.textSecondary}>{`${domain.done} of ${domain.total} lessons complete`}</AppText>
            </View>
          );
        })}

        <View style={styles.proofCard}>
          <AppText tier="label" size="sm" color={colors.xpGold}>EXAM EVIDENCE</AppText>
          <AppText tier="display" size="xl" color={colors.textPrimary}>
            {completedAttempts.length === 0 ? 'No mock evidence yet' : `${passedMocks} passing result${passedMocks === 1 ? '' : 's'}`}
          </AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            {completedAttempts.length === 0
              ? 'Take a domain mini exam now, then use the report to patch weak concepts.'
              : `${completedAttempts.length} completed attempt${completedAttempts.length === 1 ? '' : 's'} · best estimated score ${bestScore}`}
          </AppText>
          <Button3D label="Open exam lab" color={colors.gemTeal} shadowColor="#226F6D" onPress={() => router.push('/exams' as Href)} />
          <Button3D label="Practice weak concepts" color={colors.muted} shadowColor={colors.border} textColor={colors.textPrimary} onPress={() => router.push('/practice' as Href)} />
        </View>

        <AppText tier="body" size="sm" color={colors.textMuted} style={{ textAlign: 'center' }}>
          Coverage and practice scores are study signals, not an official certification result guarantee.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 3 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 2, borderColor: colors.gemTeal },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, minHeight: 110, justifyContent: 'center', gap: spacing.xs, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  nextCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.card, backgroundColor: '#35271F', borderWidth: 2, borderColor: colors.clay400 },
  sectionHeading: { gap: spacing.xs, marginTop: spacing.sm },
  domainCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  domainHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressTrack: { height: 9, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill },
  proofCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 2, borderColor: colors.xpGold },
});
