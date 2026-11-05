// src/features/exams/ConfirmPanel.tsx
//
// The exams' in-place confirm step: a question, one line on what happens, a confirm button and a way
// back. It replaces the button the learner just tapped ("Start simulation" with an exam in progress,
// "Submit 3/18 answered" with questions left), so VoiceOver focus would be left on nothing: on
// appearing, it moves focus to its question, read as a heading.

import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, radii, spacing } from '@/design/tokens';

export interface ConfirmPanelProps {
  /** The question, read as a heading; VoiceOver focus moves here when the panel appears. */
  title: string;
  /** What confirming does. */
  message: string;
  confirmLabel: string;
  confirmHint: string;
  onConfirm: () => void;
  /** Confirm face and base colors; default to the primary clay. */
  confirmColor?: string;
  confirmShadowColor?: string;
  cancelLabel: string;
  cancelHint: string;
  onCancel: () => void;
}

export function ConfirmPanel({
  title,
  message,
  confirmLabel,
  confirmHint,
  onConfirm,
  confirmColor,
  confirmShadowColor,
  cancelLabel,
  cancelHint,
  onCancel,
}: ConfirmPanelProps) {
  const titleRef = useRef<View>(null);
  useEffect(() => {
    if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
  }, []);
  return (
    <View style={styles.panel} accessibilityRole="alert">
      <View ref={titleRef} accessible accessibilityRole="header">
        <AppText tier="label" size="base" color={colors.textPrimary}>
          {title}
        </AppText>
      </View>
      <AppText tier="body" size="sm" color={colors.textSecondary}>
        {message}
      </AppText>
      <Button3D
        label={confirmLabel}
        color={confirmColor}
        shadowColor={confirmShadowColor}
        onPress={onConfirm}
        accessibilityHint={confirmHint}
      />
      <Button3D
        label={cancelLabel}
        color={colors.muted}
        shadowColor={colors.border}
        textColor={colors.textPrimary}
        onPress={onCancel}
        accessibilityHint={cancelHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.button,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.xpGold,
  },
});
