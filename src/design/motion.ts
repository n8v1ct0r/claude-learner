// src/design/motion.ts
//
// The single motion-gate hook. Every juice moment in the app (springy progress fills, correct/incorrect
// flashes, the XP count-up, chest open, streak flame) MUST consult `useReduceMotion()` and fall back to
// an instant / gentle-fade state when it returns true (GC-10 wires reduce-motion to the juice layer).
//
// It combines two sources:
//   • the user's explicit setting override (settings store: 'system' | 'on' | 'off'), and
//   • the OS "Reduce Motion" accessibility flag (AccessibilityInfo).
// An explicit 'on'/'off' override always wins; 'system' defers to the OS flag. Reading the OS flag is
// async, so it hydrates from a listener — until it resolves we assume motion is allowed (false), which
// is the safe default for a first paint that then settles.

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettingsStore } from '@/state/settings';

export function useReduceMotion(): boolean {
  const override = useSettingsStore((s) => s.reduceMotionOverride);
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setSystemReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (value: boolean) => {
      setSystemReduce(value);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  if (override === 'on') return true;
  if (override === 'off') return false;
  return systemReduce;
}
