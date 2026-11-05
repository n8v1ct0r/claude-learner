import { Text, type TextProps, type TextStyle } from 'react-native';

import {
  colors,
  fontFamilyFor,
  maxFontMultiplier,
  textStyle,
  type FontSizeName,
  type FontWeightName,
  type TypeTier,
} from '@/design/tokens';

export type AppTextProps = TextProps & {
  /** Dynamic-Type tier — decides the scaling cap (body/label unbounded; display/ceremony capped 1.5×). */
  tier?: TypeTier;
  /** Base size from the type scale (before Dynamic-Type scaling). */
  size?: FontSizeName;
  /** Optional weight override; defaults to the tier's default weight. */
  weight?: FontWeightName;
  /** Text color; defaults to textPrimary (a token proven ≥15:1 on the base surface). */
  color?: string;
};

/**
 * AppText — the ONLY text primitive in the app.
 *
 * Wraps RN <Text>, always applies a Nunito family and a tier-based `maxFontSizeMultiplier`, and
 * never disables font scaling (the RN default of scaling-on is left untouched) — so iOS Dynamic
 * Type is always honored (GC-10). body/label tiers scale unbounded into Accessibility sizes;
 * display/ceremony cap at 1.5× and reflow.
 */
export function AppText({
  tier = 'body',
  size = 'base',
  weight,
  color = colors.textPrimary,
  style,
  ...rest
}: AppTextProps) {
  const base = textStyle(tier, size);
  const resolved: TextStyle = {
    ...base,
    color,
    ...(weight ? { fontFamily: fontFamilyFor(weight) } : null),
  };

  return <Text maxFontSizeMultiplier={maxFontMultiplier(tier)} style={[resolved, style]} {...rest} />;
}
