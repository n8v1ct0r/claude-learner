// app/+not-found.tsx — any unknown URL or stale deep link (IB-2, WR-6).
//
// Replaces expo-router's developer "Unmatched Route / Sitemap" page with a calm, branded screen and one
// way out: back to the Learn tab. It also lifts the native splash in case a cold launch landed here.

import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { hideAppSplash } from '@/components/splash';
import { colors, spacing } from '@/design/tokens';

export default function NotFoundScreen() {
  useEffect(() => {
    hideAppSplash();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            This page isn’t here
          </AppText>
          <AppText tier="body" size="base" color={colors.textSecondary}>
            The link may be old or mistyped. Your lessons and progress are right where you left them.
          </AppText>
        </View>
        <Button3D label="Back to Learn" onPress={() => router.dismissTo('/')} accessibilityHint="Opens the Learn tab" />
      </View>
    </SafeAreaView>
  );
}
