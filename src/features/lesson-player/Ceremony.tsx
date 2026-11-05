// src/features/lesson-player/Ceremony.tsx
//
// The lesson-end ceremony — the addictive part, and OPTIMISTIC by contract (GC-03a): every number it
// shows is already computed (the XP engine ran synchronously on completion; the chest tier already
// reflects whether explain-back was done). It NEVER awaits a grading promise. The reveal is pure juice
// on top of settled values, gated on reduce-motion (with reduced motion everything is shown instantly).
//
// v2 staging: mascot celebrate/legendary pose + confetti → XP count-up → accuracy/combo (with a
// legendary callout) → chest open (tier) → streak tick, each stage a soft reveal. SFX + haptics fire on
// entry. The whole thing is SKIPPABLE with one tap (a "Skip" button while it plays, or a tap anywhere on
// the celebration), and reduce-motion renders the final state instantly with a static congratulatory
// frame. The results are never wrapped in a pressable, so VoiceOver can read XP, accuracy, chest and
// streak one by one; with VoiceOver running the final state is shown straight away.

import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { isDemoGrading } from '@/api/demo-grading';
import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { colors, radii, spacing, touchable } from '@/design/tokens';
import { useReduceMotion } from '@/design/motion';
import { Celebration } from '@/juice/Celebration';
import { celebrate as celebrateHaptic } from '@/juice/haptics';
import { playChest, playFanfare, playLegendary } from '@/juice/sfx';
import { streakMilestone } from '@/juice/streak-milestone';

import type { ChestTier } from '@/state/lesson-session';
import { useGameStore } from '@/state/game';
import { useProgressStore } from '@/state/progress';
import { useSettingsStore } from '@/state/settings';
import { enableLocalReminders } from '@/services/local-notifications';
import type { LessonXpBreakdown } from '@/engine/xp';

const CHEST_LABEL: Record<ChestTier, string> = {
  bronze: 'Bronze chest · keep strengthening the gaps',
  silver: 'Silver chest · full teach-back coverage',
};

export interface CeremonyProps {
  xp: LessonXpBreakdown;
  chestTier: ChestTier;
  accuracy: number;
  conceptCoverage: number;
  comboBest: number;
  streakCurrent: number;
  onDone: () => void;
}

/**
 * Count a number from 0 → target over ~0.65s. Jumps straight to target when `instant` (reduce-motion or
 * skipped). The displayed value is DERIVED from an animated 0→1 progress, so the effect only ever calls
 * setState asynchronously (inside a timer) — never synchronously in its body. `done` is true once the
 * count has landed (the last and longest stage of the reveal).
 */
function useCountUp(target: number, instant: boolean): { value: number; done: boolean } {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (instant || target <= 0) return; // derived value already resolves to the target
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = Date.now();
    const duration = 650;
    const tick = () => {
      if (cancelled) return;
      const t = Math.min(1, (Date.now() - start) / duration);
      setProgress(t);
      if (t < 1) timer = setTimeout(tick, 32);
    };
    timer = setTimeout(tick, 32);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [target, instant]);
  if (instant || target <= 0) return { value: target, done: true };
  return { value: Math.round(target * progress), done: progress >= 1 };
}

/**
 * Whether VoiceOver (or TalkBack) is running. Native only: react-native-web's check always reports a
 * screen reader, which would silently switch the web celebration off.
 */
function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (value: boolean) => setEnabled(value));
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}

