// content/scripts/build-confetti.ts — author the confetti Lottie as a license-clean original.
//
// We do NOT download a LottieFiles asset. This emits a minimal Bodymovin v5 Lottie document by hand:
// a fixed set of small rectangles that fall, drift, spin, and fade — the classic confetti burst — using
// only position/rotation/opacity keyframes. Output is deterministic (a seeded LCG places the particles),
// so re-running never produces a spurious diff. See assets/licenses/juice.md.
//
// Run:  npx tsx content/scripts/build-confetti.ts
// Output: assets/juice/confetti.lottie.json

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 400;
const H = 400;
const FR = 30; // frames per second
const OP = 60; // total frames (2s)
const COUNT = 28;

// Warm-dark theme accents (0..1 RGB), matching src/design/palette.json so the burst is on-brand.
const COLORS: [number, number, number][] = [
  [0.878, 0.541, 0.42], // clay400  #E08A6B
  [0.898, 0.651, 0.247], // xpGold   #E5A63F
  [0.184, 0.62, 0.608], // gemTeal  #2F9E9B
  [0.898, 0.439, 0.247], // streakFlame #E5703F
  [0.247, 0.608, 0.431], // success  #3F9B6E
];

/** Seeded LCG → deterministic particle layout (no Math.random, so output is reproducible). */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildLayer(index: number, rng: () => number): unknown {
  const startX = round(40 + rng() * (W - 80));
  const driftX = round((rng() - 0.5) * 120);
  const endX = round(startX + driftX);
  const startY = round(-30 - rng() * 80);
  const endY = round(H + 30);
  const delay = Math.round(rng() * 10); // stagger the burst over the first ~10 frames
  const spin = round((rng() < 0.5 ? -1 : 1) * (180 + rng() * 360));
  const color = COLORS[index % COLORS.length];
  const size = round(6 + rng() * 8);

  return {
    ddd: 0,
    ind: index + 1,
    ty: 4,
    nm: `confetti_${index + 1}`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: delay, s: [0], h: 0 },
          { t: delay + 4, s: [100], h: 0 },
          { t: OP - 12, s: [100], h: 0 },
          { t: OP - 1, s: [0], h: 0 },
        ],
      },
      r: {
        a: 1,
        k: [
          { t: delay, s: [0], h: 0 },
          { t: OP - 1, s: [spin], h: 0 },
        ],
      },
      p: {
        a: 1,
        k: [
          { t: delay, s: [startX, startY, 0], h: 0 },
          { t: OP - 1, s: [endX, endY, 0], h: 0 },
        ],
      },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          { ty: 'rc', d: 1, s: { a: 0, k: [size, size * 1.6] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1 }, nm: 'r' },
          { ty: 'fl', c: { a: 0, k: [color[0], color[1], color[2], 1] }, o: { a: 0, k: 100 }, r: 1, nm: 'f' },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
        ],
        nm: 'g',
      },
    ],
    ip: 0,
    op: OP,
    st: 0,
    bm: 0,
  };
}

function main(): void {
  const rng = makeRng(0x5eed);
  const layers = Array.from({ length: COUNT }, (_, i) => buildLayer(i, rng));
  const doc = {
    v: '5.7.0',
    fr: FR,
    ip: 0,
    op: OP,
    w: W,
    h: H,
    nm: 'CCA Quest confetti',
    ddd: 0,
    assets: [],
    layers,
  };
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, '../../assets/juice');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'confetti.lottie.json');
  writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`build-confetti: wrote confetti.lottie.json (${layers.length} particles)`);
}

main();
