// src/features/lesson-player/ConceptCard.tsx
//
// The first screen of every lesson (Feynman spine §3.1): the ANALOGY first (plain-world before any
// terminology), then 2-3 plain sentences, then the "exam words" strip and an optional code snippet,
// then the 3-5 key points the lesson will hold you to. One primary CTA starts the decision set.

import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { taskLabel } from '@/content/task-labels';
import { colors, radii, spacing } from '@/design/tokens';

import type { ConceptCard as ConceptCardData } from '../../../content/schema/types';

export interface ConceptCardProps {
  concept: ConceptCardData;
  title: string;
  decisionCount?: number;
  taskStatements?: string[];
  onGotIt: () => void;
}

export function ConceptCard({ concept, title, decisionCount = 5, taskStatements = [], onGotIt }: ConceptCardProps) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.xs }}>
          <AppText tier="label" size="sm" color={colors.clay400}>CONCEPT BRIEFING</AppText>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            {title}
          </AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>
            {`Learn the decision rule, apply it in ${decisionCount} exam-style decisions, then teach it back.`}
          </AppText>
        </View>

        {taskStatements.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <AppText tier="label" size="sm" color={colors.textSecondary}>Exam objectives trained</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {taskStatements.map((statement) => (
                <View
                  key={statement}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radii.button,
                    backgroundColor: '#24352F',
                    borderWidth: 1,
                    borderColor: colors.gemTeal,
                  }}
                >
                  <AppText tier="label" size="xs" color={colors.gemTeal}>{`TASK ${statement}`}</AppText>
                  <AppText tier="label" size="sm" color={colors.textPrimary}>{taskLabel(statement)}</AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Analogy first. */}
        <View
          style={{
            padding: spacing.lg,
            borderRadius: radii.card,
            backgroundColor: colors.bgElevated,
            borderLeftWidth: 4,
            borderLeftColor: colors.clay400,
            gap: spacing.xs,
          }}
        >
          <AppText tier="label" size="sm" color={colors.clay400}>
            Picture this
          </AppText>
          <AppText tier="body" size="lg" color={colors.textPrimary}>
            {concept.analogy}
          </AppText>
        </View>

        {/* Plain explanation. */}
        <AppText tier="body" size="base" color={colors.textPrimary}>
          {concept.plainExplanation}
        </AppText>

        {/* Exam words strip. */}
        <View style={{ gap: spacing.sm }}>
          <AppText tier="label" size="sm" color={colors.textSecondary}>
            Exam words
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {concept.examWords.map((word) => (
              <View
                key={word}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  borderRadius: radii.pill,
                  backgroundColor: colors.bgElevated,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <AppText tier="label" size="sm" color={colors.textPrimary}>
                  {word}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Optional snippet. */}
        {concept.snippet ? (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radii.card,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <AppText tier="body" size="sm" weight="semibold" color={colors.textSecondary}>
              {concept.snippet.code}
            </AppText>
          </View>
        ) : null}

        {/* Key points. */}
        <View style={{ gap: spacing.sm }}>
          <AppText tier="label" size="sm" color={colors.textSecondary}>
            Decision rules to remember
          </AppText>
          {concept.keyPoints.map((point, index) => (
            <View key={point.id} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <AppText tier="label" size="base" color={colors.clay400}>
                {index + 1}.
              </AppText>
              <AppText tier="body" size="base" color={colors.textPrimary} style={{ flex: 1 }}>
                {point.text}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ padding: spacing.xl, paddingTop: spacing.md }}>
        <Button3D label={`Start ${decisionCount} decisions`} onPress={onGotIt} accessibilityHint="Start the exam-style decisions for this lesson" />
      </View>
    </View>
  );
}