function Reveal({ delay, instant, children }: { delay: number; instant: boolean; children: ReactNode }) {
  const progress = useSharedValue(instant ? 1 : 0);
  useEffect(() => {
    progress.value = instant ? 1 : withDelay(delay, withTiming(1, { duration: 220 }));
  }, [delay, instant, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: instant ? 0 : (1 - progress.value) * 10 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function Ceremony({ xp, chestTier, accuracy, conceptCoverage, comboBest, streakCurrent, onDone }: CeremonyProps) {
  const reduceMotion = useReduceMotion();
  const screenReader = useScreenReaderEnabled();
  const [skipped, setSkipped] = useState(false);
  // VoiceOver reads the settled results; a staged visual reveal only gets in its way.
  const instant = reduceMotion || skipped || screenReader;

  const lastReward = useGameStore((state) => state.lastReward);
  const completedLessonCount = useProgressStore((state) => state.completedLessonIds.length);
  const notificationsPrimed = useSettingsStore((state) => state.notificationsPrimed);

  const streakMoment = streakMilestone(streakCurrent);
  // A flawless lesson (or a legendary-length streak) earns the legendary treatment: glow pose + shimmer.
  const legendary = (accuracy >= 1 && conceptCoverage >= 1) || Boolean(streakMoment?.legendary);

  const { value: displayedXp, done: countedUp } = useCountUp(xp.total, instant);
  // The Skip control exists only while there is something left to skip.
  const playing = !instant && !countedUp;

  const pop = useSharedValue(reduceMotion ? 1 : 0.6);
  useEffect(() => {
    pop.value = reduceMotion ? 1 : withSpring(1, { damping: 9, stiffness: 160 });
  }, [reduceMotion, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  // Entry juice — fire once. SFX/haptics are settings-gated and safe no-ops when disabled/unavailable.
  useEffect(() => {
    celebrateHaptic();
    if (legendary) playLegendary();
    else playFanfare();
    if (instant) return;
    // Chest-open cue lands as the chest reveal opens.
    const timer = setTimeout(() => playChest(), 260);
    return () => clearTimeout(timer);
    // Intentionally mount-only: the ceremony is shown once per completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* The results are plain, separately readable elements — never children of a pressable (which
            VoiceOver would collapse into one "Skip celebration" button). A tap anywhere still skips:
            a touch handler is not an accessibility element. */}
        <ScrollView
          testID="ceremony-results"
          onTouchEnd={() => setSkipped(true)}
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, alignItems: 'center', paddingTop: spacing.xl * 2 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute' }}>
              <Celebration play loop={false} size={220} />
            </View>
            <ClaudeAgentMascot
              size={112}
              mood={legendary ? 'legendary' : 'celebrate'}
              accessibilityLabel={legendary ? 'Claude Code agent glowing in celebration' : 'Claude Code agent celebrating'}
            />
          </View>

          <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
            {legendary ? 'Legendary lesson' : 'Lesson complete'}
          </AppText>

          {/* XP tally — counts up from 0, but the a11y label always states the settled total (GC-03a). */}
          <Animated.View style={[{ alignItems: 'center', gap: spacing.xs }, popStyle]}>
            <AppText tier="ceremony" size="5xl" color={colors.xpGold} accessibilityLabel={`${xp.total} XP earned`}>
              {`+${displayedXp}`}
            </AppText>
            <AppText tier="label" size="base" color={colors.xpGold}>
              XP
            </AppText>
          </Animated.View>

          {/* Accuracy / combo bonus (+ legendary callout). */}
          <Reveal delay={120} instant={instant}>
            <View style={{ gap: spacing.xs, alignItems: 'center' }}>
              <AppText tier="label" size="base" color={colors.textSecondary}>
                {`Accuracy ${Math.round(accuracy * 100)}%`}
              </AppText>
              <AppText tier="label" size="base" color={conceptCoverage === 1 ? colors.success : colors.xpGold}>
                {`${isDemoGrading ? 'Teach-back coverage, DEMO grading' : 'Self-assessed teach-back coverage'} ${Math.round(conceptCoverage * 100)}%`}
              </AppText>
              {xp.combo > 0 ? (
                <AppText tier="label" size="base" color={colors.success}>
                  {`Combo bonus +${xp.combo} (best streak ${comboBest})`}
                </AppText>
              ) : null}
              {xp.multiplier > 1 ? (
                <AppText tier="label" size="base" color={colors.xpGold}>
                  {`${xp.multiplier}× boost applied`}
                </AppText>
              ) : null}
              {legendary ? (
                <AppText tier="label" size="base" color={colors.xpGold} accessibilityRole="text">
                  Flawless run — legendary
                </AppText>
              ) : null}
            </View>
          </Reveal>

          {/* Chest open. */}
          <Reveal delay={220} instant={instant}>
            <View
              style={{
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.lg,
                borderRadius: radii.card,
                backgroundColor: colors.bgElevated,
                borderWidth: 2,
                borderColor: chestTier === 'silver' ? colors.gemTeal : colors.border,
              }}
            >
              <AppText tier="label" size="base" color={chestTier === 'silver' ? colors.gemTeal : colors.textSecondary}>
                {CHEST_LABEL[chestTier]}
              </AppText>
              {lastReward ? (
                <AppText tier="display" size="xl" color={colors.gemTeal} style={{ textAlign: 'center', marginTop: spacing.sm }}>
                  {`+${lastReward.gems} gems`}
                </AppText>
              ) : null}
            </View>
          </Reveal>

          {/* Streak tick (+ milestone callout when this length is a celebration threshold). */}
          <Reveal delay={320} instant={instant}>
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText tier="ceremony" size="2xl" color={colors.streakFlame}>
                  ▲
                </AppText>
                <AppText tier="label" size="lg" color={colors.streakFlame}>
                  {`${streakCurrent}-day streak`}
                </AppText>
              </View>
              {streakMoment ? (
                <AppText tier="label" size="base" color={colors.xpGold} style={{ textAlign: 'center' }}>
                  {streakMoment.message}
                </AppText>
              ) : null}
            </View>
          </Reveal>
        </ScrollView>

        {playing ? (
          <Pressable
            onPress={() => setSkipped(true)}
            accessibilityRole="button"
            accessibilityLabel="Skip celebration"
            accessibilityHint="Show the final results now"
            style={{
              ...touchable(),
              position: 'absolute',
              top: spacing.sm,
              right: spacing.lg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
            }}
          >
            <AppText tier="label" size="base" color={colors.textSecondary}>
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: spacing.xl, paddingTop: spacing.md }}>
        {/* Reminders are local iPhone notifications, so the web build never offers them. */}
        {completedLessonCount === 1 && !notificationsPrimed && Platform.OS !== 'web' ? (
          <View style={{ gap: spacing.sm }}>
            <AppText tier="body" size="sm" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              Want a gentle reminder near your usual study time? We schedule locally on this iPhone and pause after five quiet days.
            </AppText>
            {/* The ceremony closes at once; if the OS work fails, the next app open schedules again. */}
            <Button3D label="Enable gentle reminders" onPress={() => { enableLocalReminders().catch(() => {}); onDone(); }} />
            <Button3D label="Not now" color={colors.muted} shadowColor={colors.border} textColor={colors.textPrimary} onPress={() => { useSettingsStore.getState().setNotificationsPrimed(true); onDone(); }} />
          </View>
        ) : (
          <Button3D label="Done" onPress={onDone} accessibilityHint="Back to your path" />
        )}
      </View>
    </View>
  );
}
