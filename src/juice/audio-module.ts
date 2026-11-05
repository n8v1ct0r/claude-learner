// src/juice/audio-module.ts: the audio API src/juice/sfx.ts plays its cues through.
//
// Native: expo-audio, required lazily so importing sfx.ts never evaluates the native module (it throws
// where the module is missing, e.g. under Jest, and sfx.ts treats that as "no audio").
// Web: audio-module.web.ts, a small HTMLAudioElement player with the same surface, so the web build
// does not ship expo-audio's recorder, playlist and media-session code for six one-shot cues.

export type CuePlayer = { volume: number; seekTo: (seconds: number) => void; play: () => void };

export interface AudioApi {
  setAudioModeAsync(mode: { playsInSilentMode: boolean; shouldPlayInBackground: boolean }): Promise<void>;
  createAudioPlayer(source: number): CuePlayer;
}

export function loadAudio(): AudioApi {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so import never forces native
  return require('expo-audio') as AudioApi;
}
