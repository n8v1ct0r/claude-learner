// src/features/lesson-player/ExplainBack.tsx
//
// The Feynman explain-back — the DEFAULT lesson path (GC-15a). Two steps:
//   1. "Teach the agent in one sentence: <prompt>" with a typed input (dictation is deferred, D16). A
//      live "N / 1000" character counter softens to a "keep it tight" nudge at 800 and hard-stops at
//      1000 (the server rejects longer transcripts, GC-09). A primary "Teach it" submit, plus a
//      VISIBLE but secondary "skip" link that requires an explicit tap (opt-out, never opt-in) — the
//      parent emits a distinct analytics event on skip vs complete.
//   2. Self-assessment + OPTIONAL live grading (GC-09). The lesson's canonical key points appear
//      immediately as a tappable self-check (exactly as before). In the BACKGROUND a grader may return
//      a verdict: while it is in flight a quiet "checking…" caption shows and nothing is blocked; when
//      it lands, the covered points are pre-marked and the agent adds one coaching line. If grading
//      never resolves (offline, timeout, quota) the screen stays in pure manual mode with no error,
//      no difference in flow, and the SAME XP. Full coverage (server- or self-assessed) upgrades the
//      chest bronze -> silver.
//
// The App Store v1.0 build is local-only (no grader at all). There the self-check IS the feature:
// the "checking…" caption never appears, so nothing hints at a check that is not coming.
//
// The key points rendered here are the lesson concept's key points; their IDs are byte-identical to the
// grader's (schema-enforced round-trip, GC-15d), so what is self-assessed is exactly what the server
// scores — which is why a server verdict can flow straight back into the same checklist and gap card.

import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { colors, radii, sizes, spacing } from '@/design/tokens';
import { DEMO_GRADING_LABEL, isDemoGrading } from '@/api/demo-grading';
import { isLocalOnlyBuild } from '@/features/account/local-only';
import {
  EXPLAIN_BACK_TRANSCRIPT_MAX,
  EXPLAIN_BACK_TRANSCRIPT_SOFT_WARN,
  type ExplainBackStatus,
  type GradingStatus,
} from '@/state/lesson-session';

import { OptionCard } from './OptionCard';
import type { KeyPoint } from '../../../content/schema/types';

export interface ExplainBackProps {
  prompt: string;
  keyPoints: KeyPoint[];
  status: ExplainBackStatus;
  coveredIds: string[];
  /** Server-grading lifecycle; `idle`/`degraded` render the manual self-assessment path unchanged. */
  grading: GradingStatus;
  /** The agent's one coaching line (already no-shame filtered) when graded; null otherwise. */
  coachingHint: string | null;
  /** True only when a graded verdict left gaps AND a refine is still available this lesson. */
  canRefine: boolean;
  onSubmit: (transcript: string) => void;
  onRefine: (refinement: string) => void;
  onToggleCovered: (keyPointId: string) => void;
  onFinish: () => void;
  onSkip: () => void;
}

const inputStyle = {
  minHeight: 96,
  padding: spacing.lg,
  borderRadius: radii.card,
  borderWidth: 2,
  borderColor: colors.border,
  backgroundColor: colors.bgElevated,
  color: colors.textPrimary,
  fontFamily: 'Nunito_400Regular',
  fontSize: 16,
  textAlignVertical: 'top' as const,
};

