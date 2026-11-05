// src/features/ceremony/StreakMilestone.tsx — the full-screen streak celebration takeover.
//
// Shown when a streak lands on a milestone (7 / 30 / 100 … days — see src/juice/streak-milestone.ts).
// Everything here is GAIN-FRAMED (GC-13): it celebrates the habit the learner built and never uses any
// loss- or pressure-framing about the streak (that copy is banned by evals/checks/copy-lint.mjs).
//
// Reduce-motion (GC-10): the mascot falls back to a static pose and the confetti to a static frame; the
// content is otherwise identical, so the moment still reads.

import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { colors, spacing } from '@/design/tokens';
import { Celebration } from '@/juice/Celebration';
import { celebrate as celebrateHaptic } from '@/juice/haptics';
import { playFanfare, playLegendary } from '@/juice/sfx';
import { streakMilestone } from '@/juice/streak-milestone';

export interface StreakMilestoneProps {
  /** Current streak length in days. */
  days: number;
  onDone: () => void;
}

/** Renders nothing when `days` is not a milestone threshold — callers can mount it unconditionally. */
export function StreakMilestone({ days, onDone }: StreakMilestoneProps) {
  const moment = streakMilestone(days);

  useEffect(() => {
    if (!moment) return;
    celebrateHaptic();
    if (moment.legendary) playLegendary();
    else playFanfare();
  }, [moment]);

  if (!moment) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute' }}>
            <Celebration play loop={false} size={240} />
          </View>
          <ClaudeAgentMascot
            size={128}
            mood={moment.legendary ? 'legendary' : 'celebrate'}
            accessibilityLabel="Claude Code agent celebrating your streak"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText tier="ceremony" size="4xl" color={colors.streakFlame}>
            ▲
          </AppText>
          <AppText tier="ceremony" size="4xl" color={colors.streakFlame} accessibilityRole="header">
            {`${days}`}
          </AppText>
        </View>

        <AppText tier="display" size="2xl" color={colors.textPrimary} style={{ textAlign: 'center' }}>
          {moment.title}
        </AppText>
        <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {moment.message}
        </AppText>
      </View>

      <View style={{ padding: spacing.xl }}>
        <Button3D label="Keep it going" onPress={onDone} accessibilityHint="Back to your path" />
      </View>
    </SafeAreaView>
  );
}
