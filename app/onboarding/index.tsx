// app/onboarding/index.tsx — first-run onboarding (PLAN-rev2 §4.7 #7, choice-minimized / ADHD-first).
//
// Two taps to real content: pick an exam date (or "just exploring"), pick a daily goal, then STRAIGHT
// into the first path lesson. No placement quiz, no signup wall — anonymous auth runs invisibly under
// SyncBootstrap (which no-ops without env). Notification priming and the save-progress email prompt
// are deliberately NOT here: they fire later, after value is demonstrated (priming lives in the
// lesson-end Ceremony after the first lesson; the account/email surface lives on Profile).
//
// The screen is a thin view over the pure flow machine (src/features/onboarding/onboarding-flow.ts).
// The persisted `onboardingStep` cursor is the source of truth, so the flow is RESUMABLE across a
// cold kill and "skip forward" never blocks the learner from reaching content.
//
// Step 1 ends with the required affiliation line. The column scrolls, so on a 4.7" iPhone or at large
// Dynamic Type sizes that line and the Skip button stay reachable instead of being clipped.
//
// On a fresh install the native splash covers the swap from the Learn tab to this screen and lifts only
// after the native stack has finished showing it (onboarding-shown.ts, read by OnboardingGate), so the
// Learn tab never shows through for a frame (IB-5).
//
// A learner who has already finished onboarding can still land here (the claudelearner://onboarding
// deep link, or a restored route). There is nothing left to set up, so the screen sends them back to
// the Learn tab instead of replaying a step (shouldLeaveOnboarding).

