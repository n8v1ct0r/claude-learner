// src/features/lesson-player/OptionCard.tsx
//
// A single tappable answer option — the shared building block for the mc/multi/cloze/order renderers.
// States are conveyed by color AND an icon/prefix AND text weight (never color alone, GC-10): idle,
// selected, correct (sage + check), and incorrect (warm amber + dot — deliberately NO harsh red,
// no-shame rule). It is a real button with an accessibilityRole/label and a ≥44pt target.
//
// VoiceOver, for answer options (the renderers pass `picked`): only the learner's own pick is
// "selected" (a pending choice, or their graded choice), and once graded the label says the result in
// words ("Correct answer", "Your answer, not quite"), so the sage/amber colours are never the only
// signal. Self-assessment toggles (explain-back key points) omit `picked`: there 'correct' means
// "covered", which is the learner's own mark and reads as selected.

import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, sizes, spacing } from '@/design/tokens';

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect';

export interface OptionCardProps {
  label: string;
  state: OptionState;
  /**
   * Answer options only: whether the learner chose this option. When set, graded states are spoken
   * and only the learner's pick is selected. Omit for self-assessment toggles.
   */
  picked?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /** Optional leading marker (e.g. a blank number or step ordinal). */
  marker?: string;
}

/** The graded result in words, appended to the spoken label. */
function resultPhrase(state: OptionState, picked: boolean): string | null {
  if (state === 'correct') return picked ? 'Correct, your answer.' : 'Correct answer.';
  if (state === 'incorrect') return 'Your answer, not quite.';
  return null;
}

function borderFor(state: OptionState): string {
  switch (state) {
    case 'selected':
      return colors.clay400;
    case 'correct':
      return colors.success;
    case 'incorrect':
      return colors.review;
    default:
      return colors.border;
  }
}

function glyphFor(state: OptionState): string {
  switch (state) {
    case 'correct':
      return '✓';
    case 'incorrect':
      return '•';
    case 'selected':
      return '◉';
    default:
      return '○';
  }
}

function glyphColorFor(state: OptionState): string {
  switch (state) {
    case 'correct':
      return colors.success;
    case 'incorrect':
      return colors.review;
    case 'selected':
      return colors.clay400;
    default:
      return colors.textMuted;
  }
}

export function OptionCard({ label, state, picked, disabled = false, onPress, marker }: OptionCardProps) {
  const answerOption = picked !== undefined;
  // A wrong ('incorrect') option is only ever marked when the learner chose it.
  const isPick = answerOption
    ? state === 'selected' || state === 'incorrect' || (state === 'correct' && picked)
    : state === 'selected' || state === 'correct';
  const result = answerOption ? resultPhrase(state, picked) : null;
  const spoken = marker ? `${marker}. ${label}` : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={result ? `${spoken.replace(/\.+$/, '')}. ${result}` : spoken}
      accessibilityState={{ disabled, selected: isPick }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: sizes.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.card,
        borderWidth: 2,
        borderColor: borderFor(state),
        backgroundColor: colors.bgElevated,
        opacity: disabled && state === 'idle' ? 0.6 : 1,
      }}
    >
      <AppText tier="label" size="lg" color={glyphColorFor(state)}>
        {glyphFor(state)}
      </AppText>
      {marker ? (
        <View
          style={{
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            backgroundColor: colors.bg,
          }}
        >
          <AppText tier="label" size="sm" color={colors.textSecondary}>
            {marker}
          </AppText>
        </View>
      ) : null}
      <AppText tier="body" size="base" color={colors.textPrimary} style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}
