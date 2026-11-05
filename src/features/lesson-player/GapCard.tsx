// src/features/lesson-player/GapCard.tsx
//
// The gap micro-card (Feynman spine §3.1). It reframes the self-assessed misses as "the good part" —
// finding a gap is the win, not a failure (no shame) — and shows exactly ONE next step. The missed key
// points come straight from the explain-back self-assessment; their texts are the lesson concept's key
// points (round-trip IDs, GC-15d). When nothing was missed it celebrates full coverage. One CTA.

import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, radii, spacing } from '@/design/tokens';

import type { KeyPoint } from '../../../content/schema/types';

export interface GapCardProps {
  missedKeyPoints: KeyPoint[];
  coveredCount: number;
  totalCount: number;
  /** The agent's coaching line when the lesson was server-graded (already no-shame filtered); else null. */
  coachingHint?: string | null;
  /** A "worth double-checking" note from the grader when present (already no-shame filtered); else null. */
  misconceptionNote?: string | null;
  onContinue: () => void;
}

export function GapCard({
  missedKeyPoints,
  coveredCount,
  totalCount,
  coachingHint = null,
  misconceptionNote = null,
  onContinue,
}: GapCardProps) {
  const allCovered = missedKeyPoints.length === 0;
  // Prefer the agent's own next step (graded path); fall back to the app-authored line otherwise.
  const nextStepLine =
    coachingHint ??
    'Next step: re-read these points, then replay the lesson or open its topic deck in Practice.';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
          {allCovered ? 'You covered it all' : 'Found a gap — that’s the good part'}
        </AppText>
        <AppText tier="body" size="base" color={colors.textSecondary}>
          {`You covered ${coveredCount} of ${totalCount} key points.`}
        </AppText>

        {allCovered ? (
          <AppText tier="body" size="base" color={colors.textPrimary}>
            {coachingHint ??
              'Nice teaching. Next step: come back tomorrow and re-explain it once from memory to lock it in.'}
          </AppText>
        ) : (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radii.card,
              backgroundColor: colors.bgElevated,
              borderLeftWidth: 4,
              borderLeftColor: colors.review,
              gap: spacing.sm,
            }}
          >
            <AppText tier="label" size="sm" color={colors.review}>
              Worth another look
            </AppText>
            {missedKeyPoints.map((point) => (
              <AppText key={point.id} tier="body" size="base" color={colors.textPrimary}>
                {`• ${point.text}`}
              </AppText>
            ))}
            <AppText tier="body" size="base" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              {nextStepLine}
            </AppText>
          </View>
        )}

        {misconceptionNote ? (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radii.card,
              backgroundColor: colors.bgElevated,
              borderLeftWidth: 4,
              borderLeftColor: colors.info,
              gap: spacing.sm,
            }}
          >
            <AppText tier="label" size="sm" color={colors.info}>
              One thing to double-check
            </AppText>
            <AppText tier="body" size="base" color={colors.textPrimary}>
              {misconceptionNote}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ padding: spacing.xl, paddingTop: spacing.md }}>
        <Button3D label="Continue" onPress={onContinue} accessibilityHint="Finish the lesson" />
      </View>
    </View>
  );
}