export function ExplainBack({
  prompt,
  keyPoints,
  status,
  coveredIds,
  grading,
  coachingHint,
  canRefine,
  onSubmit,
  onRefine,
  onToggleCovered,
  onFinish,
  onSkip,
}: ExplainBackProps) {
  const [text, setText] = useState('');
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const covered = new Set(coveredIds);
  const isInput = status === 'pending';

  // Clamp in the handler (not only via maxLength) so the ceiling holds even for programmatic input.
  const onChangeText = (value: string) => setText(value.slice(0, EXPLAIN_BACK_TRANSCRIPT_MAX));
  const overSoftWarn = text.length >= EXPLAIN_BACK_TRANSCRIPT_SOFT_WARN;
  const counterColor = overSoftWarn ? colors.review : colors.textMuted;

  const submitRefine = () => {
    const trimmed = refineText.trim();
    if (trimmed.length === 0) return;
    onRefine(trimmed);
    setRefineText('');
    setRefining(false);
  };

  return (
    // "handled": with the keyboard up, the first tap on "Teach it" (or "Teach it again") reaches the
    // button instead of only dismissing the keyboard; a tap on empty space still dismisses it.
    <ScrollView
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: 'center' }}>
        <ClaudeAgentMascot size={82} mood="thinking" accessibilityLabel="Claude Code agent thinking" />
      </View>
      <AppText tier="display" size="xl" color={colors.textPrimary} accessibilityRole="header">
        Teach the agent in one sentence
      </AppText>
      <AppText tier="body" size="base" color={colors.textSecondary}>
        {prompt}
      </AppText>

      {isInput ? (
        <>
          <TextInput
            accessibilityLabel="Your one-sentence explanation"
            placeholder="Type your explanation…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={onChangeText}
            maxLength={EXPLAIN_BACK_TRANSCRIPT_MAX}
            multiline
            style={inputStyle}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }}>
            <AppText tier="label" size="sm" color={counterColor}>
              {overSoftWarn ? 'keep it tight — one sentence' : ' '}
            </AppText>
            <AppText
              tier="label"
              size="sm"
              color={counterColor}
              accessibilityLabel={`${text.length} of ${EXPLAIN_BACK_TRANSCRIPT_MAX} characters`}
            >
              {`${text.length} / ${EXPLAIN_BACK_TRANSCRIPT_MAX}`}
            </AppText>
          </View>
          <Button3D
            label="Teach it"
            disabled={text.trim().length === 0}
            onPress={() => onSubmit(text.trim())}
            accessibilityHint="Submit your explanation, then check which points you covered"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip explain-back"
            accessibilityHint="Skip teaching this one — you can always come back"
            onPress={onSkip}
            style={{ minHeight: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText tier="label" size="base" color={colors.textSecondary}>
              Skip for now
            </AppText>
          </Pressable>
        </>
      ) : (
        <>
          <CoverageMeter
            covered={covered.size}
            total={keyPoints.length}
            checking={(!isLocalOnlyBuild || isDemoGrading) && grading === 'pending'}
          />

          <AppText tier="label" size="sm" color={colors.textSecondary}>
            {grading === 'graded'
              ? 'Here’s how it landed — tap any point to adjust. Full coverage earns the silver chest.'
              : 'Self-check your explanation. Mark only the points you clearly said — full coverage earns the silver chest.'}
          </AppText>

          <View style={{ gap: spacing.sm }}>
            {keyPoints.map((point) => (
              <OptionCard
                key={point.id}
                label={point.text}
                state={covered.has(point.id) ? 'correct' : 'idle'}
                onPress={() => onToggleCovered(point.id)}
              />
            ))}
          </View>

          {isDemoGrading && grading === 'graded' ? (
            <AppText tier="label" size="sm" color={colors.review} testID="demo-grading-label">
              {DEMO_GRADING_LABEL}
            </AppText>
          ) : null}

          {grading === 'graded' && coachingHint ? (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                padding: spacing.lg,
                borderRadius: radii.card,
                backgroundColor: colors.bgElevated,
                borderLeftWidth: 4,
                borderLeftColor: colors.info,
              }}
            >
              <ClaudeAgentMascot size={36} mood="idle" accessibilityLabel="Claude Code agent" />
              <AppText tier="body" size="base" color={colors.textPrimary} style={{ flex: 1 }}>
                {coachingHint}
              </AppText>
            </View>
          ) : null}

          {canRefine && !refining ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add the missing bit"
              accessibilityHint="Type one more line to cover what you missed, then re-check"
              onPress={() => setRefining(true)}
              style={{ minHeight: sizes.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText tier="label" size="base" color={colors.info}>
                Add the missing bit
              </AppText>
            </Pressable>
          ) : null}

          {refining ? (
            <View style={{ gap: spacing.md }}>
              <TextInput
                accessibilityLabel="Your added detail"
                placeholder="Add the part you missed…"
                placeholderTextColor={colors.textMuted}
                value={refineText}
                onChangeText={(value) => setRefineText(value.slice(0, EXPLAIN_BACK_TRANSCRIPT_MAX))}
                maxLength={EXPLAIN_BACK_TRANSCRIPT_MAX}
                multiline
                style={inputStyle}
              />
              <Button3D
                label="Teach it again"
                disabled={refineText.trim().length === 0}
                onPress={submitRefine}
                accessibilityHint="Re-check your explanation with the added detail"
              />
            </View>
          ) : null}

          <Button3D
            label="See how I did"
            onPress={onFinish}
            accessibilityHint="Show the points you covered and any gaps"
          />
        </>
      )}
    </ScrollView>
  );
}

/** A slim coverage bar (color + width + label — never color alone, GC-10) with a quiet checking state. */
function CoverageMeter({ covered, total, checking }: { covered: number; total: number; checking: boolean }) {
  const ratio = total > 0 ? covered / total : 0;
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tier="label" size="sm" color={colors.textSecondary}>
          {`Coverage: ${covered} of ${total}`}
        </AppText>
        {checking ? (
          <AppText tier="label" size="sm" color={colors.info} accessibilityLabel="Checking your explanation">
            Checking…
          </AppText>
        ) : null}
      </View>
      <View
        accessibilityRole="progressbar"
        style={{ height: 10, borderRadius: radii.pill, backgroundColor: colors.bgElevated, overflow: 'hidden' }}
      >
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            borderRadius: radii.pill,
            backgroundColor: colors.success,
          }}
        />
      </View>
    </View>
  );
}