import { useNavigation, useRouter, type Href, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { useContentDbWhenReady } from '@/db/content-provider';
import type { ContentReader } from '@/db/content-reader';
import { colors, sizes, spacing } from '@/design/tokens';
import { AFFILIATION_LINE, PRACTICE_CONTENT_LINE } from '@/features/account/about';
import {
  DAILY_GOAL_OPTIONS,
  EXAM_DATE_PRESETS,
  ONBOARDING_STEPS,
  examDateIso,
  onboardingStepIndex,
  shouldLeaveOnboarding,
} from '@/features/onboarding/onboarding-flow';
import { reportOnboardingShown } from '@/features/onboarding/onboarding-shown';
import { useSettingsStore } from '@/state/settings';

export default function OnboardingScreen() {
  // Onboarding shows no lesson content, so it does not wait for it (the web build loads content in the
  // background); it needs the reader only to find the first lesson when the learner finishes.
  const content = useContentDbWhenReady();
  const waitingForContent = useRef(false);
  const router = useRouter();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const step = useSettingsStore((state) => state.onboardingStep);
  const [now] = useState(() => Date.now());
  // True once THIS visit finishes onboarding: its own exit (the first lesson over the Learn tab) is then
  // already queued, so the completed cursor must not also send the learner back to Learn.
  const [finishedHere, setFinishedHere] = useState(false);
  const leave = shouldLeaveOnboarding({ step, finishedHere });

  // The native stack emits transitionEnd (closing: false) from this screen's viewDidAppear, after UIKit has
  // removed the screen it replaced: the first moment the splash can lift without showing the Learn tab.
  useEffect(
    () =>
      navigation.addListener('transitionEnd', (event) => {
        if (!event.data.closing) reportOnboardingShown();
      }),
    [navigation],
  );

  // Already finished before this visit: back to the Learn tab underneath. dismissTo (not replace) so the
  // stack never holds two Learn tabs, and nothing is replayed: no step, no first lesson, no energy spent.
  useEffect(() => {
    if (leave) router.dismissTo('/' as Href);
  }, [leave, router]);

  // Finish onboarding and deep-link the learner into the very first lesson of the global spine. The
  // lesson route's typed entry is codegen'd on `expo start`/`export`, so widen-then-cast keeps the
  // typecheck stable before that runs (the route exists on disk at app/lesson/[lessonId].tsx).
  //
  // Stack shape matters: the gate replaced the cold-open screen with /onboarding, so replacing
  // straight into the lesson would leave the lesson as the ONLY history entry — and the ceremony's
  // router.back() would then be an unhandled GO_BACK (blank dead-end after the very first lesson).
  // Rebuild a sane stack instead: home beneath, first lesson pushed on top, so every lesson exit lands
  // on the Path. dismissTo('/') returns to the Learn tab already underneath (a deep-link cold open
  // keeps the tabs below via initialRouteName) and falls back to a replace when it is absent, so the
  // stack never holds two Learn tabs (a duplicate the edge-swipe would pop back into).
  //
  // On native the reader is always open here, so this runs synchronously. On web, if the content is
  // still loading when the learner finishes, it runs once it is in (or without a first lesson if the
  // load failed: the Learn tab then shows the "refresh" message).
  const finishWith = (reader: ContentReader | null): void => {
    setFinishedHere(true);
    useSettingsStore.getState().setOnboardingStep('complete');
    const first = reader?.getFirstLesson();
    router.dismissTo('/' as Href);
    if (first) router.push(`/lesson/${first.id}` as string as Href);
  };
  const finish = (): void => {
    if (content.reader) {
      finishWith(content.reader);
      return;
    }
    if (waitingForContent.current) return; // a second tap while waiting must not push a second lesson
    waitingForContent.current = true;
    void content.ready().then(finishWith, () => finishWith(null));
  };

  const chooseExamDate = (days: number | null): void => {
    useSettingsStore.getState().setExamDate(examDateIso(now, days));
    useSettingsStore.getState().advanceOnboarding();
  };

  const chooseDailyGoal = (minutes: number): void => {
    useSettingsStore.getState().setDailyGoalMinutes(minutes);
    finish();
  };

  // Leaving for the Learn tab: render nothing rather than a step the learner has already answered.
  if (leave) return null;

  const stepNumber = onboardingStepIndex(step) + 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }}>
          <ClaudeAgentMascot size={96} mood="peek" accessibilityLabel="Claude Code study agent welcoming you" />
          <AppText tier="label" size="sm" color={colors.clay400} accessibilityLabel={`Step ${stepNumber} of ${ONBOARDING_STEPS.length}`}>
            {`STEP ${stepNumber} OF ${ONBOARDING_STEPS.length}`}
          </AppText>
        </View>

        {step === 'exam-date' ? (
          <View style={{ flex: 1, gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
                When is your exam?
              </AppText>
              <AppText tier="body" size="base" color={colors.textSecondary}>
                This sets a gentle pace. You can change it anytime, or just explore with no date at all.
              </AppText>
            </View>
            <View style={{ gap: spacing.md }}>
              {EXAM_DATE_PRESETS.map((preset) => (
                <Button3D
                  key={preset.key}
                  label={preset.label}
                  color={preset.days === null ? colors.muted : colors.clay400}
                  shadowColor={preset.days === null ? colors.border : colors.clayPressed}
                  textColor={preset.days === null ? colors.textPrimary : colors.textOnAccent}
                  onPress={() => chooseExamDate(preset.days)}
                  accessibilityHint="Sets your study pace and moves to the next step"
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
                How much time feels good each day?
              </AppText>
              <AppText tier="body" size="base" color={colors.textSecondary}>
                Pick a rhythm you can keep. Quieter days always cost nothing.
              </AppText>
            </View>
            <View style={{ gap: spacing.md }}>
              {DAILY_GOAL_OPTIONS.map((minutes) => (
                <Button3D
                  key={minutes}
                  label={`${minutes} minutes a day`}
                  color={minutes === 10 ? colors.clay400 : colors.muted}
                  shadowColor={minutes === 10 ? colors.clayPressed : colors.border}
                  textColor={minutes === 10 ? colors.textOnAccent : colors.textPrimary}
                  onPress={() => chooseDailyGoal(minutes)}
                  accessibilityHint="Sets your daily goal and starts your first lesson"
                />
              ))}
            </View>
          </View>
        )}

        {/* Skip forward — onboarding never blocks the path to content. */}
        <View style={{ minHeight: sizes.minTouchTarget }}>
          <Button3D
            label="Skip for now"
            color={colors.bgElevated}
            shadowColor={colors.border}
            textColor={colors.textSecondary}
            onPress={finish}
            accessibilityHint="Skips setup and starts your first lesson"
          />
        </View>

        {step === 'exam-date' ? (
          <AppText tier="body" size="sm" color={colors.textMuted} style={{ textAlign: 'center' }}>
            {AFFILIATION_LINE}
          </AppText>
        ) : null}
        <AppText tier="body" size="sm" color={colors.textMuted} style={{ textAlign: 'center' }} testID="practice-content-line">
          {PRACTICE_CONTENT_LINE}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}
