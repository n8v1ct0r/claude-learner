// src/features/lesson-player/TfSpeedTimer.tsx
//
// The calm per-question countdown for a tf-speed round. It is a gentle nudge, NOT a punishment:
//   • never red — the low state uses the warm review-amber, the same "needs attention" tone used
//     everywhere else (no-shame rule);
//   • reaching 0 costs nothing — grading is untouched (the McRenderer still grades the tap normally),
//     so a slow answer is never marked wrong by the clock. The XP engine has no speed term, so the
//     timer can never change the award. This is what keeps timed and untimed tf-speed at XP parity.
//   • it disappears entirely when time pressure is reduced (the caller decides whether to mount it).
//
// It uses discrete per-second updates (no continuous animation), so there is no motion to gate — the
// bar steps down rather than sweeping. When `running` is false (the question has been answered) the
// countdown freezes.

import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/design/tokens';

export interface TfSpeedTimerProps {
  /** Total budget in seconds (the question's estimatedSeconds). */
  seconds: number;
  /** Whether the clock is ticking; set false once the question is answered so it freezes. */
  running: boolean;
}

export function TfSpeedTimer({ seconds, running }: TfSpeedTimerProps) {
  // The player remounts this component per question (ExerciseStep is keyed by the question), so the
  // initial state is the reset — there is no need to watch `seconds` for changes within one mount.
  const total = Math.max(1, Math.floor(seconds));
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  // "Running low" once a third of the budget (or 3s, whichever is larger) remains.
  const lowThreshold = Math.max(3, Math.ceil(total / 3));
  const low = remaining <= lowThreshold;
  const fillRatio = total > 0 ? remaining / total : 0;

  const accent = low ? colors.review : colors.gemTeal;
  const labelColor = low ? colors.review : colors.textSecondary;

  return (
    <View
      testID="tf-speed-timer"
      accessible
      accessibilityLabel={`Speed round — ${remaining} ${remaining === 1 ? 'second' : 'seconds'} left. There is no penalty for taking longer.`}
      style={{ gap: spacing.xs }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tier="label" size="sm" color={colors.textSecondary}>
          Speed round
        </AppText>
        <AppText tier="label" size="sm" color={labelColor}>
          {`${remaining}s`}
        </AppText>
      </View>
      <View style={{ height: 8, borderRadius: radii.pill, backgroundColor: colors.bgElevated, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.round(fillRatio * 100)}%`,
            height: '100%',
            borderRadius: radii.pill,
            backgroundColor: accent,
          }}
        />
      </View>
    </View>
  );
}
