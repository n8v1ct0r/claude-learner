// __tests__/a11y/source-links-nativewind.test.tsx  (smoke fix: cited source links, owner rule 2)
//
// The app renders every Pressable through NativeWind's css-interop wrapper, which passes an object
// `style` through but drops a function-valued one. Jest never sees that wrapper on its own:
// react-native-css-interop registers its components only when NODE_ENV !== 'test'. So a source link
// styled with `style={({ pressed }) => ...}` passed every other test while the app lost its row layout,
// its 44pt minimum and its pressed dimming. This suite registers the wrapper the way the app does and
// checks what a source link really renders:
//   • no arrow glyph (it drew as a blue emoji tile on its own line above the title, and the polish
//     rules ban arrows added to link text);
//   • still a link with the readable page title and the host line, in a row at least 44pt tall;
//   • pressed feedback that survives the wrapper.

import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })),
}));

import { SourceLinks } from '@/components/SourceLinks';
import { sourceLinkLabel } from '@/components/source-label';

const URL = 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools';
const ARROWS = /[←-⇿⟰-⟿⤀-⥿⬀-⯿]/;

interface HostNode {
  type: string;
  props: Record<string, unknown>;
  children: (HostNode | string)[];
}

function textContent(node: HostNode | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textContent).join('');
}

const flat = (node: HostNode) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

beforeAll(() => {
  // Wrap Pressable, View, Text... with css-interop, as the app's JSX runtime does outside tests.
  require('react-native-css-interop/dist/runtime/components');
});

describe('a cited source link under the NativeWind runtime', () => {
  it('shows the page title and its host, with no arrow glyph', async () => {
    const { title, host } = sourceLinkLabel(URL);
    await render(<SourceLinks urls={[URL]} />);
    const link = screen.getByRole('link', { name: `${title}, ${host}` }) as unknown as HostNode;

    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(host)).toBeTruthy();
    expect(screen.queryByText('↗')).toBeNull();
    expect(textContent(link)).toBe(`${title}${host}`);
    expect(textContent(link)).not.toMatch(ARROWS);
  });

  it('keeps a link row at least 44pt tall', async () => {
    await render(<SourceLinks urls={[URL]} />);
    const link = screen.getByRole('link') as unknown as HostNode;
    expect(Number(flat(link).minHeight)).toBeGreaterThanOrEqual(44);
  });

  it('dims while pressed and restores on release', async () => {
    await render(<SourceLinks urls={[URL]} />);
    const link = screen.getByRole('link') as unknown as HostNode;
    expect(flat(link).opacity).toBe(1);

    await fireEvent(screen.getByRole('link'), 'pressIn');
    expect(flat(screen.getByRole('link') as unknown as HostNode).opacity).toBeLessThan(1);

    await fireEvent(screen.getByRole('link'), 'pressOut');
    expect(flat(screen.getByRole('link') as unknown as HostNode).opacity).toBe(1);
  });
});
