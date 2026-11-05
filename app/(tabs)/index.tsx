// app/(tabs)/index.tsx — the Path tab (cold-open home).
//
// The Duolingo-style trail. It renders the pure path-model (src/features/path/path-model.ts) as a
// vertical run of nodes — lessons, reward chests between them, an end-of-unit legendary node, and a
// unit-review node — grouped under their unit headers. The model is DATA-DRIVEN off the content tree,
// so adding units or whole courses later needs no change here.
//
// Interaction:
//   • ONE primary CTA ("Continue"/"Start lesson") is anchored at the bottom and deep-resumes the right
//     lesson from persisted state via the pure resolveContinueTarget() (GC-03b) — unchanged.
//   • The single frontier lesson is 'current' (it pulses, reduce-motion gated) and the view auto-scrolls
//     it into the band above the pinned CTA on open, and again when the frontier moves on (path-scroll.ts;
//     an instant jump under Reduce Motion).
//   • Tapping a lesson node opens it; a chest/legendary node opens a preview reveal (economy is M8); a
//     review node opens the energy-free unit review.

import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { ClaudeAgentMascot } from '@/components/ClaudeAgentMascot';
import { useContentDb } from '@/db/content-provider';
import { useReduceMotion } from '@/design/motion';
import { colors, sizes, spacing } from '@/design/tokens';
import { ChestReveal, type RevealKind } from '@/features/path/ChestReveal';
import { PathNode } from '@/features/path/PathNode';
import { buildPathModel, type PathNode as PathNodeModel } from '@/features/path/path-model';
import { currentNodeScrollY, type RowLayout } from '@/features/path/path-scroll';
import { resolveContinueTarget } from '@/features/path/resume';
import { useLessonSessionStore } from '@/state/lesson-session';
import { useEffectiveEnergy, useEffectiveStreak } from '@/state/live-progress';
import { useProgressStore } from '@/state/progress';
import type { Course } from '../../content/schema/types';

type PathRow =
  { kind: 'node'; key: string; course: Course; node: PathNodeModel };

