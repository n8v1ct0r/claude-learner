#!/usr/bin/env node
// evals/checks/contrast.mjs — GC-10 WCAG contrast gate. Zero dependencies (node stdlib only).
//
// Reads src/design/palette.json (the single source of truth for color), then computes the
// WCAG 2.x relative-luminance contrast ratio for EVERY declared foreground/background pair and
// asserts each meets its own `minRatio` (4.5 for body text, 3.0 for large text / icons).
//
// FAIL-CLOSED by design: a missing, malformed, or empty `pairs` array is RED, never green — a
// broken/empty declaration must not silently pass. Exit 1 lists the offending pairs; exit 0 prints
// a one-line summary. Wired into GC-10 via evals/run.sh.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const palettePath = resolve(here, '../../src/design/palette.json');

function fail(msg) {
  console.error(`contrast: FAIL — ${msg}`);
  process.exit(1);
}

let palette;
try {
  palette = JSON.parse(readFileSync(palettePath, 'utf8'));
} catch (e) {
  fail(`cannot read/parse ${palettePath}: ${e.message}`);
}

const colors = palette.colors ?? {};
const pairs = palette.pairs;

// fail-closed: an empty or missing pairs array is a hard RED, not an accidental green.
if (!Array.isArray(pairs) || pairs.length === 0) {
  fail('palette.json has no non-empty "pairs" array (fail-closed).');
}

// Resolve a pair entry (a color name in `colors`, or a literal #rrggbb) to a hex string.
function toHex(name) {
  const v = Object.prototype.hasOwnProperty.call(colors, name) ? colors[name] : name;
  if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) {
    fail(`color "${name}" does not resolve to a #rrggbb value (got ${JSON.stringify(v)}).`);
  }
  return v;
}

// WCAG 2.x sRGB channel linearization.
function channel(c8) {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fgHex, bgHex) {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const failures = [];
for (const p of pairs) {
  if (!p || typeof p.fg !== 'string' || typeof p.bg !== 'string') {
    fail(`malformed pair entry: ${JSON.stringify(p)} (needs string "fg" and "bg").`);
  }
  const min = typeof p.minRatio === 'number' ? p.minRatio : 4.5;
  const r = ratio(toHex(p.fg), toHex(p.bg));
  const label = `${p.fg} on ${p.bg}`;
  // 1e-9 tolerance so a value that is exactly the threshold in real arithmetic still passes.
  if (r + 1e-9 < min) {
    failures.push(
      `  ${label}: ${r.toFixed(2)}:1 < required ${min}:1${p.usage ? `  — ${p.usage}` : ''}`,
    );
  }
}

if (failures.length) {
  console.error(`contrast: ${failures.length}/${pairs.length} pair(s) FAIL WCAG:`);
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(
  `contrast: OK — all ${pairs.length} pairs meet their WCAG minimum (4.5 body / 3.0 large).`,
);
process.exit(0);
