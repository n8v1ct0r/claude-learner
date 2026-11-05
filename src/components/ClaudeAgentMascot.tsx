import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/design/motion';
import { colors } from '@/design/tokens';

// The full contextual pose set (PLAN-rev2 D21 / ROADMAP M11). Older call sites use idle/celebrate/
// thinking/peek; sleepy, curious, and legendary are added for welcome-back, streak, and the legendary
// ceremony. `celebrate` keeps its name as the primary "cheer/bounce" mood.
export type ClaudeAgentMood =
  | 'idle'
  | 'celebrate'
  | 'thinking'
  | 'peek'
  | 'curious'
  | 'sleepy'
  | 'legendary';

export interface ClaudeAgentMascotProps {
  /** Width in points. The reference pixel sprite is 128 × 94. */
  size?: number;
  mood?: ClaudeAgentMood;
  accessibilityLabel?: string;
}

// Which transform channel the looping oscillator drives, its peak magnitude (in reference px, or degrees
// for the tilt), and its half-period. Reduce-motion collapses ALL of this to a static pose (GC-10).
type Channel = 'y' | 'x' | 'rot';
const POSE: Record<ClaudeAgentMood, { channel: Channel; amp: number; duration: number; glow: boolean }> = {
  idle: { channel: 'y', amp: -3, duration: 1100, glow: false }, // gentle breathe
  celebrate: { channel: 'y', amp: -8, duration: 260, glow: false }, // fast bounce / cheer
  thinking: { channel: 'rot', amp: -4, duration: 1400, glow: false }, // head tilt
  peek: { channel: 'y', amp: -2, duration: 1500, glow: false }, // pops up from the bottom edge
  curious: { channel: 'x', amp: 4, duration: 1600, glow: false }, // side-to-side parallax
  sleepy: { channel: 'y', amp: -1.5, duration: 2200, glow: false }, // slow, shallow breathe
  legendary: { channel: 'y', amp: -6, duration: 520, glow: true }, // bounce + shimmer halo
};

/**
 * A scalable, native reconstruction of the terracotta Claude Code agent supplied by the user.
 * Keeping it as Views instead of a tiny bitmap preserves the crisp pixel silhouette at every iPhone
 * density and lets one owned component carry the full pose set — idle, cheer, think, peek, curious,
 * sleepy, and legendary — with every motion gated by reduce-motion (falling back to a static pose).
 */
export function ClaudeAgentMascot({
  size = 96,
  mood = 'idle',
  accessibilityLabel = 'Claude Code agent mascot',
}: ClaudeAgentMascotProps) {
  const reduceMotion = useReduceMotion();
  const bob = useSharedValue(0);
  const glow = useSharedValue(0);
  const pose = POSE[mood];
  const p = (value: number): number => (value / 128) * size;
  const height = p(94);
  const body = colors.clay400;
  const ink = colors.bg;

  useEffect(() => {
    if (reduceMotion) {
      bob.value = 0;
      glow.value = pose.glow ? 0.5 : 0; // static halo for legendary, still no animation
      return;
    }
    const amp = pose.channel === 'rot' ? pose.amp : (pose.amp / 128) * size;
    bob.value = withRepeat(
      withSequence(
        withTiming(amp, { duration: pose.duration }),
        withTiming(0, { duration: pose.duration }),
      ),
      -1,
      false,
    );
    glow.value = pose.glow
      ? withRepeat(
          withSequence(
            withDelay(0, withTiming(0.75, { duration: 640 })),
            withTiming(0.3, { duration: 640 }),
          ),
          -1,
          false,
        )
      : 0;
  }, [bob, glow, pose, reduceMotion, size]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [] };
    if (pose.channel === 'x') return { transform: [{ translateX: bob.value }] };
    if (pose.channel === 'rot') return { transform: [{ rotate: `${bob.value}deg` }] };
    return { transform: [{ translateY: bob.value }] };
  }, [reduceMotion, pose.channel]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: pose.glow ? glow.value : 0 }), [pose.glow]);

  const armsUp = mood === 'celebrate' || mood === 'legendary';
  const armY = armsUp ? 24 : 49;
  const headY = mood === 'peek' ? 36 : 16;
  const legY = mood === 'peek' ? 96 : 73;
  // Eye height encodes expression: squint while thinking, nearly-shut while sleepy, open otherwise.
  const eyeHeight = mood === 'sleepy' ? 4 : mood === 'thinking' ? 8 : 17;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID="claude-mascot"
      style={{ width: size, height, overflow: 'hidden' }}
    >
      {/* Legendary shimmer halo — a warm gold glow behind the agent. Static (dim) under reduce-motion. */}
      {pose.glow ? (
        <Animated.View
          pointerEvents="none"
          testID="claude-mascot-halo"
          style={[
            {
              position: 'absolute',
              left: (size - p(120)) / 2,
              top: (height - p(120)) / 2,
              width: p(120),
              height: p(120),
              borderRadius: p(60),
              backgroundColor: colors.xpGold,
            },
            haloStyle,
          ]}
        />
      ) : null}

      <Animated.View style={[{ width: size, height }, animatedStyle]}>
        {/* side arms */}
        <View style={{ position: 'absolute', left: p(3), top: p(armY), width: p(18), height: p(17), backgroundColor: body }} />
        <View style={{ position: 'absolute', left: p(107), top: p(armY), width: p(18), height: p(17), backgroundColor: body }} />

        {/* square head/body */}
        <View style={{ position: 'absolute', left: p(18), top: p(headY), width: p(92), height: p(58), backgroundColor: body }} />

        {/* eyes */}
        <View style={{ position: 'absolute', left: p(42), top: p(headY + 17), width: p(8), height: p(eyeHeight), backgroundColor: ink }} />
        <View style={{ position: 'absolute', left: p(79), top: p(headY + 17), width: p(8), height: p(eyeHeight), backgroundColor: ink }} />

        {/* three little agent legs */}
        {[34, 50, 84].map((left) => (
          <View key={left} style={{ position: 'absolute', left: p(left), top: p(legY), width: p(8), height: p(20), backgroundColor: body }} />
        ))}
      </Animated.View>
    </View>
  );
}