export default function PathScreen() {
  const reader = useContentDb();
  const router = useRouter();
  const reduceMotion = useReduceMotion();

  const completedIds = useProgressStore((s) => s.completedLessonIds);
  // Read-time values: passive refill and missed-day settling included (V-features-1, FT-13).
  const energy = useEffectiveEnergy();
  const streakCurrent = useEffectiveStreak().current;
  const lastCompletedLessonId = useProgressStore((s) => s.lastCompletedLessonId);
  const sessionLessonId = useLessonSessionStore((s) => s.lessonId);
  const sessionPhase = useLessonSessionStore((s) => s.phase);

  const courses = reader.listCourses();
  const curriculum = courses
    .map((course) => reader.getCourse(course.id))
    .filter((course): course is Course => course !== undefined);

  const target = resolveContinueTarget({
    sessionLessonId,
    sessionPhase,
    lastCompletedLessonId,
    firstLessonId: reader.getFirstLesson()?.id,
    nextLessonIdAfter: (id) => reader.getNextLesson(id)?.id,
  });

  // The path-model marks the resolved Continue target as the single 'current' (pulsing) node, so the
  // trail and the anchored CTA can never disagree about "where you are".
  const targetCourse =
    curriculum.find((course) =>
      course.units.some((unit) => unit.lessons.some((lesson) => lesson.id === target?.lessonId)),
    ) ?? curriculum[0];

  const [selectedCourseId, setSelectedCourseId] = useState(targetCourse?.id ?? '');
  const selectedCourse = curriculum.find((course) => course.id === selectedCourseId) ?? targetCourse;

  // Show one domain at a time. The full curriculum stays one tap away in the selector without making
  // a new learner scroll through all 58 lessons to understand where they are.
  const pathRows: PathRow[] = selectedCourse ? (() => {
    const course = selectedCourse;
    const nodes = buildPathModel({
      course,
      completedLessonIds: completedIds,
      currentLessonId: target?.lessonId ?? null,
    });
    return nodes.map((node) => ({ kind: 'node' as const, key: node.key, course, node }));
  })() : [];

  const allLessons = curriculum.flatMap((course) => course.units.flatMap((unit) => unit.lessons));
  const curriculumPercent = allLessons.length === 0 ? 0 : Math.round((completedIds.length / allLessons.length) * 100);
  const selectedLessons = selectedCourse?.units.flatMap((unit) => unit.lessons) ?? [];
  const selectedCompleted = selectedLessons.filter((lesson) => completedIds.includes(lesson.id)).length;
  const selectedPercent = selectedLessons.length === 0 ? 0 : Math.round((selectedCompleted / selectedLessons.length) * 100);

  const scrollRef = useRef<ScrollView>(null);
  // Where every path row was laid out, so the scroll can also follow the frontier to a row whose layout
  // never changes (a finished lesson moves 'current' along without a new layout event).
  const [rowLayouts, setRowLayouts] = useState<Record<string, RowLayout>>({});
  const [viewportHeight, setViewportHeight] = useState(0);
  const [ctaHeight, setCtaHeight] = useState(0);
  const [reveal, setReveal] = useState<{ kind: RevealKind } | null>(null);

  const recordRowLayout = (key: string, patch: RowLayout): void => {
    setRowLayouts((previous) => {
      const row = previous[key];
      const unchanged = row !== undefined && (Object.keys(patch) as (keyof RowLayout)[]).every((name) => row[name] === patch[name]);
      return unchanged ? previous : { ...previous, [key]: { ...row, ...patch } };
    });
  };

  const currentRow = pathRows.find((row) => row.node.status === 'current');
  const scrollTarget = currentRow
    ? currentNodeScrollY({ ...rowLayouts[currentRow.key], viewportHeight, bottomOverlay: target ? ctaHeight : 0 })
    : null;

  // Scroll the current node into view above the pinned CTA once it is measured, and again whenever the
  // frontier moves. Reduce Motion jumps instead of animating.
  useEffect(() => {
    if (scrollTarget !== null) scrollRef.current?.scrollTo({ y: scrollTarget, animated: !reduceMotion });
  }, [scrollTarget, reduceMotion]);

  const onNodePress = (node: PathNodeModel) => {
    switch (node.type) {
      case 'lesson':
        if (energy <= 0 && node.status === 'current') router.push('/practice' as Href);
        else if (node.lessonId) router.push(`/lesson/${node.lessonId}` as string as Href);
        return;
      case 'review':
        if (node.targetUnitId) router.push(`/review/${node.targetUnitId}` as string as Href);
        return;
      case 'chest':
        setReveal({ kind: 'chest' });
        return;
      case 'legendary':
        setReveal({ kind: 'legendary' });
        return;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header stats row. It wraps onto a second line at large Dynamic Type sizes or narrow widths
          instead of overlapping and clipping (IB-3); at default sizes it is one spaced-out row. */}
      <View
        testID="learn-header-stats"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          columnGap: spacing.md,
          rowGap: spacing.xs,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
        }}
      >
        <AppText tier="label" size="base" color={colors.streakFlame} accessibilityLabel={`${streakCurrent} day streak`} style={{ flexShrink: 1 }}>
          {`▲ ${streakCurrent}`}
        </AppText>
        <AppText tier="label" size="base" color={colors.xpGold} accessibilityLabel={`${completedIds.length} of ${allLessons.length} lessons complete`} style={{ flexShrink: 1 }}>
          {`${completedIds.length}/${allLessons.length} LESSONS`}
        </AppText>
        <AppText tier="label" size="base" color={colors.gemTeal} accessibilityLabel={`${curriculumPercent} percent curriculum coverage`} style={{ flexShrink: 1 }}>
          {`${curriculumPercent}% READY`}
        </AppText>
        <AppText tier="label" size="base" color={colors.info} accessibilityLabel={`${energy} energy`} style={{ flexShrink: 1 }}>
          {`● ${energy}`}
        </AppText>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: 140 }}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      >
        <View
          style={{
            minHeight: 150,
            overflow: 'hidden',
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.lg,
            borderRadius: 24,
            backgroundColor: colors.bgElevated,
            borderWidth: 2,
            borderColor: colors.clayPressed,
          }}
        >
          <View style={{ flex: 1, gap: spacing.sm }}>
            <AppText tier="label" size="sm" color={colors.clay400}>
              NEXT CERTIFICATION MISSION
            </AppText>
            <AppText tier="display" size="2xl" color={colors.textPrimary} accessibilityRole="header">
              {targetCourse?.title ?? 'Your path'}
            </AppText>
            <AppText tier="body" size="sm" color={colors.textSecondary}>
              Five exam decisions, one teach-back, then you move forward.
            </AppText>
          </View>
          <View style={{ width: 104, alignItems: 'center', alignSelf: 'flex-end', marginBottom: -spacing.lg }}>
            <ClaudeAgentMascot size={104} mood="peek" accessibilityLabel="Claude Code agent guiding your path" />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText tier="label" size="sm" color={colors.textSecondary}>
            EXPLORE THE BLUEPRINT
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {curriculum.map((course) => {
              const selected = course.id === selectedCourse?.id;
              const courseLessons = course.units.flatMap((unit) => unit.lessons);
              const done = courseLessons.filter((lesson) => completedIds.includes(lesson.id)).length;
              const label = course.domain === 'd0' ? 'Start' : course.domain.toUpperCase();
              return (
                <Pressable
                  key={course.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${label}, ${course.title}, ${done} of ${courseLessons.length} lessons complete`}
                  onPress={() => {
                    setRowLayouts({});
                    setSelectedCourseId(course.id);
                    scrollRef.current?.scrollTo({ y: 150, animated: !reduceMotion });
                  }}
                  style={{
                    minHeight: sizes.minTouchTarget,
                    minWidth: 70,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: spacing.xs,
                    borderRadius: 16,
                    backgroundColor: selected ? colors.clay400 : colors.bgElevated,
                    borderWidth: 1,
                    borderColor: selected ? colors.clay400 : colors.border,
                  }}
                >
                  <AppText tier="label" size="base" color={selected ? colors.textOnAccent : colors.textPrimary}>
                    {label}
                  </AppText>
                  <AppText tier="label" size="xs" color={selected ? colors.textOnAccent : colors.textMuted}>
                    {`${done}/${courseLessons.length}`}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {selectedCourse ? (
          <View
            style={{
              padding: spacing.lg,
              gap: spacing.sm,
              borderRadius: 20,
              backgroundColor: colors.bgElevated,
              borderWidth: 1,
              borderColor: selectedCourse.id === targetCourse?.id ? colors.clayPressed : colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <AppText tier="display" size="xl" color={colors.textPrimary} style={{ flex: 1 }}>
                {selectedCourse.title}
              </AppText>
              <AppText tier="label" size="base" color={selectedPercent === 100 ? colors.success : colors.clay400}>
                {`${selectedPercent}%`}
              </AppText>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: `${selectedPercent}%`, height: '100%', backgroundColor: selectedPercent === 100 ? colors.success : colors.clay400 }} />
            </View>
            <AppText tier="body" size="sm" color={colors.textSecondary}>
              {selectedCourse.description}
            </AppText>
          </View>
        ) : null}

        {/* The selected blueprint domain is visible as a focused trail. */}
        {pathRows.map((row, i) => {
          const previous = pathRows[i - 1];
          const showHeader = previous === undefined || previous.node.unitId !== row.node.unitId;
          // onLayout y is relative to the parent: the row's y is its offset in the scroll content, the
          // node's y its offset inside the row (below the unit header). The scroll target needs both.
          return (
            <View
              key={row.key}
              style={{ gap: spacing.lg }}
              onLayout={(e) => recordRowLayout(row.key, { rowY: e.nativeEvent.layout.y })}
            >
              {showHeader ? (
                <AppText tier="label" size="base" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
                  {row.node.unitTitle}
                </AppText>
              ) : null}
              <View
                onLayout={(e) =>
                  recordRowLayout(row.key, { nodeY: e.nativeEvent.layout.y, nodeHeight: e.nativeEvent.layout.height })
                }
              >
                <PathNode node={row.node} onPress={onNodePress} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* One primary CTA — deep-resumes the right lesson. */}
      {target ? (
        <View
          onLayout={(e) => setCtaHeight(e.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: spacing.xl,
            paddingTop: spacing.md,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Button3D
            label={energy <= 0 && target.mode !== 'resume' ? 'Warm up to refill' : target.mode === 'resume' ? 'Continue' : 'Start lesson'}
            onPress={() =>
              // The lesson route's typed-route entry regenerates on `expo start`/`export`; build the
              // href as a widened string and cast to Href so the typecheck is stable before that codegen
              // runs (the route exists on disk at app/lesson/[lessonId].tsx).
              energy <= 0 && target.mode !== 'resume'
                ? router.push('/practice' as Href)
                : router.push(`/lesson/${target.lessonId}` as string as Href)
            }
            accessibilityHint="Opens your current lesson"
          />
        </View>
      ) : (
        <View style={{ padding: spacing.xl, minHeight: sizes.minTouchTarget }}>
          <AppText tier="body" size="base" color={colors.textSecondary}>
            You’ve finished the available lessons. More coming soon.
          </AppText>
        </View>
      )}

      <ChestReveal visible={reveal !== null} kind={reveal?.kind ?? 'chest'} onDismiss={() => setReveal(null)} />
    </SafeAreaView>
  );
}
