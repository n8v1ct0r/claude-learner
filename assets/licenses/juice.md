# Juice assets — provenance & license

All assets in this pack are **original works created for CCA Quest**. There are no third-party
audio or animation dependencies, so there is nothing to attribute and no redistribution terms to
honor. They are released under the same terms as the rest of this repository.

## Sound effects — `assets/juice/sfx/*.wav`

- **Origin:** synthesized from scratch by `content/scripts/build-sfx.ts` (additive sine synthesis +
  exponential-decay envelopes). No sampled or third-party audio is used.
- **Format:** 16-bit PCM mono WAV @ 22050 Hz, each under ~40 kB.
- **Regenerate:** `npx tsx content/scripts/build-sfx.ts` (deterministic — byte-identical output).
- **Files:** `correct`, `incorrect` (deliberately soft/low — no-shame, GC-13), `combo`, `chest`,
  `fanfare`, `legendary`.
- **License:** original work, repository license.

## Celebration animation — `assets/juice/confetti.lottie.json`

- **Origin:** authored by hand as a minimal Lottie (Bodymovin v5) document — simple falling confetti
  rectangles keyed with position/rotation/opacity. Not exported from After Effects, not derived from
  any LottieFiles asset.
- **License:** original work, repository license.
- **Palette:** uses the warm-dark theme accent hues (clay / xp-gold / gem-teal / streak-flame) so the
  celebration reads as part of the same design system.
