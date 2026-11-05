// src/components/ErrorRecovery.tsx
//
// The friendly recovery screen behind the app's error boundaries (V-web-runtime-3, FT-15). A render
// error used to leave a blank screen; now the learner gets a calm explanation, a retry, and — when the
// navigator is still mounted (a screen-level error) — a way back to the Learn tab. Progress lives in
// persisted stores, so nothing is lost. It relies on no provider (it may render ABOVE the root layout's
// providers) and lifts the native splash, which may still be up if the error hit during launch.

import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { Button3D } from './Button3D';
import { forceHideAppSplash } from './splash';

export interface ErrorRecoveryProps {
  /** Re-render the failed screen (expo-router's ErrorBoundary `retry`). */
  onRetry: () => void | Promise<void>;
  /** Leave the failed screen for the Learn tab; omitted when no navigator is mounted. */
  onHome?: () => void;
}

export function ErrorRecovery({ onRetry, onHome }: ErrorRecoveryProps) {
  useEffect(() => {
    forceHideAppSplash();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            This screen hit a snag
          </AppText>
          <AppText tier="body" size="base" color={colors.textSecondary}>
            Something unexpected happened while loading it. Your progress is saved on this device.
          </AppText>
        </View>
        <View style={{ gap: spacing.md }}>
          <Button3D label="Try again" onPress={() => void onRetry()} accessibilityHint="Reloads this screen" />
          {onHome ? (
            <Button3D
              label="Back to Learn"
              color={colors.muted}
              shadowColor={colors.border}
              textColor={colors.textPrimary}
              onPress={onHome}
              accessibilityHint="Opens the Learn tab"
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
