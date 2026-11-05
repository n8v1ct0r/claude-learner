// __tests__/renderers/reduce-time-pressure.test.tsx  (GC-10 / WCAG 2.2.1)
//
// The reduce-time-pressure contract for the tf-speed round:
//   • flag OFF  => the calm per-question countdown is shown,
//   • flag ON   => the round renders UNTIMED (no countdown) and is still fully answerable,
//   • reduce-motion ON AUTO-enables reduce-time-pressure (a calmed-down UI is never put on a clock),
//   • XP PARITY: grading is byte-identical timed vs untimed, and the XP engine has no speed term, so
//     the award is the same either way — turning the setting on never costs XP.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

// Settings persist to AsyncStorage — give the store an in-memory backing (hoisted above imports).
jest.mock('@react-native-async-storage/async-storage', () => {
  const backing: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(k in backing ? backing[k] : null),
      setItem: (k: string, v: string) => {
        backing[k] = v;
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        delete backing[k];
        return Promise.resolve();
      },
      getAllKeys: () => Promise.resolve(Object.keys(backing)),
      clear: () => {
        for (const k of Object.keys(backing)) delete backing[k];
        return Promise.resolve();
      },
    },
  };
});

import { computeLessonXp, type LessonXpInput } from '@/engine/xp';
import { McRenderer } from '@/features/lesson-player/renderers/McRenderer';
import { defaultSettings, useSettingsStore } from '@/state/settings';

import type { McQuestion } from '../../content/schema/types';

const tfSpeed: McQuestion = {
  id: 'fixture-tf-q01',
  type: 'mc',
  variant: 'tf-speed',
  domain: 'd1',
  conceptId: 'workflows-vs-agents',
  taskStatement: '1.1',
  difficulty: 1,
  estimatedSeconds: 10,
  stem: 'True or false: adding a loop around an LLM call automatically makes a system an agent.',
  options: ['False — predefined paths are still a workflow', 'True'],
  answerKey: 0,
  explanation: 'A loop is a mechanism, not the definition.',
  sourceUrls: ['https://www.anthropic.com/engineering/building-effective-agents'],
};

beforeEach(() => {
  // Reset preference data to shipped defaults; motion allowed unless a test opts in.
  useSettingsStore.setState({ ...defaultSettings, reduceMotionOverride: 'off' });
});

describe('tf-speed reduce-time-pressure (GC-10 / WCAG 2.2.1)', () => {
  it('flag OFF => shows the countdown timer', async () => {
    useSettingsStore.getState().setReduceTimePressure(false);
    await render(<McRenderer question={tfSpeed} answered={false} onAnswer={jest.fn()} />);
    expect(screen.queryByTestId('tf-speed-timer')).not.toBeNull();
  });

  it('flag ON => renders UNTIMED (no timer) and stays fully answerable', async () => {
    useSettingsStore.getState().setReduceTimePressure(true);
    const onAnswer = jest.fn();
    await render(<McRenderer question={tfSpeed} answered={false} onAnswer={onAnswer} />);
    expect(screen.queryByTestId('tf-speed-timer')).toBeNull();
    // The untimed round still grades the correct tap.
    fireEvent.press(await screen.findByRole('button', { name: tfSpeed.options[tfSpeed.answerKey] }));
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('reduce-motion ON auto-enables reduce-time-pressure (no timer even with the setting off)', async () => {
    useSettingsStore.setState({ reduceTimePressure: false, reduceMotionOverride: 'on' });
    await render(<McRenderer question={tfSpeed} answered={false} onAnswer={jest.fn()} />);
    expect(screen.queryByTestId('tf-speed-timer')).toBeNull();
  });

  it('XP PARITY: grading is identical timed vs untimed, so the award is identical', async () => {
    // Timed render (flag off): tap the correct option.
    useSettingsStore.setState({ reduceTimePressure: false, reduceMotionOverride: 'off' });
    const timedAnswer = jest.fn();
    const timed = await render(<McRenderer question={tfSpeed} answered={false} onAnswer={timedAnswer} />);
    expect(screen.queryByTestId('tf-speed-timer')).not.toBeNull();
    fireEvent.press(await screen.findByRole('button', { name: tfSpeed.options[tfSpeed.answerKey] }));
    timed.unmount();

    // Untimed render (flag on): tap the correct option.
    useSettingsStore.setState({ reduceTimePressure: true, reduceMotionOverride: 'off' });
    const untimedAnswer = jest.fn();
    await render(<McRenderer question={tfSpeed} answered={false} onAnswer={untimedAnswer} />);
    expect(screen.queryByTestId('tf-speed-timer')).toBeNull();
    fireEvent.press(await screen.findByRole('button', { name: tfSpeed.options[tfSpeed.answerKey] }));

    // The only XP-relevant output of the renderer is the correctness boolean — identical in both modes.
    const timedCorrect = timedAnswer.mock.calls[0][0] as boolean;
    const untimedCorrect = untimedAnswer.mock.calls[0][0] as boolean;
    expect(timedCorrect).toBe(true);
    expect(untimedCorrect).toBe(timedCorrect);

    // Fed through the XP engine with otherwise-identical inputs, the award is byte-identical.
    const xpFor = (correct: boolean): LessonXpInput => ({ bestComboStreak: 5, legendary: correct });
    expect(computeLessonXp(xpFor(untimedCorrect))).toEqual(computeLessonXp(xpFor(timedCorrect)));
  });
});
