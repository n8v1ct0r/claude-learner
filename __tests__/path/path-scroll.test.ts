// __tests__/path/path-scroll.test.ts — where the Learn tab scrolls on open (smoke fix).
//
// onLayout reports y relative to the PARENT view. The Learn tab used the current node's own y, which is
// relative to its row wrapper (0, or just below the unit header), so the computed target was always 0
// and the tab never scrolled: the current node sat under the fixed "Start lesson" / "Continue" button.
// The target now measures the node from the top of the scroll content (row y + node y) and centres it in
// the band above that button.

import { describe, expect, it } from '@jest/globals';

import { currentNodeScrollY } from '@/features/path/path-scroll';

// iPhone-sized viewport under the header stats, with the pinned CTA (padding + 3D button) over its
// bottom 110pt: a 530pt band is visible above the button.
const layout = { rowY: 1480, nodeY: 36, nodeHeight: 96, viewportHeight: 640, bottomOverlay: 110 };

describe('currentNodeScrollY', () => {
  it('measures the node from the top of the scroll content: row offset plus the node inside its row', () => {
    // Node top 1480 + 36 = 1516; centred in the 530pt band: (530 - 96) / 2 = 217 above it.
    expect(currentNodeScrollY(layout)).toBe(1516 - 217);
  });

  it('brings a node that starts below the first screen into view (the old target, 0, never did)', () => {
    const y = currentNodeScrollY(layout) ?? 0;
    const nodeTop = layout.rowY + layout.nodeY;
    expect(nodeTop).toBeGreaterThan(layout.viewportHeight);
    expect(y + layout.viewportHeight).toBeGreaterThan(nodeTop + layout.nodeHeight);
  });

  it('leaves the whole node visible above the fixed button', () => {
    const cases = [
      layout,
      { ...layout, rowY: 900, nodeY: 0 },
      { ...layout, viewportHeight: 480, bottomOverlay: 140 }, // compact phone
      { ...layout, nodeHeight: 180, bottomOverlay: 200 }, // large Dynamic Type: taller node and button
    ];
    for (const params of cases) {
      const y = currentNodeScrollY(params);
      if (y === null) throw new Error('expected a scroll target');
      const topOnScreen = params.rowY + params.nodeY - y;
      expect(topOnScreen).toBeGreaterThanOrEqual(0);
      expect(topOnScreen + params.nodeHeight).toBeLessThanOrEqual(params.viewportHeight - params.bottomOverlay);
    }
  });

  it('never scrolls above the top of the content', () => {
    expect(currentNodeScrollY({ ...layout, rowY: 120, nodeY: 0 })).toBe(0);
  });

  it('top-aligns a node taller than the visible band', () => {
    expect(currentNodeScrollY({ ...layout, nodeHeight: 600 })).toBe(1516);
  });

  it('waits until the node, its row and the viewport are measured', () => {
    expect(currentNodeScrollY({ ...layout, rowY: undefined })).toBeNull();
    expect(currentNodeScrollY({ ...layout, nodeY: undefined })).toBeNull();
    expect(currentNodeScrollY({ ...layout, nodeHeight: undefined })).toBeNull();
    expect(currentNodeScrollY({ ...layout, viewportHeight: 0 })).toBeNull();
  });
});
