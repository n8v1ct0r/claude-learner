// src/features/lesson-player/Feedback.tsx
//
// The post-answer feedback panel. Correct = sage header + light celebratory tone; incorrect = warm
// amber (never red) with the "added to your review deck" reframing (no shame — a miss is review-deck
// fuel, not a failure). Both show the explanation, because the teaching happens here, and the
// question's cited sources as tappable links (owner rule 2). Motion is gated: with reduce-motion the
// panel just appears (no slide/scale). VoiceOver hears the result (and the best answer after a miss)
// as soon as the panel appears — role "alert" alone is silent on iOS.

import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { SourceLinks } from '@/components/SourceLinks';
import { colors, radii, spacing } from '@/design/tokens';
import { useReduceMotion } from '@/design/motion';

import { answerAnnouncement } from './answer-text';

export interface FeedbackProps {
  correct: boolean;
  explanation: string;
  /** The keyed answer written out (answer-text.ts), announced to VoiceOver after a miss. */
  correctAnswer?: string;
  /** The question's cited sources (content reader `sourceUrls`), shown as links. */
  sourceUrls?: readonly string[];
  onContinue: () => void;
}

export function Feedback({ correct, explanation, correctAnswer, sourceUrls, onContinue }: FeedbackProps) {
  const reduceMotion = useReduceMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    enter.value = reduceMotion ? 1 : withTiming(1, { duration: 180 });
  }, [reduceMotion, enter]);

  // Announce the graded result once, when the panel appears.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(answerAnnouncement(correct, correctAnswer));
  }, [correct, correctAnswer]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - enter.value) * 12 }],
  }));

  const accent = correct ? colors.success : colors.review;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLabel={correct ? 'Correct' : 'Added to your review deck'}
      style={[
        {
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radii.card,
          borderWidth: 2,
          borderColor: accent,
          backgroundColor: colors.bgElevated,
        },
        style,
      ]}
    >
      <AppText tier="label" size="lg" color={accent}>
        {correct ? '✓ Correct architecture decision' : '• Review this tradeoff'}
      </AppText>
      <AppText tier="label" size="xs" color={colors.textSecondary}>WHY THIS WINS</AppText>
      <AppText tier="body" size="base" color={colors.textPrimary}>
        {explanation}
      </AppText>
      {!correct ? (
        <AppText tier="body" size="sm" color={colors.review}>
          This objective was added to Practice so it returns after a useful delay.
        </AppText>
      ) : null}
      <SourceLinks urls={sourceUrls} />
      <View style={{ marginTop: spacing.sm }}>
        <Button3D
          label="Continue"
          color={correct ? colors.success : colors.clay400}
          onPress={onContinue}
        />
      </View>
    </Animated.View>
  );
}
