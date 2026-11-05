// __tests__/path/path-autoscroll.test.tsx — the Learn tab scrolls to the current lesson (smoke fix).
//
// The tab never auto-scrolled: it read the current node's onLayout y, which is relative to the node's row
// wrapper, so the target was always 0 and the current node sat under the fixed "Continue" button. Jest has
// no layout engine, so these tests feed the layout events a device would send (the ScrollView, the pinned
// CTA, each row and its node) and check the scroll the tab asks for:
//   • the current node lands in the band above the fixed button;
//   • Reduce Motion jumps instead of animating;
//   • when the frontier moves on (a finished lesson), the tab follows it.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';

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
import { useLessonSessionStore } from '@/state/lesson-session';
import { useSettingsStore } from '@/state/settings';

interface HostNode {
  type: string;
  props: Record<string, unknown>;
  parent: HostNode | null;
}

const scrollTo = jest.mocked(ScrollView.prototype.scrollTo);

const layoutEvent = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 390, height } } });

function scrollerOf(node: HostNode): HostNode {
  let current: HostNode | null = node;
  while (current && current.type !== 'RCTScrollView') current = current.parent;
  if (!current) throw new Error('expected the node inside a scroll view');
  return current;
}

/** A path node's button, the view measured around it, and its row wrapper. */
function nodeParts(label: string): { button: HostNode; node: HostNode; row: HostNode } {
  const button = screen.getByRole('button', { name: label }) as unknown as HostNode;
  const node = button.parent as HostNode;
  return { button, node, row: node.parent as HostNode };
}

/** Send the layout a phone would: a 640pt viewport, the pinned CTA over its bottom 110pt. */
async function layOutScreen(anyNode: HostNode): Promise<void> {
  await fireEvent(scrollerOf(anyNode) as never, 'layout', layoutEvent(0, 640));
  const cta = (screen.getByRole('button', { name: 'Continue' }) as unknown as HostNode).parent as HostNode;
  await fireEvent(cta as never, 'layout', layoutEvent(530, 110));
}

const CURRENT = 'Orchestrator and hub-and-spoke design';
const NEXT = 'Parallel vs sequential execution';

beforeEach(() => {
  useSettingsStore.getState().reset();
  useLessonSessionStore.setState({ lessonId: 'c1-u4-l2', phase: 'exercises' });
  scrollTo.mockClear();
});

describe('Learn tab auto-scroll to the current lesson', () => {
  it('scrolls the current node into the band above the fixed Continue button', async () => {
    await render(<PathScreen />);
    const current = nodeParts(`${CURRENT}. current.`);
    await layOutScreen(current.button);
    // The node's row starts 1480pt down the content; the node sits 36pt into it, below the unit header.
    await fireEvent(current.row as never, 'layout', layoutEvent(1480, 132));
    await fireEvent(current.node as never, 'layout', layoutEvent(36, 96));

    // Node top 1516, centred in the 530pt band above the button: 1516 - (530 - 96) / 2.
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1299, animated: true });
  });

  it('jumps instead of animating with Reduce Motion on', async () => {
    useSettingsStore.getState().setReduceMotionOverride('on');
    await render(<PathScreen />);
    const current = nodeParts(`${CURRENT}. current.`);
    await layOutScreen(current.button);
    await fireEvent(current.row as never, 'layout', layoutEvent(1480, 132));
    await fireEvent(current.node as never, 'layout', layoutEvent(36, 96));

    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1299, animated: false });
  });

  it('follows the frontier to the next lesson once the current one is finished', async () => {
    await render(<PathScreen />);
    const current = nodeParts(`${CURRENT}. current.`);
    const next = nodeParts(`${NEXT}. locked.`);
    await layOutScreen(current.button);
    await fireEvent(current.row as never, 'layout', layoutEvent(1480, 132));
    await fireEvent(current.node as never, 'layout', layoutEvent(36, 96));
    await fireEvent(next.row as never, 'layout', layoutEvent(1628, 96));
    await fireEvent(next.node as never, 'layout', layoutEvent(0, 96));
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1299, animated: true });

    // The next lesson becomes the frontier; nothing about its layout changes, so no new layout event.
    await act(() => {
      useLessonSessionStore.setState({ lessonId: 'c1-u4-l3', phase: 'exercises' });
    });
    expect(screen.getByRole('button', { name: `${NEXT}. current.` })).toBeTruthy();
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 1628 - 217, animated: true });
  });
});
