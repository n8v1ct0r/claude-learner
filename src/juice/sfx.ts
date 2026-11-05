// src/juice/sfx.ts — one-shot sound-effect player for the juice layer (expo-audio).
//
// The sound set is six short, original cues synthesized by content/scripts/build-sfx.ts (see
// assets/licenses/juice.md — no third-party audio). Each cue gets ONE long-lived AudioPlayer that we
// rewind-and-replay, so re-triggering has no allocation cost and never overlaps a half-played instance.
//
// Two gates, checked on every play:
//   • settings.soundEnabled — the global user toggle (default ON). The SAME preference the settings
//     surface flips (src/features/settings/JuiceSettings.tsx).
//   • exam-sim mute — the mock-exam simulator sets this so the timed test is silent (no cue leaks into
//     an exam). It is a transient runtime flag, not a persisted preference.
//
// iOS silent-switch: we set `playsInSilentMode: false`, so cues honor the hardware mute switch — juice
// should never blast audio when the phone is silenced. Everything is lazy and fail-safe: players and the
// native module are only touched on first play, wrapped so a missing native module (e.g. under Jest) or a
// device without audio simply no-ops instead of throwing into a render path.

import { useSettingsStore } from '@/state/settings';

import { loadAudio, type CuePlayer } from './audio-module';

export type SfxCue = 'correct' | 'incorrect' | 'combo' | 'chest' | 'fanfare' | 'legendary';

// Per-cue peak volume (0..1). The gentle "incorrect" cue is quietest by design (GC-13 no-shame).
const CUE_VOLUME: Record<SfxCue, number> = {
  correct: 0.7,
  incorrect: 0.45,
  combo: 0.7,
  chest: 0.8,
  fanfare: 0.85,
  legendary: 0.9,
};

// Transient exam-sim mute (not persisted). Set true while a mock-exam attempt is on screen.
let examMuted = false;

/** Silence every cue for the duration of a mock-exam simulation (call false on unmount). */
export function setExamSfxMuted(value: boolean): void {
  examMuted = value;
}

export function isExamSfxMuted(): boolean {
  return examMuted;
}

/** Both gates: the persisted global toggle AND the transient exam mute. */
function canPlay(): boolean {
  if (examMuted) return false;
  return useSettingsStore.getState().soundEnabled;
}

// Lazily-resolved require()s. Kept in a function (not module scope) so importing this file never forces
// Metro's asset requires or the native module to evaluate — important because Ceremony imports this
// module and is rendered in unit tests.
function cueSource(cue: SfxCue): number {
  switch (cue) {
    case 'correct':
      return require('../../assets/juice/sfx/correct.wav');
    case 'incorrect':
      return require('../../assets/juice/sfx/incorrect.wav');
    case 'combo':
      return require('../../assets/juice/sfx/combo.wav');
    case 'chest':
      return require('../../assets/juice/sfx/chest.wav');
    case 'fanfare':
      return require('../../assets/juice/sfx/fanfare.wav');
    case 'legendary':
      return require('../../assets/juice/sfx/legendary.wav');
  }
}

type ExpoAudioPlayer = CuePlayer;

const players: Partial<Record<SfxCue, ExpoAudioPlayer>> = {};
let audioModeReady = false;

/** Best-effort: honor the iOS silent switch and keep cues in the foreground. Runs at most once. */
function prepareAudioMode(): void {
  if (audioModeReady) return;
  audioModeReady = true;
  try {
    const { setAudioModeAsync } = loadAudio();
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false }).catch(() => {});
  } catch {
    // Native module unavailable — nothing to configure.
  }
}

function getPlayer(cue: SfxCue): ExpoAudioPlayer | null {
  const existing = players[cue];
  if (existing) return existing;
  try {
    prepareAudioMode();
    const { createAudioPlayer } = loadAudio();
    const player = createAudioPlayer(cueSource(cue));
    player.volume = CUE_VOLUME[cue];
    players[cue] = player;
    return player;
  } catch {
    return null;
  }
}

/** Play a cue once (rewinds first so rapid re-triggers restart cleanly). No-op when gated out. */
export function playSfx(cue: SfxCue): void {
  if (!canPlay()) return;
  try {
    const player = getPlayer(cue);
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {
    // Never let a sound effect throw into a UI callback.
  }
}

// Named convenience wrappers — the vocabulary the rest of the app calls.
export const playCorrect = (): void => playSfx('correct');
/** Gentle, quiet cue for an incorrect answer — never a harsh buzzer (GC-13). */
export const playIncorrect = (): void => playSfx('incorrect');
export const playCombo = (): void => playSfx('combo');
export const playChest = (): void => playSfx('chest');
export const playFanfare = (): void => playSfx('fanfare');
export const playLegendary = (): void => playSfx('legendary');

/** Test seam: drop cached players so a fresh gate/mock is exercised. */
export function __resetSfxForTests(): void {
  for (const key of Object.keys(players) as SfxCue[]) delete players[key];
  audioModeReady = false;
  examMuted = false;
}
