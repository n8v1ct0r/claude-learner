import { useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { useContentDb } from '@/db/content-provider';
import { colors, radii, spacing } from '@/design/tokens';
import { ACHIEVEMENTS } from '@/engine/achievements';
import { shouldOfferUnmute } from '@/engine/notifications';
import { computeStudyPace } from '@/engine/pacing';
import { GEM_SINKS, REWARD_RULES } from '@/engine/rewards';
import { MAX_FREEZES } from '@/engine/streak';
import { localDateInTz } from '@/engine/time';
import {
  enableLocalReminders,
  readReminderPermission,
  turnRemindersBackOn,
  type ReminderPermission,
} from '@/services/local-notifications';
import { AboutFooter } from '@/features/account/AboutFooter';
import { AccountSyncCard } from '@/features/account/AccountSyncCard';
import { JuiceSettings } from '@/features/settings/JuiceSettings';
import { useEffectiveStreak, useNow } from '@/state/live-progress';
import { useNotificationStore } from '@/state/notifications';
import { resolveTimezone, useProgressStore } from '@/state/progress';
import { sinkAvailability, useGameStore } from '@/state/game';
import { useSettingsStore } from '@/state/settings';

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/**
 * The reminders control follows the real OS permission and the reminder state — not the one-time
 * priming flag, so "Not now" at the first-lesson prompt never locks it (FT-11). After five quiet days
 * reminders rest, and 14 days later this card offers them back (V-features-4), on the live clock, so
 * the offer appears on time even while Profile stays open.
 */
function RemindersCard() {
  const primed = useSettingsStore((state) => state.notificationsPrimed);
  const reminder = useNotificationStore((state) => state.reminder);
  const now = useNow();
  // Null until the first permission read answers.
  const [permission, setPermission] = useState<ReminderPermission | null>(null);

  // Re-read on return to the foreground too: the learner may have just changed it in iOS Settings.
  useEffect(() => {
    let active = true;
    const read = (): void => {
      void readReminderPermission().then((value) => {
        if (active) setPermission(value);
      });
    };
    read();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') read();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const run = (action: () => Promise<ReminderPermission>): void => {
    // If an OS call fails, show the permission as it now stands (the next app open schedules again).
    action()
      .then(setPermission)
      .catch(() => readReminderPermission().then(setPermission, () => {}));
  };

  let body = 'Local-only reminders respect quiet hours and pause after five quiet days.';
  // Inert until the permission is known: reminders may already be on, or off in iOS Settings.
  let control: React.ReactNode = (
    <Button3D label="Enable reminders" disabled={permission === null} onPress={() => run(() => enableLocalReminders())} />
  );
  if (permission === 'unavailable') {
    body = 'Gentle reminders are available in the iPhone app.';
    control = null;
  } else if (permission === 'blocked') {
    body = 'Notifications for this app are off in iOS Settings. Turn them on there to get gentle reminders.';
    control = <Button3D label="Open Settings" onPress={() => void Linking.openSettings()} />;
  } else if (permission === 'granted' && primed && reminder.mutedAt !== null) {
    if (shouldOfferUnmute(reminder, now)) {
      body = 'Reminders took a break after five quiet days. Want gentle reminders again?';
      control = <Button3D label="Turn reminders back on" onPress={() => run(() => turnRemindersBackOn())} />;
    } else {
      body = 'Reminders are resting after five quiet days. We will offer to turn them back on after two weeks.';
      control = null;
    }
  } else if (permission === 'granted' && primed) {
    control = <Button3D label="Reminders on" disabled />;
  }

  return (
    <Card>
      <AppText tier="display" size="xl" color={colors.textPrimary}>Gentle reminders</AppText>
      <AppText tier="body" size="sm" color={colors.textSecondary}>{body}</AppText>
      {control}
    </Card>
  );
}

export default function ProfileScreen() {
  const reader = useContentDb();
  const progress = useProgressStore();
  // The streak as it stands today: missed days settled, freezes spent (FT-13, FT-8).
  const streak = useEffectiveStreak();
  const game = useGameStore();
  const settings = useSettingsStore();
  const [openedAt] = useState(() => Date.now());
  const today = localDateInTz(openedAt, resolveTimezone());

  useEffect(() => {
    useGameStore.getState().refreshDaily(today, settings.dailyGoalMinutes);
  }, [settings.dailyGoalMinutes, today]);

  const allLessons = reader.listCourses().flatMap((summary) =>
    reader.getCourse(summary.id)?.units.flatMap((unit) => unit.lessons) ?? [],
  );
  const lessonsRemaining = allLessons.filter((lesson) => !progress.completedLessonIds.includes(lesson.id)).length;
  const pace = settings.examDate ? computeStudyPace(Date.parse(settings.examDate), openedAt, lessonsRemaining) : null;
  const unlocked = new Set(game.unlockedAchievementIds);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AppText tier="label" size="sm" color={colors.clay400}>YOUR ARCHITECT PROFILE</AppText>
            <AppText tier="display" size="3xl" color={colors.textPrimary} accessibilityRole="header">Keep building</AppText>
            <AppText tier="body" size="sm" color={colors.textSecondary}>Every lesson, review, and mock adds to the same study system.</AppText>
          </View>
          <ClaudeAgentMascot size={88} mood="idle" accessibilityLabel="Your Claude Code study agent" />
        </View>

        <View style={styles.statGrid}>
          {[
            [`${progress.totalXp}`, 'XP', colors.xpGold],
            [`${progress.gems}`, 'GEMS', colors.gemTeal],
            [`${streak.current}`, 'DAY RHYTHM', colors.streakFlame],
            [`${progress.completedLessonIds.length}`, 'LESSONS', colors.success],
          ].map(([value, label, color]) => (
            <View key={label} style={styles.stat}>
              <AppText tier="display" size="2xl" color={color}>{value}</AppText>
              <AppText tier="label" size="xs" color={colors.textSecondary}>{label}</AppText>
            </View>
          ))}
        </View>

        <AccountSyncCard />

        {pace ? (
          <Card>
            <AppText tier="label" size="sm" color={colors.info}>EXAM PACE</AppText>
            <AppText tier="display" size="2xl" color={colors.textPrimary}>{`${pace.lessonsPerWeek} lessons / week`}</AppText>
            <AppText tier="body" size="sm" color={colors.textSecondary}>{`${pace.daysRemaining} days · ${pace.lessonsRemaining} lessons remaining`}</AppText>
          </Card>
        ) : null}

        <View style={styles.heading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary}>Today&apos;s quests</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>Three natural milestones. Rewards claim themselves as you study.</AppText>
        </View>
        {game.quests.map((quest) => (
          <Card key={quest.id}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <AppText tier="label" size="base" color={colors.textPrimary}>{quest.label}</AppText>
                <AppText tier="body" size="sm" color={colors.textSecondary}>{`${Math.min(quest.progress, quest.target)} / ${quest.target}`}</AppText>
              </View>
              <AppText tier="label" size="sm" color={quest.claimed ? colors.success : colors.xpGold}>{quest.claimed ? 'CLAIMED' : quest.chestTier.toUpperCase()}</AppText>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((quest.progress / quest.target) * 100)}%` }]} /></View>
          </Card>
        ))}

        <View style={styles.heading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary}>7-day commitment</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>Choose a rhythm and earn a bonus chest. Quieter days cost nothing.</AppText>
        </View>
        <Card>
          {game.commitment ? (
            <>
              <AppText tier="display" size="xl" color={colors.textPrimary}>{`${game.commitment.studiedDates.length} / ${game.commitment.targetDays} study days`}</AppText>
              <AppText tier="body" size="sm" color={colors.textSecondary}>This offer renews each week. Your bonus chest waits when the goal is met.</AppText>
              {game.commitment.bonusChests > 0 ? <Button3D label="Open bonus chest" onPress={() => game.claimCommitmentChest(Math.random())} /> : null}
            </>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {[3, 5, 7].map((days) => (
                <Button3D key={days} label={`${days} study days`} color={days === 5 ? colors.clay400 : colors.muted} shadowColor={days === 5 ? colors.clayPressed : colors.border} textColor={days === 5 ? colors.textOnAccent : colors.textPrimary} onPress={() => game.startCommitment(today, days as 3 | 5 | 7)} />
              ))}
            </View>
          )}
        </Card>

        <View style={styles.heading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary}>Achievements</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>{`${unlocked.size} of ${ACHIEVEMENTS.length} tiers unlocked`}</AppText>
        </View>
        <View style={styles.badgeGrid}>
          {ACHIEVEMENTS.map((achievement) => (
            <View key={achievement.id} style={[styles.badge, unlocked.has(achievement.id) && styles.badgeUnlocked]}>
              <AppText tier="display" size="xl" color={unlocked.has(achievement.id) ? colors.xpGold : colors.muted}>◆</AppText>
              <AppText tier="label" size="xs" color={colors.textPrimary} style={{ textAlign: 'center' }}>{`${achievement.title} ${achievement.tier}`}</AppText>
              <AppText tier="body" size="xs" color={colors.textSecondary}>{`${achievement.threshold}`}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.heading}>
          <AppText tier="display" size="2xl" color={colors.textPrimary}>Gem workshop</AppText>
          <AppText tier="body" size="sm" color={colors.textSecondary}>Everything is earned in-app. There are no money purchases.</AppText>
        </View>
        {Object.values(GEM_SINKS).map((sink) => {
          const availability = sinkAvailability(sink.id, {
            gems: progress.gems,
            freezesAvailable: streak.freezesAvailable,
            ownedCosmetics: game.ownedCosmetics,
          });
          return (
            <Card key={sink.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}><AppText tier="label" size="base" color={colors.textPrimary}>{sink.label}</AppText></View>
                <AppText tier="label" size="base" color={colors.gemTeal}>{`${sink.price} ◆`}</AppText>
              </View>
              {sink.id === GEM_SINKS.streakFreeze.id ? (
                <AppText tier="body" size="sm" color={colors.textSecondary}>
                  {availability === 'freezes-full'
                    ? `You're holding ${streak.freezesAvailable} of ${MAX_FREEZES} freezes, the most you can carry. They cover missed days on their own, so there's nothing to buy right now.`
                    : `${streak.freezesAvailable} of ${MAX_FREEZES} freezes ready. Each one quietly covers a missed day.`}
                </AppText>
              ) : null}
              <Button3D
                label={availability === 'owned' ? 'Owned' : availability === 'freezes-full' ? 'Freezes full' : 'Get with gems'}
                disabled={availability !== 'available'}
                color={colors.gemTeal}
                shadowColor="#226F6D"
                onPress={() => game.purchase(sink.id, Date.now())}
              />
            </Card>
          );
        })}

        <Card>
          <AppText tier="label" size="sm" color={colors.xpGold}>PUBLISHED CHEST ODDS</AppText>
          {(Object.keys(REWARD_RULES) as (keyof typeof REWARD_RULES)[]).map((tier) => {
            const rule = REWARD_RULES[tier];
            return <AppText key={tier} tier="body" size="sm" color={colors.textSecondary}>{`${tier}: ${rule.minGems}–${rule.maxGems} gems · ${Math.round(rule.cosmeticChance * 100)}% cosmetic · ${Math.round(rule.boostChance * 100)}% boost`}</AppText>;
          })}
          <AppText tier="body" size="sm" color={colors.textMuted}>Every chest pays its gem floor. Optional drops only add to it.</AppText>
        </Card>

        <JuiceSettings />

        <RemindersCard />

        <AboutFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xl * 3 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 2, borderColor: colors.clayPressed },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '48%', alignItems: 'center', padding: spacing.md, borderRadius: radii.button, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  heading: { gap: spacing.xs, marginTop: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radii.card, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { height: 10, overflow: 'hidden', borderRadius: radii.pill, backgroundColor: colors.border },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.success },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { width: '31%', minHeight: 108, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, borderRadius: radii.button, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border },
  badgeUnlocked: { borderColor: colors.xpGold, backgroundColor: '#342A19' },
});
