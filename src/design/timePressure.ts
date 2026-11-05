// src/design/timePressure.ts
//
// The single gate for timed content (WCAG 2.2.1 / GC-10). A tf-speed round shows a per-question
// countdown UNLESS time pressure is reduced — in which case it renders untimed with identical XP (the
// XP engine has no speed term, so removing the timer never changes the award; see src/engine/xp.ts).
//
// Reduce-time-pressure is ON when EITHER:
//   • the user set it explicitly (settings.reduceTimePressure), OR
//   • Reduce Motion is on — a person who has asked the whole UI to calm down should never then be put
//     on a clock. This AUTO-enable is the coupling the plan requires (reduce-motion ⇒ no time pressure).

import { useReduceMotion } from '@/design/motion';
import { useSettingsStore } from '@/state/settings';

export function useReduceTimePressure(): boolean {
  const setting = useSettingsStore((s) => s.reduceTimePressure);
  const reduceMotion = useReduceMotion();
  return setting || reduceMotion;
}
