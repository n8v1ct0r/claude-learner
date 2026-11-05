// src/features/path/ChestReveal.tsx
//
// The chest / legendary REVEAL — a Clay overlay shown when the learner opens a reward or peeks at the
// end-of-unit challenge. The reward ECONOMY (real gem amounts, mastery gates) lands at M8, so this is
// deliberately a PREVIEW: it shows the right visual ceremony without inventing specific numbers that
// would imply the economy is already live. Copy is upbeat and no-shame (GC-13). The pop is gated on
// useReduceMotion() — with reduced motion the card appears instantly (GC-10).

import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { useReduceMotion } from '@/design/motion';
import { colors, radii, spacing } from '@/design/tokens';

export type RevealKind = 'chest' | 'legendary';

interface RevealCopy {
  glyph: string;
  glyphColor: string;
  title: string;
  body: string;
  badge: string;
}

const COPY: Record<RevealKind, RevealCopy> = {
  chest: {
    glyph: '◆',
    glyphColor: colors.gemTeal,
    title: 'Reward chest',
    body: 'Nice work reaching this chest. Rewards arrive with the next update — here is an early peek.',
    badge: 'Preview',
  },
  legendary: {
    glyph: '★',
    glyphColor: colors.xpGold,
    title: 'Legendary challenge',
    body: 'A tougher pass over the whole unit is on its way. Come back to test your mastery.',
    badge: 'Preview',
  },
};

export interface ChestRevealProps {
  visible: boolean;
  kind: RevealKind;
  onDismiss: () => void;
}

export function ChestReveal({ visible, kind, onDismiss }: ChestRevealProps) {
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0.6);

  useEffect(() => {
    if (!visible) {
      pop.value = reduceMotion ? 1 : 0.6;
      return;
    }
    pop.value = reduceMotion ? 1 : withSpring(1, { damping: 9, stiffness: 160 });
  }, [visible, reduceMotion, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const copy = COPY[kind];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <Animated.View
          style={[
            {
              width: '100%',
              maxWidth: 360,
              backgroundColor: colors.bgElevated,
              borderRadius: radii.card,
              borderWidth: 2,
              borderColor: copy.glyphColor,
              padding: spacing.xl,
              gap: spacing.lg,
              alignItems: 'center',
            },
            popStyle,
          ]}
        >
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radii.pill,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <AppText tier="label" size="xs" color={colors.textSecondary}>
              {copy.badge}
            </AppText>
          </View>

          <AppText tier="ceremony" size="4xl" color={copy.glyphColor} accessibilityLabel={`${copy.title} preview`}>
            {copy.glyph}
          </AppText>

          <AppText tier="display" size="xl" color={colors.textPrimary} accessibilityRole="header">
            {copy.title}
          </AppText>

          <AppText tier="body" size="base" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {copy.body}
          </AppText>

          <Button3D label="Nice" onPress={onDismiss} accessibilityHint="Close the preview" style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}
