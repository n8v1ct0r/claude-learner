// src/design/screen-transition.ts: extra style for a screen as it appears.
//
// Native: nothing. The native stack and tabs already animate with the platform's own transitions.
// The web build resolves screen-transition.web.ts, where react-native-web's stack swaps screens with
// no motion at all.

import type { ViewStyle } from 'react-native';

/** Pushed full-screen routes (lesson, review). */
export const pushEnter: ViewStyle = {};

/** A tab's scene each time it is shown. */
export const tabEnter: ViewStyle = {};
