// src/design/tokens.ts — typed API over palette.json (the single source of truth for color).
//
// Everything visual flows through here: colors, spacing, radii, sizes, and — critically for GC-10 —
// a Dynamic-Type-aware typography system. Text is grouped into TIERS with different scaling policy:
//   • body / label   → NO maxFontSizeMultiplier cap (returns undefined) → scales unbounded into the
//                       iOS Accessibility text sizes. Reading content must never be capped.
//   • display / ceremony → capped at 1.5× so large numerals/headlines reflow instead of blowing out
//                       the layout, while still honoring the user's text-size preference up to 1.5×.
//
// Contrast for every foreground/background pair is proven by evals/checks/contrast.mjs, which reads
// the same palette.json — so the numbers here and the accessibility gate can never drift apart.

import type { TextStyle } from 'react-native';

import palette from './palette.json';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = palette.colors;
export type ColorName = keyof typeof colors;

// ---------------------------------------------------------------------------
// Spacing / radii / sizes
// ---------------------------------------------------------------------------

/** Spacing scale (PLAN-rev2 §4.1: 4 / 8 / 12 / 16 / 24). Keys are semantic step names. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
export type SpacingName = keyof typeof spacing;

/** Corner radii — buttons 16, cards 20 (PLAN-rev2 §4.1). */
export const radii = {
  button: 16,
  card: 20,
  pill: 999,
} as const;
export type RadiusName = keyof typeof radii;

/** Fixed sizes. minTouchTarget 44 (Apple HIG / WCAG 2.5.5), chunky button height 52. */
export const sizes = {
  minTouchTarget: 44,
  buttonHeight: 52,
  buttonShadow: 4,
} as const;

// ---------------------------------------------------------------------------
// Typography — Dynamic-Type tiers (GC-10)
// ---------------------------------------------------------------------------

/** Nunito families loaded in app/_layout.tsx via @expo-google-fonts/nunito. */
export const fontFamily = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  extrabold: 'Nunito_800ExtraBold',
} as const;
export type FontWeightName = keyof typeof fontFamily;

/** Base font-size scale in points. Min body is 16 (PLAN-rev2 §4.1: "min body 16pt"). */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;
export type FontSizeName = keyof typeof fontSize;

/**
 * Type tiers and their Dynamic-Type policy.
 *  - maxMultiplier `undefined` ⇒ AppText passes NO cap to RN ⇒ text scales unbounded into AX sizes.
 *  - maxMultiplier `1.5`       ⇒ AppText caps scaling at 1.5× (reflowing display / ceremony numerals).
 * `defaultWeight` and `lineHeightRatio` are the per-tier rendering defaults.
 */
export const typeTiers = {
  body: { maxMultiplier: undefined, defaultWeight: 'regular', lineHeightRatio: 1.4 },
  label: { maxMultiplier: undefined, defaultWeight: 'semibold', lineHeightRatio: 1.3 },
  display: { maxMultiplier: 1.5, defaultWeight: 'extrabold', lineHeightRatio: 1.15 },
  ceremony: { maxMultiplier: 1.5, defaultWeight: 'extrabold', lineHeightRatio: 1.1 },
} as const satisfies Record<
  string,
  { maxMultiplier: number | undefined; defaultWeight: FontWeightName; lineHeightRatio: number }
>;
export type TypeTier = keyof typeof typeTiers;

/** Resolve a weight name to its Nunito font family. */
export function fontFamilyFor(weight: FontWeightName): string {
  return fontFamily[weight];
}

/**
 * The per-tier Dynamic-Type cap to hand to RN's `maxFontSizeMultiplier`.
 * `undefined` means "no cap" (body/label scale unbounded into Accessibility sizes) — this is the
 * value AppText forwards, and AppText never disables font scaling.
 */
export function maxFontMultiplier(tier: TypeTier): number | undefined {
  return typeTiers[tier].maxMultiplier;
}

/**
 * Build a base text style for a (tier, size). Returns fontFamily (tier's default weight), fontSize,
 * and a tier-appropriate lineHeight. Colour and any weight override are applied by AppText so the
 * scale stays declarative here.
 */
export function textStyle(tier: TypeTier, size: FontSizeName): TextStyle {
  const t = typeTiers[tier];
  const fs = fontSize[size];
  return {
    fontFamily: fontFamily[t.defaultWeight],
    fontSize: fs,
    lineHeight: Math.round(fs * t.lineHeightRatio),
  };
}

// ---------------------------------------------------------------------------
// Touchable minimums
// ---------------------------------------------------------------------------

/**
 * Minimum touch-target box. Never returns less than 44pt on either axis, regardless of the
 * requested size (GC-10 / WCAG 2.5.5). Spread onto a Pressable's style.
 */
export function touchable(min: number = sizes.minTouchTarget): {
  minWidth: number;
  minHeight: number;
} {
  const m = Math.max(min, sizes.minTouchTarget);
  return { minWidth: m, minHeight: m };
}

export const tokens = {
  colors,
  spacing,
  radii,
  sizes,
  fontFamily,
  fontSize,
  typeTiers,
} as const;
