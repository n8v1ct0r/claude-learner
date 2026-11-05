// content/scripts/build-sfx.ts — synthesize the CCA Quest juice sound set as license-clean originals.
//
// We deliberately do NOT ship third-party audio. Every one-shot in src/juice/sfx.ts is generated here
// from first principles (additive sine synthesis + a short exponential decay envelope) so the committed
// .wav files are 100% original works with no attribution/redistribution obligations (see
// assets/licenses/juice.md). The palette is warm and gentle by design (GC-13 no-shame): the "incorrect"
// cue is a soft low blip, never a harsh buzzer.
//
// Run:  npx tsx content/scripts/build-sfx.ts
// Output: assets/juice/sfx/*.wav — 16-bit PCM mono @ 22050 Hz, all under ~40 kB.
//
// Regenerating is deterministic: identical inputs produce byte-identical files, so re-running never
// creates a spurious diff.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;

/** One additive partial: a frequency (Hz) and its relative amplitude (0..1). */
interface Partial {
  freq: number;
  amp: number;
}

/** A tone segment: when it starts (s), how long it lasts (s), and its partials. */
interface Tone {
  start: number;
  duration: number;
  partials: Partial[];
  /** Peak gain for this tone before the shared master gain. */
  gain?: number;
}

/**
 * Render a list of tones to a mono Float32 buffer. Each tone uses an exponential-decay envelope with a
 * tiny linear attack so onsets never click. Tones sum where they overlap; the master pass normalizes
 * and soft-clips so nothing exceeds full scale.
 */
function renderTones(tones: Tone[], totalDuration: number): Float32Array {
  const total = Math.ceil(totalDuration * SAMPLE_RATE);
  const buffer = new Float32Array(total);
  const attack = Math.round(0.004 * SAMPLE_RATE); // 4 ms click-free onset

  for (const tone of tones) {
    const startSample = Math.round(tone.start * SAMPLE_RATE);
    const len = Math.round(tone.duration * SAMPLE_RATE);
    const gain = tone.gain ?? 1;
    for (let i = 0; i < len; i += 1) {
      const idx = startSample + i;
      if (idx >= total) break;
      const t = i / SAMPLE_RATE;
      // Exponential decay to ~0 by the end of the tone; short linear attack at the head.
      const decay = Math.exp(-3.2 * (i / len));
      const env = (i < attack ? i / attack : 1) * decay;
      let sample = 0;
      for (const p of tone.partials) sample += p.amp * Math.sin(2 * Math.PI * p.freq * t);
      buffer[idx] += sample * env * gain;
    }
  }

  // Normalize to 0.9 peak, then soft-clip (tanh) to tame any residual sum overshoot.
  let peak = 0;
  for (let i = 0; i < total; i += 1) peak = Math.max(peak, Math.abs(buffer[i]));
  const norm = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < total; i += 1) buffer[i] = Math.tanh(buffer[i] * norm);
  return buffer;
}

/** Encode a mono Float32 buffer as a 16-bit PCM WAV byte buffer. */
function encodeWav(samples: Float32Array): Buffer {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format = PCM
  buffer.writeUInt16LE(1, 22); // channels = mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

// Note frequencies (equal temperament) used to compose the cues.
const N = {
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  E6: 1318.5,
  G6: 1568.0,
  A4: 440.0,
  C4: 261.63,
  E4: 329.63,
  G4: 392.0,
};

/** A single note = a fundamental plus a soft octave partial for warmth. */
function note(freq: number, start: number, duration: number, gain = 1): Tone {
  return { start, duration, gain, partials: [{ freq, amp: 1 }, { freq: freq * 2, amp: 0.18 }] };
}

interface Cue {
  name: string;
  tones: Tone[];
  duration: number;
}

// The six one-shots. Warm, short, and gentle — the "incorrect" cue is deliberately the softest and
// lowest, a reassuring "noted" rather than a punishment (GC-13).
const CUES: Cue[] = [
  // correct — a bright rising two-note chirp.
  { name: 'correct', duration: 0.26, tones: [note(N.E5, 0, 0.12), note(N.A5, 0.09, 0.16)] },
  // incorrect (gentle) — one soft, low, mid-short blip. No dissonance, no descending "failure" slide.
  { name: 'incorrect', duration: 0.22, tones: [note(N.G4, 0, 0.2, 0.55)] },
  // combo-flare — a quick three-note upward arpeggio.
  { name: 'combo', duration: 0.34, tones: [note(N.C5, 0, 0.1), note(N.E5, 0.08, 0.1), note(N.G5, 0.16, 0.16)] },
  // chest-open — a soft sparkle: a low body note plus two high shimmer partials.
  {
    name: 'chest',
    duration: 0.4,
    tones: [note(N.C5, 0, 0.24, 0.8), note(N.C6, 0.06, 0.22, 0.5), note(N.E6, 0.14, 0.22, 0.35)],
  },
  // ceremony-fanfare — a warm major triad that blooms upward.
  {
    name: 'fanfare',
    duration: 0.6,
    tones: [note(N.C5, 0, 0.5, 0.7), note(N.E5, 0.08, 0.46, 0.6), note(N.G5, 0.16, 0.42, 0.6), note(N.C6, 0.26, 0.34, 0.5)],
  },
  // legendary — a longer shimmering ascent, the biggest moment in the app.
  {
    name: 'legendary',
    duration: 0.9,
    tones: [
      note(N.C5, 0, 0.7, 0.55),
      note(N.G5, 0.12, 0.6, 0.55),
      note(N.C6, 0.26, 0.5, 0.55),
      note(N.E6, 0.4, 0.42, 0.45),
      note(N.G6, 0.54, 0.36, 0.4),
    ],
  },
];

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, '../../assets/juice/sfx');
  mkdirSync(outDir, { recursive: true });
  for (const cue of CUES) {
    const wav = encodeWav(renderTones(cue.tones, cue.duration));
    const outPath = resolve(outDir, `${cue.name}.wav`);
    writeFileSync(outPath, wav);
    // eslint-disable-next-line no-console
    console.log(`build-sfx: wrote ${cue.name}.wav (${wav.length} bytes)`);
  }
}

main();
