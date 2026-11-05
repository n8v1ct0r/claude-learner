// The web tab icon (src/components/TabIcon.web.tsx) carries its own codepoints for the Material Symbols
// the tab bar uses, instead of bundling expo-symbols' table of every symbol. Every glyph the tab layout
// names must be listed there, with the codepoint expo-symbols itself would draw.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { TAB_GLYPHS } from '../../src/components/TabIcon.web';

const root = join(__dirname, '..', '..');
const layout = readFileSync(join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');
const named = [...layout.matchAll(/material="([a-z0-9_]+)"/g)].map((m) => m[1]);
const symbols = JSON.parse(
  readFileSync(join(root, 'node_modules', 'expo-symbols', 'build', 'android', 'symbols.json'), 'utf8'),
) as Record<string, number>;

describe('web tab icon glyphs', () => {
  it('the tab layout names five Material Symbols', () => {
    expect(named).toHaveLength(5);
  });

  it.each(named)('%s has the codepoint expo-symbols uses', (name) => {
    expect(TAB_GLYPHS[name]).toBe(symbols[name]);
  });
});
