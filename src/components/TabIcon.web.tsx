// src/components/TabIcon.web.tsx: the web bottom-tab icon (native: TabIcon.tsx).
//
// Draws the Material Symbol glyph directly, the way expo-symbols' SymbolView does on web, but without
// expo-symbols' name-to-codepoint table for every Material Symbol (~80 KB of minified JS on the first
// screen for five icons). The glyphs the tabs use are listed here; __tests__/web/tab-icon-glyphs.test.ts
// checks this list against the tab layout and against expo-symbols' own table, so they cannot drift.
// scripts/web-postexport.mjs subsets the font to the same glyphs.
//
// The icon is hidden from assistive tech: react-navigation draws each tab icon twice (active and
// inactive, cross-faded), and a private-use glyph in the tab's accessible name reads as junk. The tab
// is named by its label alone.
import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols/400Regular';
import { useFonts } from 'expo-font';
import { Text, View } from 'react-native';

import type { TabIconProps } from './TabIcon';

export type { MaterialSymbol, TabIconProps } from './TabIcon';

/** Material Symbols codepoints for the glyphs the tab bar uses. */
export const TAB_GLYPHS: Record<string, number> = {
  map: 0xe55b,
  psychology: 0xea4a,
  verified: 0xef76,
  bar_chart: 0xe26b,
  account_circle: 0xe853,
};

const SIZE = 25;

export function TabIcon({ material, color }: TabIconProps) {
  const [loaded] = useFonts({ MaterialSymbols_400Regular });
  const codepoint = TAB_GLYPHS[material];
  return (
    <View aria-hidden style={{ width: SIZE, height: SIZE }}>
      {loaded && codepoint !== undefined ? (
        <Text style={{ fontFamily: 'MaterialSymbols_400Regular', color, fontSize: SIZE, lineHeight: SIZE }}>
          {String.fromCharCode(codepoint)}
        </Text>
      ) : null}
    </View>
  );
}
