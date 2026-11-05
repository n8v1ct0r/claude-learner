import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { lightImpact } from '@/design/haptics';
import { colors, radii, sizes, spacing, touchable } from '@/design/tokens';

import { AppText } from './AppText';

export type Button3DProps = {
  /** Required accessible + visible label (accessibilityRole="button" is always set). */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Face fill; defaults to the primary clay. */
  color?: string;
  /** Hard bottom shadow color (the "3D" base); defaults to the pressed clay. */
  shadowColor?: string;
  /** Text color on the face; defaults to a dark ink proven ≥5:1 on clay (contrast.mjs). */
  textColor?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const PRESS_IN = { duration: 40 };
const PRESS_OUT = { duration: 90 };

/**
 * Button3D — the chunky Duolingo-style press button (PLAN-rev2 §4.1).
 *
 * A solid clay face sits `sizes.buttonShadow` (4px) above a darker clay base. Press-in drops the
 * face by exactly that offset (translateY) so the hard bottom shadow collapses, then springs back on
 * release — driven by Reanimated. A light haptic fires on press-in, gated on the settings stub so it
 * respects the (future) user preference. Radius 16, ≥44pt touch target.
 *
 * Dynamic Type (AP-1): the face has a MINIMUM height of 52 (56 with the base) and vertical padding,
 * never a fixed height, so at accessibility text sizes the label wraps and the whole button grows
 * instead of overflowing into its neighbours. The base is pinned to the face (top offset + bottom 0),
 * so the 3D edge stays exactly `buttonShadow` deep at any height.
 */
export function Button3D({
  label,
  onPress,
  disabled = false,
  color = colors.clay400,
  shadowColor = colors.clayPressed,
  textColor = colors.textOnAccent,
  accessibilityHint,
  style,
}: Button3DProps) {
  const pressed = useSharedValue(0);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * sizes.buttonShadow }],
  }));

  // Plain handlers (not useCallback): a Reanimated shared value is meant to be mutated directly in
  // event handlers, and keeping `pressed` out of a hook dependency list satisfies the compiler's
  // immutability rule. Re-creating these tiny closures per render is free for a button.
  const handlePressIn = () => {
    pressed.value = withTiming(1, PRESS_IN);
    lightImpact();
  };

  const handlePressOut = () => {
    pressed.value = withTiming(0, PRESS_OUT);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.hitbox, disabled && styles.disabled, style]}
    >
      {/* hard bottom shadow base (offset down by buttonShadow) */}
      <View style={[styles.shadow, { backgroundColor: shadowColor }]} />
      {/* clay face that sinks onto the base on press */}
      <Animated.View style={[styles.face, { backgroundColor: color }, faceStyle]}>
        <AppText tier="label" size="lg" weight="extrabold" color={textColor} style={styles.label}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitbox: {
    ...touchable(),
    // Never shorter than the classic 52 + 4, and grows with the face.
    minHeight: sizes.buttonHeight + sizes.buttonShadow,
    justifyContent: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Exactly the face's height, offset down by buttonShadow, whatever height the label needs.
    top: sizes.buttonShadow,
    bottom: 0,
    borderRadius: radii.button,
  },
  face: {
    minHeight: sizes.buttonHeight,
    // The base shows through this gap below the face (the hitbox has no padding to reason about).
    marginBottom: sizes.buttonShadow,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: spacing.md,
  },
  label: {
    textAlign: 'center',
  },
});
