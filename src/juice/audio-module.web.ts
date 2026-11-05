// src/juice/audio-module.web.ts: the web build's audio API for src/juice/sfx.ts (see audio-module.ts).
// It does what expo-audio's web player does for a one-shot cue: resolve the bundled asset to its URL
// and play it through an HTMLAudioElement.
import { Asset } from 'expo-asset';

import type { AudioApi, CuePlayer } from './audio-module';

export type { AudioApi, CuePlayer } from './audio-module';

class WebCuePlayer implements CuePlayer {
  private readonly element: HTMLAudioElement;

  constructor(uri: string) {
    this.element = new Audio(uri);
    this.element.preload = 'auto';
  }

  get volume(): number {
    return this.element.volume;
  }

  set volume(value: number) {
    this.element.volume = Math.min(1, Math.max(0, value));
  }

  seekTo(seconds: number): void {
    this.element.currentTime = seconds;
  }

  play(): void {
    // Autoplay rules can reject before the first tap; a cue is never worth an error.
    void this.element.play().catch(() => undefined);
  }
}

const webAudio: AudioApi = {
  // No silent switch or background mode on the web.
  setAudioModeAsync: async () => undefined,
  createAudioPlayer: (source: number) => new WebCuePlayer(Asset.fromModule(source).uri),
};

export function loadAudio(): AudioApi {
  return webAudio;
}
