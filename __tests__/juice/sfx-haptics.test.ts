// __tests__/juice/sfx-haptics.test.ts — the juice audio/haptics gates.
//
// Verifies the two things that MUST be true of the juice feedback layer:
//   • SFX obey the global sound toggle AND the transient exam-sim mute (no cue leaks into a timed exam).
//   • Haptics obey the global haptics toggle, and there is NO incorrect/error haptic at all (GC-13).

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

const players: { play: jest.Mock; seekTo: jest.Mock; volume: number }[] = [];
jest.mock('expo-audio', () => ({
  __esModule: true,
  createAudioPlayer: jest.fn(() => {
    const p = { play: jest.fn(), seekTo: jest.fn(), volume: 0 };
    players.push(p);
    return p;
  }),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

import * as Haptics from 'expo-haptics';

import { celebrate, tapLight, tapMedium } from '@/juice/haptics';
import { __resetSfxForTests, playCorrect, setExamSfxMuted } from '@/juice/sfx';
import { useSettingsStore } from '@/state/settings';

function totalPlays(): number {
  return players.reduce((n, p) => n + p.play.mock.calls.length, 0);
}

beforeEach(() => {
  players.length = 0;
  __resetSfxForTests();
  useSettingsStore.getState().reset();
  (Haptics.impactAsync as jest.Mock).mockClear();
  (Haptics.notificationAsync as jest.Mock).mockClear();
});

describe('SFX gating', () => {
  it('plays a cue when sound is on and not in an exam sim', () => {
    playCorrect();
    expect(totalPlays()).toBe(1);
  });

  it('stays silent when the global sound toggle is off', () => {
    useSettingsStore.getState().setSoundEnabled(false);
    playCorrect();
    expect(totalPlays()).toBe(0);
  });

  it('stays silent during an exam sim, then resumes after it ends', () => {
    setExamSfxMuted(true);
    playCorrect();
    expect(totalPlays()).toBe(0);

    setExamSfxMuted(false);
    playCorrect();
    expect(totalPlays()).toBe(1);
  });
});

describe('Haptics gating', () => {
  it('fires impact/notification haptics when haptics are on', () => {
    tapLight();
    tapMedium();
    celebrate();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('fires nothing when the haptics toggle is off', () => {
    useSettingsStore.getState().setHapticsEnabled(false);
    tapLight();
    celebrate();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('exposes no incorrect/error haptic (no-shame, GC-13)', () => {
    // The module must not export any "error"/"incorrect" haptic — an incorrect answer never buzzes.
    const mod = require('@/juice/haptics');
    const names = Object.keys(mod).map((n) => n.toLowerCase());
    expect(names.some((n) => n.includes('incorrect') || n.includes('error') || n.includes('fail'))).toBe(false);
  });
});
