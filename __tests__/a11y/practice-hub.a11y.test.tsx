// __tests__/a11y/practice-hub.a11y.test.tsx
//
// Accessibility smoke test for the Practice Hub. It renders the real hub against the pilot content and
// a fresh (empty) SRS deck and asserts the ADHD / no-shame contract at the UI edge (PLAN-rev2 §4.7 #9):
//   • a proper "Practice" header,
//   • the review + scenario-lab sections render with warm, no-shame copy, and
//   • NO "N due" / backlog count is ever shown, and no red-backlog framing leaks in.

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

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
      clear: () => Promise.resolve(),
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const rn = require('react-native');
  return {
    SafeAreaView: rn.View,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@/db/content-provider', () => {
  const {
    l1WorkflowsVsAgents,
  } = require('../../content/src/d1-agentic-architecture/c1-u1/l1-workflows-vs-agents');
  const course = {
    id: 'c1',
    domain: 'd1',
    title: 'Agentic Architecture',
    description: 'Course under test',
    order: 0,
    units: [{ id: 'c1-u1', title: 'Unit 1', order: 0, lessons: [l1WorkflowsVsAgents] }],
  };
  return {
    useContentDb: () => ({
      listCourses: () => [{ id: 'c1', domain: 'd1', title: course.title, description: '', order: 0 }],
      getCourse: () => course,
    }),
  };
});

import { PracticeHub } from '@/features/practice/PracticeHub';
import { useSrsStore } from '@/state/srs';

beforeEach(() => {
  useSrsStore.getState().reset();
});

describe('Practice Hub a11y smoke', () => {
  it('renders an accessible Practice header', async () => {
    await render(<PracticeHub onLaunch={jest.fn()} />);
    expect(screen.getByRole('header', { name: 'Practice' })).toBeTruthy();
  });

  it('shows warm, energy-free framing and no backlog/due count', async () => {
    await render(<PracticeHub onLaunch={jest.fn()} />);

    expect(screen.getByText(/nothing here costs energy/i)).toBeTruthy();
    // Fresh deck → the review section shows the "all caught up" empty state, never a count.
    expect(screen.getByText(/all caught up/i)).toBeTruthy();

    // No component anywhere renders a raw "N due" / backlog integer.
    expect(screen.queryByText(/\d+\s*(due|cards? due|to review|behind|overdue)/i)).toBeNull();
    expect(screen.queryByText(/backlog/i)).toBeNull();
  });

  it('offers an accessible scenario drill button (the always-available exam-relevant path)', async () => {
    await render(<PracticeHub onLaunch={jest.fn()} />);
    // The pilot lesson includes production scenarios, so the Scenario Lab is present.
    const button = screen.getByRole('button', { name: 'Start scenario drill' });
    expect(button).toBeTruthy();
  });
});
