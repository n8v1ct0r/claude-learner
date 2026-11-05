// __tests__/a11y/dynamic-type-motion.a11y.test.tsx  (AP-1, IB-3, AP-10)
//
// Layout contracts that keep large Dynamic Type sizes readable, and Reduce Motion honoured:
//   • Button3D never fixes its height: the face has a 52pt MINIMUM plus vertical padding and the base
//     is pinned to the face, so an AX-size label wraps and the button grows (56pt hitbox minimum kept);
//   • the Learn tab's header stats wrap instead of overlapping and clipping;
//   • the two animated scrolls (feedback reveal, course switch) jump instead of animating with Reduce
//     Motion on.
// Jest has no layout engine, so these assert the style contract that produces the layout.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return { SafeAreaView: rn.View };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/db/content-provider', () => {
  const { c1AgenticArchitecture } = require('../../content/src/d1-agentic-architecture/course');
  const firstLesson = c1AgenticArchitecture.units[0].lessons[0];
  return {
    useContentDb: () => ({
      listCourses: () => [
        {
          id: c1AgenticArchitecture.id,
          domain: c1AgenticArchitecture.domain,
          title: c1AgenticArchitecture.title,
          description: c1AgenticArchitecture.description,
          order: c1AgenticArchitecture.order,
        },
      ],
      getCourse: () => c1AgenticArchitecture,
      getFirstLesson: () => firstLesson,
      getNextLesson: () => undefined,
    }),
  };
});

// Drive reduce-motion straight off the settings override (the real hook also polls the OS flag).
jest.mock('@/design/motion', () => ({
  useReduceMotion: () => require('@/state/settings').useSettingsStore.getState().reduceMotionOverride === 'on',
}));

import PathScreen from '../../app/(tabs)/index';
import { Button3D } from '@/components/Button3D';
import { ExerciseStep } from '@/features/lesson-player/ExerciseStep';
import { useSettingsStore } from '@/state/settings';

import { l1WorkflowsVsAgents } from '../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents';

interface TreeNode {
  props: Record<string, unknown>;
  parent: TreeNode | null;
  children: (TreeNode | string)[];
}

const flat = (node: TreeNode) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

const scrollTo = jest.mocked(ScrollView.prototype.scrollTo);
const scrollToEnd = jest.mocked(ScrollView.prototype.scrollToEnd);

beforeEach(() => {
  useSettingsStore.getState().reset();
  scrollTo.mockClear();
  scrollToEnd.mockClear();
});

describe('Button3D at accessibility text sizes (AP-1)', () => {
  const LONG = 'Enable gentle reminders near your usual study time';

  it('grows with its label instead of fixing the face height', async () => {
    await render(<Button3D label={LONG} />);
    const hitbox = screen.getByRole('button', { name: LONG }) as unknown as TreeNode;
    const label = screen.getByText(LONG) as unknown as TreeNode;
    const face = label.parent as TreeNode;
    const shadow = (hitbox.children as TreeNode[]).find((child) => flat(child).position === 'absolute') as TreeNode;

    // Hitbox: a 56pt minimum (52 face + 4 base), never a fixed height.
    expect(flat(hitbox).minHeight).toBeGreaterThanOrEqual(56);
    expect(flat(hitbox).height).toBeUndefined();

    // Face: a 52pt minimum with vertical padding, so a wrapped label pushes it taller.
    expect(flat(face).minHeight).toBe(52);
    expect(flat(face).height).toBeUndefined();
    expect(Number(flat(face).paddingVertical)).toBeGreaterThan(0);
    expect(flat(face).marginBottom).toBe(4);

    // Base: pinned 4pt below the face's top and to the hitbox bottom, i.e. exactly as tall as the face.
    expect(flat(shadow)).toMatchObject({ position: 'absolute', top: 4, bottom: 0 });
    expect(flat(shadow).height).toBeUndefined();

    // The label may wrap (no line cap) and stays centred when it does.
    expect(label.props.numberOfLines).toBeUndefined();
    expect(flat(label).textAlign).toBe('center');
  });
});

describe('Learn tab header stats (IB-3)', () => {
  it('wrap onto another line instead of overlapping at large text sizes', async () => {
    await render(<PathScreen />);
    const row = screen.getByTestId('learn-header-stats') as unknown as TreeNode;
    expect(flat(row)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });

    const stats = [
      screen.getByLabelText('0 day streak'),
      screen.getByLabelText(/^\d+ of \d+ lessons complete$/),
      screen.getByLabelText(/^\d+ percent curriculum coverage$/),
      screen.getByLabelText(/^\d+ energy$/),
    ] as unknown as TreeNode[];
    for (const stat of stats) {
      expect(stat.parent).toBe(row);
      expect(flat(stat).flexShrink).toBe(1);
      expect(stat.props.numberOfLines).toBeUndefined();
    }
  });
});

describe('Reduce Motion for the two animated scrolls (AP-10)', () => {
  it('switching course on the Learn tab jumps with Reduce Motion on, and animates with it off', async () => {
    useSettingsStore.getState().setReduceMotionOverride('on');
    const view = await render(<PathScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^D1, / }));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 150, animated: false });
    await view.unmount();

    useSettingsStore.getState().setReduceMotionOverride('off');
    await render(<PathScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^D1, / }));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 150, animated: true });
  });

  it('revealing answer feedback jumps with Reduce Motion on', async () => {
    useSettingsStore.getState().setReduceMotionOverride('on');
    const question = l1WorkflowsVsAgents.exercises[0];
    await render(
      <ExerciseStep question={question} pending={{ correct: true, explanation: question.explanation }} onAnswer={jest.fn()} onContinue={jest.fn()} />,
    );
    await fireEvent(screen.getByTestId('exercise-scroll'), 'contentSizeChange', 390, 1600);
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
  });

  it('revealing answer feedback still animates when motion is allowed', async () => {
    useSettingsStore.getState().setReduceMotionOverride('off');
    const question = l1WorkflowsVsAgents.exercises[0];
    await render(
      <ExerciseStep question={question} pending={{ correct: true, explanation: question.explanation }} onAnswer={jest.fn()} onContinue={jest.fn()} />,
    );
    await fireEvent(screen.getByTestId('exercise-scroll'), 'contentSizeChange', 390, 1600);
    expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: true });
  });
});
