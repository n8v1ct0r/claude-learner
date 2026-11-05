// src/design/screen-transition.web.ts: the web build's screen transitions.
//
// Same exports as screen-transition.ts. react-native-web's native stack swaps screens with no motion,
// so a pushed route slides in from the right the way an iOS push does, and a tab's scene settles in
// with a short fade each time it is shown (iOS tabs do not slide). Both start already visible, so no
// screen is ever hidden while it animates. The OS "Reduce Motion" setting turns both off.
//
// The keyframes must go through StyleSheet.create: react-native-web compiles animationKeyframes into a
// CSS @keyframes rule there, and drops it from a plain inline style object.

import { StyleSheet, type ViewStyle } from 'react-native';

const reduceMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

// animationKeyframes, animationDuration and animationTimingFunction are web-only style keys that the
// React Native types do not list.
const styles = StyleSheet.create({
  push: {
    animationKeyframes: [
      {
        '0%': { transform: 'translateX(28%)', opacity: 0.5 },
        '100%': { transform: 'translateX(0)', opacity: 1 },
      },
    ],
    animationDuration: '320ms',
    animationTimingFunction: EASE_OUT,
  } as ViewStyle,
  tab: {
    animationKeyframes: [{ '0%': { opacity: 0.4 }, '100%': { opacity: 1 } }],
    animationDuration: '200ms',
    animationTimingFunction: EASE_OUT,
  } as ViewStyle,
});

/** Pushed full-screen routes (lesson, review). */
export const pushEnter: ViewStyle = reduceMotion ? {} : styles.push;

/** A tab's scene each time it is shown. */
export const tabEnter: ViewStyle = reduceMotion ? {} : styles.tab;
