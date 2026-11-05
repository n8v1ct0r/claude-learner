// src/features/lesson-player/renderers/MatchRenderer.tsx
//
// Match-pairs. Two columns: the authored prompts (left) and their answers (right, shown in a seeded
// per-question shuffle that is never the authored pairing order or its reverse, so the mapping isn't
// given away — presentation-order.ts). Interaction is tap-a-left then tap-a-right to connect them:
//   • a correct connection locks the pair in sage (✓) and fires a success haptic;
//   • a wrong connection flashes the two cells warm amber (•, never red) and clears — the learner just
//     tries again (no shame, no penalty). The wrong attempt is not graded against them.
//   • when every pair is connected the question is complete and grades correct (you cannot finish a
//     match with an incorrect pairing, so completion IS correctness — onAnswer(true)).
//
// Every cell is a real button with an accessibilityRole/label, an accessibilityState, and a ≥44pt
// target. Colour is never the sole signal — each state also carries a glyph and a border. No continuous
// animation is used (state-driven colour only), so there is nothing to gate on reduce-motion.

import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, sizes, spacing } from '@/design/tokens';
import { softImpact, successImpact } from '@/design/haptics';

import { matchAnswerPresentation } from './presentation-order';
import type { MatchQuestion } from '../../../../content/schema/types';

export interface MatchRendererProps {
  question: MatchQuestion;
  answered: boolean;
  onAnswer: (correct: boolean) => void;
}

type CellState = 'idle' | 'selected' | 'matched' | 'wrong';

function borderFor(state: CellState): string {
  switch (state) {
    case 'selected':
      return colors.clay400;
    case 'matched':
      return colors.success;
    case 'wrong':
      return colors.review;
    default:
      return colors.border;
  }
}

function glyphFor(state: CellState): string {
  switch (state) {
    case 'matched':
      return '✓';
    case 'wrong':
      return '•';
    case 'selected':
      return '◉';
    default:
      return '○';
  }
}

function glyphColorFor(state: CellState): string {
  switch (state) {
    case 'matched':
      return colors.success;
    case 'wrong':
      return colors.review;
    case 'selected':
      return colors.clay400;
    default:
      return colors.textMuted;
  }
}

interface MatchCellProps {
  label: string;
  state: CellState;
  onPress: () => void;
}

function MatchCell({ label, state, onPress }: MatchCellProps) {
  const disabled = state === 'matched';
  return (
    <Pressable
      accessibilityRole="button"
      // A locked pair says so in words; only the prompt the learner is holding is "selected".
      accessibilityLabel={state === 'matched' ? `${label}. Matched.` : label}
      accessibilityState={{ disabled, selected: state === 'selected' }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: sizes.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.card,
        borderWidth: 2,
        borderColor: borderFor(state),
        backgroundColor: colors.bgElevated,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <AppText tier="label" size="base" color={glyphColorFor(state)}>
        {glyphFor(state)}
      </AppText>
      <AppText tier="body" size="base" color={colors.textPrimary} style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function MatchRenderer({ question, answered, onAnswer }: MatchRendererProps) {
  // Right-hand answers in a deterministic per-question shuffle — never the full prompt order and never
  // its exact reverse (CS-4); a single row may still line up. Pairs are graded by pair index.
  const rightOrder = useMemo(() => matchAnswerPresentation(question), [question]);

  // The left index currently picked (awaiting a right to connect to), or null.
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  // Left indices whose pair is correctly connected (keyed by left index === the pair's own index).
  const [matched, setMatched] = useState<number[]>([]);
  // The last wrong attempt, shown amber until the next tap clears it: { left, right } as PAIR indices.
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null);

  const matchedSet = new Set(matched);

  function pickLeft(leftIndex: number): void {
    if (answered || matchedSet.has(leftIndex)) return;
    setWrong(null);
    setSelectedLeft(leftIndex);
  }

  function pickRight(rightPairIndex: number): void {
    if (answered || matchedSet.has(rightPairIndex) || selectedLeft === null) return;
    if (rightPairIndex === selectedLeft) {
      const next = [...matched, selectedLeft];
      setMatched(next);
      setSelectedLeft(null);
      setWrong(null);
      successImpact();
      if (next.length === question.pairs.length) {
        // Every pair connected correctly — a match cannot complete any other way, so this is correct.
        // The Feedback panel announces the result.
        onAnswer(true);
      } else {
        AccessibilityInfo.announceForAccessibility(`Matched. ${question.pairs.length - next.length} to go.`);
      }
    } else {
      setWrong({ left: selectedLeft, right: rightPairIndex });
      setSelectedLeft(null);
      softImpact();
      // The amber flash is visual only; say it too. No penalty — the learner just tries again.
      AccessibilityInfo.announceForAccessibility('Not a match. Try another answer.');
    }
  }

  function leftState(leftIndex: number): CellState {
    if (matchedSet.has(leftIndex)) return 'matched';
    if (wrong?.left === leftIndex) return 'wrong';
    if (selectedLeft === leftIndex) return 'selected';
    return 'idle';
  }

  function rightState(rightPairIndex: number): CellState {
    if (matchedSet.has(rightPairIndex)) return 'matched';
    if (wrong?.right === rightPairIndex) return 'wrong';
    return 'idle';
  }

  const remaining = question.pairs.length - matched.length;

  return (
    <View style={{ gap: spacing.md }}>
      <AppText tier="display" size="xl" color={colors.textPrimary}>
        {question.stem}
      </AppText>
      <AppText tier="label" size="sm" color={colors.textSecondary}>
        {answered
          ? 'All matched — nice.'
          : selectedLeft === null
            ? `Tap a term on the left, then its match. ${remaining} to go.`
            : 'Now tap its match on the right.'}
      </AppText>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          {question.pairs.map((pair, leftIndex) => (
            <MatchCell
              key={`left-${leftIndex}`}
              label={pair.left}
              state={leftState(leftIndex)}
              onPress={() => pickLeft(leftIndex)}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: spacing.sm }}>
          {rightOrder.map((pairIndex) => (
            <MatchCell
              key={`right-${pairIndex}`}
              label={question.pairs[pairIndex].right}
              state={rightState(pairIndex)}
              onPress={() => pickRight(pairIndex)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
