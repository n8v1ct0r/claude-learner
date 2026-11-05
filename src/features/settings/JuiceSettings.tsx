// src/features/settings/JuiceSettings.tsx — the sound/haptics/motion preference surface.
//
// The global toggles the juice layer reads: sound (src/juice/sfx.ts), haptics (src/juice/haptics.ts),
// and a pointer to the reduce-motion control. Each row is an accessible switch (role="switch" +
// accessibilityState.checked) with a ≥44pt touch target (GC-10 / WCAG 2.5.5). Copy is neutral and
// gain-framed — these are comfort controls, never framed as turning "off" something you'll miss.

import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, sizes, spacing } from '@/design/tokens';
import { celebrate as celebrateHaptic } from '@/juice/haptics';
import { playChest } from '@/juice/sfx';
import { useSettingsStore } from '@/state/settings';

/** A single labeled toggle row rendered as an accessible switch. */
function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      onPress={() => onToggle(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: sizes.minTouchTarget,
        paddingVertical: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText tier="label" size="base" color={colors.textPrimary}>
          {label}
        </AppText>
        <AppText tier="body" size="sm" color={colors.textSecondary}>
          {description}
        </AppText>
      </View>
      {/* Custom track/thumb so on/off colors come from the theme tokens. Decorative — the Pressable
          carries the switch role and state for assistive tech. */}
      <View
        style={{
          width: 52,
          height: 32,
          borderRadius: radii.pill,
          padding: 3,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
          backgroundColor: value ? colors.clay400 : colors.border,
        }}
      >
        <View style={{ width: 26, height: 26, borderRadius: radii.pill, backgroundColor: colors.textPrimary }} />
      </View>
    </Pressable>
  );
}

/** Sound + haptics preference card. Drop into any settings/profile screen. */
export function JuiceSettings() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);

  return (
    <View
      style={{
        padding: spacing.lg,
        gap: spacing.sm,
        borderRadius: radii.card,
        backgroundColor: colors.bgElevated,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <AppText tier="display" size="xl" color={colors.textPrimary}>
        Sound &amp; feel
      </AppText>
      <ToggleRow
        label="Sound effects"
        description="Gentle cues for correct answers, chests, and celebrations. Muted during timed exams."
        value={soundEnabled}
        onToggle={(next) => {
          setSoundEnabled(next);
          if (next) playChest(); // a tiny preview so the toggle is tangible
        }}
      />
      <ToggleRow
        label="Haptics"
        description="Light taps on correct answers and a celebratory buzz on chests and milestones."
        value={hapticsEnabled}
        onToggle={(next) => {
          setHapticsEnabled(next);
          if (next) celebrateHaptic();
        }}
      />
      <AppText tier="body" size="sm" color={colors.textMuted}>
        Prefer less motion? Reduce Motion in iOS Settings turns off animations here automatically.
      </AppText>
    </View>
  );
}
