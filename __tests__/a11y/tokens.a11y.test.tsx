import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

// Button3D's haptics gate reads the persisted settings store (AsyncStorage-backed) — mock the
// native module with the official jest mock (same pattern as the other component suites).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { AppText } from '@/components/AppText';
import { Button3D } from '@/components/Button3D';
import { maxFontMultiplier } from '@/design/tokens';

// @testing-library/react-native v14 render is async (React 19 concurrent) — always await it.

describe('AppText (the only text primitive)', () => {
  it('renders its children and keeps them accessible', async () => {
    await render(<AppText accessibilityRole="header">Path</AppText>);
    expect(screen.getByText('Path')).toBeTruthy();
  });

  it('forwards an UNBOUNDED Dynamic-Type cap for body text (no maxFontSizeMultiplier)', async () => {
    await render(<AppText tier="body">Explain subagents</AppText>);
    const node = screen.getByText('Explain subagents');
    expect(node.props.maxFontSizeMultiplier).toBeUndefined();
    expect(maxFontMultiplier('body')).toBeUndefined();
  });

  it('forwards a 1.5x cap for ceremony numerals so they reflow instead of truncating', async () => {
    await render(<AppText tier="ceremony">+40</AppText>);
    const node = screen.getByText('+40');
    expect(node.props.maxFontSizeMultiplier).toBe(1.5);
    expect(maxFontMultiplier('ceremony')).toBe(1.5);
  });
});

describe('Button3D accessibility', () => {
  it('exposes an accessible button role and label', async () => {
    await render(<Button3D label="Continue" />);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe('Continue');
  });

  it('marks itself disabled through accessibilityState', async () => {
    await render(<Button3D label="Locked" disabled />);
    const button = screen.getByRole('button', { name: 'Locked' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('Dynamic Type: no component disables font scaling', () => {
  // Built from parts so this forbidden literal never appears verbatim in the source tree.
  const prop = 'allowFontScaling';
  const jsxDisable = new RegExp(`${prop}\\s*=\\s*\\{\\s*false\\s*\\}`);
  const objDisable = new RegExp(`${prop}\\s*:\\s*false`);

  const collect = (dir: string, acc: string[]): string[] => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        collect(p, acc);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
        acc.push(p);
      }
    }
    return acc;
  };

  it('no file under src/ or app/ sets allowFontScaling to false', () => {
    const root = process.cwd();
    const files = ['src', 'app'].flatMap((r) => collect(join(root, r), []));
    // Guard against a broken sweep silently passing on zero files.
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((f) => {
      const source = readFileSync(f, 'utf8');
      return jsxDisable.test(source) || objDisable.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
