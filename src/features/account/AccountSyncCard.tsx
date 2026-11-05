import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { requestEmailUpgrade, verifyEmailUpgrade } from '@/api/auth';
import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { colors, fontFamily, spacing, radii } from '@/design/tokens';
import { useSessionMetaStore } from '@/state/session-meta';
import { syncNow } from '@/sync/runtime';

import { isLocalOnlyBuild } from './local-only';

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message.includes('not configured')) return error.message;
  return 'That did not connect yet. Your local progress is safe, and you can try again when ready.';
}

/**
 * Profile's account and online-backup card. The App Store v1.0 build is local-only (no Supabase
 * config), so there the card renders nothing: no backend status, no sync queue, no email form.
 * Builds that carry EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_KEY get the full card.
 */
export function AccountSyncCard() {
  if (isLocalOnlyBuild) return null;
  return <OnlineAccountSyncCard />;
}

function OnlineAccountSyncCard() {
  const meta = useSessionMetaStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendCode = async (): Promise<void> => {
    if (!email.includes('@')) {
      setMessage('Enter the email address you want to use for this study profile.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await requestEmailUpgrade(email);
      setCodeSent(true);
      setMessage('A six-digit code is on its way. This keeps the same profile and progress.');
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (): Promise<void> => {
    if (!/^\d{6}$/.test(code.trim())) {
      setMessage('Enter the six-digit code from the email.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await verifyEmailUpgrade(email, code);
      useSessionMetaStore.getState().setSyncMeta({ accountState: 'saved' });
      await syncNow();
      setMessage('Profile saved. This device will keep syncing automatically.');
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  // Only configured builds reach this card, so until the sync runtime reports an account the honest
  // state is "connecting" (never the old unconfigured-backend copy, which only a developer needed).
  const status = meta.accountState === 'saved'
    ? { label: 'PROFILE SAVED', color: colors.success, body: 'Progress syncs automatically. Your login session stays in Supabase secure session storage, never in the game stores.' }
    : meta.accountState === 'anonymous'
      ? { label: 'INSTANT PROFILE', color: colors.xpGold, body: 'Your private anonymous profile is syncing now. Add an email whenever you want to recover it on another device.' }
      : { label: 'CONNECTING', color: colors.info, body: 'Local study stays available while online backup connects.' };

  return (
    <View style={styles.card} accessibilityLabel={`Account and sync. ${status.label}`}>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: status.color }]} />
        <AppText tier="label" size="sm" color={status.color}>{status.label}</AppText>
        {meta.pendingSyncCount > 0 ? (
          <AppText tier="label" size="xs" color={colors.textMuted}>{`${meta.pendingSyncCount} queued`}</AppText>
        ) : null}
      </View>
      <AppText tier="display" size="xl" color={colors.textPrimary}>Account &amp; backup</AppText>
      <AppText tier="body" size="sm" color={colors.textSecondary}>{status.body}</AppText>
      {meta.syncMessage ? <AppText tier="body" size="sm" color={colors.info}>{meta.syncMessage}</AppText> : null}

      {meta.backendConfigured && meta.accountState === 'anonymous' ? (
        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            accessibilityLabel="Email address for saving this profile"
            style={styles.input}
          />
          {codeSent ? (
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              accessibilityLabel="Six-digit email verification code"
              style={styles.input}
            />
          ) : null}
          <Button3D
            label={codeSent ? 'Verify and save profile' : 'Email me a 6-digit code'}
            disabled={busy}
            onPress={() => void (codeSent ? verifyCode() : sendCode())}
          />
          {codeSent ? (
            <Button3D
              label="Send a fresh code"
              disabled={busy}
              color={colors.muted}
              shadowColor={colors.border}
              textColor={colors.textPrimary}
              onPress={() => void sendCode()}
            />
          ) : null}
        </View>
      ) : null}

      {meta.backendConfigured ? (
        <Button3D
          label={meta.syncState === 'syncing' ? 'Syncing…' : 'Sync now'}
          disabled={busy || meta.syncState === 'syncing'}
          color={colors.gemTeal}
          shadowColor="#226F6D"
          onPress={() => void syncNow()}
        />
      ) : null}
      {message ? <AppText tier="body" size="sm" color={colors.textSecondary}>{message}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 2, borderColor: colors.gemTeal },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  form: { gap: spacing.sm },
  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 17,
  },
});
