import { View } from 'react-native';

import { colors, spacing } from '@/design/tokens';

import { AppText } from './AppText';

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
  accessibilityLabel: string;
};

// Minimal placeholder shared by the four tab stubs. Now driven entirely by the design tokens
// (dark bg + text tokens) and the AppText primitive so the four tabs inherit Dynamic Type and the
// proven-contrast palette. Real tab content lands with each feature milestone.
export function PlaceholderScreen({ title, subtitle, accessibilityLabel }: PlaceholderScreenProps) {
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        paddingHorizontal: spacing.xl,
      }}
    >
      <AppText accessibilityRole="header" tier="display" size="3xl" color={colors.textPrimary}>
        {title}
      </AppText>
      <AppText
        tier="body"
        size="base"
        color={colors.textSecondary}
        style={{ marginTop: spacing.md, textAlign: 'center' }}
      >
        {subtitle}
      </AppText>
    </View>
  );
}
