// src/features/account/AboutFooter.tsx
//
// The quiet footer at the end of Profile: the product name, the required affiliation line and, in the
// local-only store build, where progress lives. It is reference text, not a feature, so it is not a
// card: it sits on the base surface below the cards, separated by a hairline.

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/design/tokens';

import { AFFILIATION_LINE, APP_NAME, PRACTICE_CONTENT_LINE } from './about';
import { isLocalOnlyBuild } from './local-only';

export function AboutFooter() {
  return (
    <View style={styles.footer}>
      <AppText tier="label" size="sm" color={colors.textSecondary} accessibilityRole="header">
        {APP_NAME}
      </AppText>
      <AppText tier="body" size="sm" color={colors.textMuted} style={styles.line}>
        {AFFILIATION_LINE}
      </AppText>
      <AppText tier="body" size="sm" color={colors.textMuted} style={styles.line}>
        {PRACTICE_CONTENT_LINE}
      </AppText>
      {isLocalOnlyBuild ? (
        <AppText tier="body" size="sm" color={colors.textMuted} style={styles.line}>
          Your progress is saved on this device.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  line: { textAlign: 'center' },
});
