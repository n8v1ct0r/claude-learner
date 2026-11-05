// src/features/path/path-scroll.ts
//
// Where the Learn tab scrolls so the current lesson is in view: on open, and again when the frontier
// moves on after a lesson. PURE, so the offset math is unit-tested without a layout engine.
//
// onLayout reports a view's y relative to its PARENT. The current node sits inside its row wrapper (below
// the unit header when one shows), and the row wrapper sits in the ScrollView content, so the node's
// offset in the scroll content is rowY + nodeY. The node's own y alone is ~0, which is why the tab never
// scrolled. The primary CTA is pinned over the bottom of the ScrollView, so the node is centred in the
// band ABOVE that button, or top-aligned when it is taller than the band.

/** Where one path row was laid out (each value from an onLayout event). */
export interface RowLayout {
  /** The row wrapper's y in the ScrollView content. */
  rowY?: number;
  /** The node's y inside its row wrapper. */
  nodeY?: number;
  nodeHeight?: number;
}

/** The scroll offset that shows the current node above the pinned CTA, or null until it is all measured. */
export function currentNodeScrollY(
  params: RowLayout & {
    /** The ScrollView's own visible height. */
    viewportHeight: number;
    /** Height of the fixed CTA drawn over the bottom of the ScrollView (0 when there is none). */
    bottomOverlay: number;
  },
): number | null {
  const { rowY, nodeY, nodeHeight, viewportHeight, bottomOverlay } = params;
  if (rowY === undefined || nodeY === undefined || nodeHeight === undefined || viewportHeight <= 0) return null;
  const nodeTop = rowY + nodeY;
  const band = Math.max(0, viewportHeight - bottomOverlay);
  const lead = Math.max(0, (band - nodeHeight) / 2);
  return Math.max(0, Math.round(nodeTop - lead));
}
