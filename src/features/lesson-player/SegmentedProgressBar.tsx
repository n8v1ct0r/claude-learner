// src/features/lesson-player/SegmentedProgressBar.tsx
//
// The per-question segmented progress bar (Duolingo-style). One segment per original question; filled
// segments animate a springy fill as the learner advances. Motion is gated on useReduceMotion() — with
// reduced motion the fill is instant (no spring). The bar exposes a single accessibility label so a
// screen-reader hears "Question 3 of 10", not ten anonymous views.

import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { colors, radii, spacing } from '@/design/tokens';
import { useReduceMotion } from '@/design/motion';

interface SegmentProps {
  filled: boolean;
  reduceMotion: boolean;
}

function Segment({ filled, reduceMotion }: SegmentProps) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    const target = filled ? 1 : 0;
    fill.value = reduceMotion ? target : withSpring(target, { damping: 14, stiffness: 140 });
  }, [filled, reduceMotion, fill]);

  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? (filled ? 1 : 0) : withTiming(fill.value, { duration: 160 }),
  }));

  return (
    <View style={{ flex: 1, height: 10, borderRadius: radii.pill, backgroundColor: colors.bgElevated, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, borderRadius: radii.pill, backgroundColor: colors.clay400 }, style]} />
    </View>
  );
}

export interface SegmentedProgressBarProps {
  filled: number;
  total: number;
}

export function SegmentedProgressBar({ filled, total }: SegmentedProgressBarProps) {
  const reduceMotion = useReduceMotion();
  const segments = Math.max(total, 1);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Question ${Math.min(filled + 1, segments)} of ${segments}`}
      accessibilityValue={{ min: 0, max: segments, now: filled }}
      style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <Segment key={i} filled={i < filled} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}
