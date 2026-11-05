import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { scenarioLabel } from '@/content/scenario-labels';
import { taskLabel } from '@/content/task-labels';
import { colors, radii, spacing, touchable } from '@/design/tokens';
import type { ExamSelection } from '@/engine/mock-exam';
import type { Question } from '../../../content/schema/types';

type SelectableQuestion = Extract<Question, { type: 'mc' | 'multi' }>;

export function ExamQuestionCard({
  question,
  selection,
  onChange,
  locked = false,
  revealCorrect = false,
}: {
  question: SelectableQuestion;
  selection: ExamSelection;
  onChange: (selection: ExamSelection) => void;
  locked?: boolean;
  revealCorrect?: boolean;
}) {
  function toggle(index: number): void {
    if (locked) return;
    if (question.type === 'mc') {
      onChange([index]);
      return;
    }
    if (selection.includes(index)) {
      onChange(selection.filter((value) => value !== index));
      return;
    }
    if (selection.length < question.selectCount) onChange([...selection, index]);
  }

  const answerSet = new Set(Array.isArray(question.answerKey) ? question.answerKey : [question.answerKey]);

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <AppText tier="label" size="xs" color={colors.textSecondary}>{`TASK ${question.taskStatement} · ${taskLabel(question.taskStatement)}`}</AppText>
          </View>
          <View style={styles.chip}>
            <AppText tier="label" size="xs" color={question.difficulty === 3 ? colors.review : colors.gemTeal}>
              {question.difficulty === 3 ? 'HARD' : question.difficulty === 2 ? 'STANDARD' : 'FOUNDATION'}
            </AppText>
          </View>
        </View>
        {question.scenarioId ? (
          <View style={styles.scenarioBanner}>
            <AppText tier="label" size="xs" color={colors.gemTeal}>PRODUCTION SCENARIO</AppText>
            <AppText tier="label" size="base" color={colors.textPrimary}>{scenarioLabel(question.scenarioId)}</AppText>
          </View>
        ) : null}
        <AppText tier="label" size="sm" color={colors.clay400}>
          {question.type === 'multi' ? `SELECT ${question.selectCount}` : 'SELECT THE BEST ANSWER'}
        </AppText>
        <AppText tier="display" size="xl" color={colors.textPrimary} accessibilityRole="header">
          {question.stem}
        </AppText>
      </View>

      <View style={{ gap: spacing.md }}>
        {question.options.map((option, index) => {
          const selected = selection.includes(index);
          const isCorrect = revealCorrect && answerSet.has(index);
          const selectedWrong = revealCorrect && selected && !answerSet.has(index);
          const letter = String.fromCharCode(65 + index);
          // Once revealed, the result is spoken and marked with a glyph, not carried by colour alone.
          const result = isCorrect
            ? selected
              ? 'Correct, your answer.'
              : 'Correct answer.'
            : selectedWrong
              ? 'Your answer, not quite.'
              : null;
          return (
            <Pressable
              key={`${question.id}:${index}`}
              accessibilityRole={question.type === 'mc' ? 'radio' : 'checkbox'}
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={result ? `${letter}. ${option.replace(/\.+$/, '')}. ${result}` : `${letter}. ${option}`}
              disabled={locked}
              onPress={() => toggle(index)}
              style={[
                styles.option,
                selected && styles.selected,
                isCorrect && styles.correct,
                selectedWrong && styles.wrong,
              ]}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                <AppText tier="label" size="sm" color={selected ? colors.textOnAccent : colors.textSecondary}>
                  {letter}
                </AppText>
              </View>
              <AppText tier="body" size="base" color={colors.textPrimary} style={{ flex: 1 }}>
                {option}
              </AppText>
              {isCorrect || selectedWrong ? (
                <AppText tier="label" size="lg" color={isCorrect ? colors.success : colors.review}>
                  {isCorrect ? '✓' : '•'}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  scenarioBanner: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radii.button,
    borderLeftWidth: 4,
    borderLeftColor: colors.gemTeal,
    backgroundColor: '#24352F',
  },
  option: {
    ...touchable(),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.button,
    backgroundColor: colors.bgElevated,
  },
  selected: { borderColor: colors.clay400, backgroundColor: '#352921' },
  correct: { borderColor: colors.success, backgroundColor: '#203128' },
  wrong: { borderColor: colors.review, backgroundColor: '#352B1C' },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  markerSelected: { backgroundColor: colors.clay400 },
});
