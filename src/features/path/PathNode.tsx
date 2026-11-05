// src/features/path/PathNode.tsx
//
// One node on the Duolingo trail. Presentational: it takes a PathNode from the pure path-model and an
// onPress dispatcher, and renders the right Clay treatment per (type, status). The single frontier
// ('current') lesson pulses — a soft ring that scales/fades on a loop, gated on useReduceMotion() so
// it's completely still when the learner asked for reduced motion (GC-10).
//
// Colour language (PLAN-rev2 §4.1 — no harsh red anywhere): completed → success green; current →
// primary clay; locked → flat elevated surface; chest → gem teal; legendary → XP gold; review → the
// amber "review" token. Every node is a ≥44pt Pressable with an accessible label + disabled state.

import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useReduceMotion } from '@/design/motion';
import { colors, radii, sizes, spacing, touchable } from '@/design/tokens';

import type { PathNode as PathNodeModel, PathNodeStatus, PathNodeType } from './path-model';

const NODE_SIZE = 56;

/** Glyphs are geometric symbols (not emoji): number for lessons, and one mark per checkpoint type. */
const TYPE_GLYPH: Record<Exclude<PathNodeType, 'lesson'>, string> = {
  chest: '◆',
  legendary: '★',
  review: '↻',
};

interface Face {
  bg: string;
  glyphColor: string;
  border: string;
}

function faceFor(node: PathNodeModel): Face {
  const locked = node.status === 'locked';
  if (locked) {
    return { bg: colors.bgElevated, glyphColor: colors.textMuted, border: colors.border };
  }
  switch (node.type) {
    case 'lesson':
      return node.status === 'completed'
        ? { bg: colors.success, glyphColor: colors.textOnAccent, border: colors.success }
        : { bg: colors.clay400, glyphColor: colors.textOnAccent, border: colors.clay400 };
    case 'chest':
      return { bg: colors.gemTeal, glyphColor: colors.textOnAccent, border: colors.gemTeal };
    case 'legendary':
      return { bg: colors.xpGold, glyphColor: colors.textOnAccent, border: colors.xpGold };
    case 'review':
      return { bg: colors.review, glyphColor: colors.textOnAccent, border: colors.review };
  }
}

/** A lesson node shows its number; checkpoint nodes show their type glyph. */
function glyphFor(node: PathNodeModel): string {
  if (node.type === 'lesson') {
    return node.status === 'completed' ? '✓' : String(node.lessonNumber ?? '');
  }
  return TYPE_GLYPH[node.type];
}

/**
 * Human-readable state fragment for the accessibility label. The model's 'completed' status means a
 * finished LESSON, but for a chest/legendary/review checkpoint it means "unlocked" (path-model.ts),
 * so only checkpoints read as "available".
 */
function stateWord(node: PathNodeModel): string {
  const status: PathNodeStatus = node.status;
  if (status === 'completed') return node.type === 'lesson' ? 'completed' : 'available';
  return status;
}

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.35, { duration: 900 }), -1, true);
    opacity.value = withRepeat(withTiming(0, { duration: 900 }), -1, true);
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: radii.pill,
          backgroundColor: colors.clay400,
        },
        style,
      ]}
    />
  );
}

export interface PathNodeProps {
  node: PathNodeModel;
  /** Called only when the node is actionable (not locked). */
  onPress: (node: PathNodeModel) => void;
}

export function PathNode({ node, onPress }: PathNodeProps) {
  const reduceMotion = useReduceMotion();
  const actionable = node.status !== 'locked';
  const face = faceFor(node);
  const showPulse = node.status === 'current' && !reduceMotion;

  const titleColor =
    node.status === 'locked'
      ? colors.textMuted
      : node.type === 'lesson'
        ? colors.textPrimary
        : colors.textSecondary;

  return (
    <Pressable
      onPress={actionable ? () => onPress(node) : undefined}
      disabled={!actionable}
      accessibilityRole="button"
      accessibilityLabel={`${node.title}. ${stateWord(node)}.`}
      accessibilityHint={node.subtitle}
      accessibilityState={{ disabled: !actionable }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, ...touchable() }}
    >
      <View style={{ width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {showPulse ? <PulseRing /> : null}
        <View
          style={{
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: radii.pill,
            backgroundColor: face.bg,
            borderWidth: node.status === 'locked' ? 2 : 0,
            borderColor: face.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText tier="display" size="xl" color={face.glyphColor}>
            {glyphFor(node)}
          </AppText>
        </View>
      </View>

      <View style={{ flex: 1, minHeight: sizes.minTouchTarget, justifyContent: 'center' }}>
        <AppText tier="label" size="lg" color={titleColor}>
          {node.title}
        </AppText>
        <AppText tier="body" size="sm" color={colors.textMuted}>
          {node.subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}
