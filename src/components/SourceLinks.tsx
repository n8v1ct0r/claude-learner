// src/components/SourceLinks.tsx
//
// The cited sources for a question, shown after answering (lesson Feedback, guided exam feedback) and
// in the exam review (owner rule 2: every question cites public docs, and the learner can check it).
// Each URL is a real link: accessibilityRole="link", a readable page name derived from the URL
// (source-label.ts) with the site host underneath, and a row at least 44pt tall. Links open in the
// in-app browser (expo-web-browser: SFSafariViewController on iOS) and fall back to the system browser.
//
// No arrow glyph beside the name (it rendered as an emoji tile, and link text carries no arrows). The
// pressed dimming is state-driven: NativeWind's Pressable wrapper drops a function-valued `style`.

import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { colors, sizes, spacing } from '@/design/tokens';

import { AppText } from './AppText';
import { isOpenableSourceUrl, sourceLinkLabel } from './source-label';

/** Open a cited source in the in-app browser, or hand it to the system if that is unavailable. */
export async function openSourceUrl(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, { controlsColor: colors.clay400 });
  } catch {
    await Linking.openURL(url).catch(() => undefined);
  }
}

export interface SourceLinksProps {
  /** The question's sourceUrls, straight from the content reader. */
  urls: readonly string[] | undefined;
}

function SourceLink({ url }: { url: string }) {
  const [pressed, setPressed] = useState(false);
  const label = sourceLinkLabel(url);
  const title = label.title;
  // A bare site URL is already titled by its host; don't repeat it underneath.
  const host = label.host === label.title ? '' : label.host;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={host ? `${title}, ${host}` : title}
      accessibilityHint="Opens the source page in your browser"
      onPress={() => void openSourceUrl(url)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        minHeight: sizes.minTouchTarget,
        justifyContent: 'center',
        paddingVertical: spacing.xs,
        opacity: pressed ? 0.7 : 1,
      }}
    >
      <AppText tier="label" size="base" color={colors.clay400} style={{ textDecorationLine: 'underline' }}>
        {title}
      </AppText>
      {host ? (
        <AppText tier="body" size="sm" color={colors.textMuted}>
          {host}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function SourceLinks({ urls }: SourceLinksProps) {
  const links = [...new Set((urls ?? []).map((url) => url.trim()))].filter(isOpenableSourceUrl);
  if (links.length === 0) return null;

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText tier="label" size="xs" color={colors.textSecondary}>
        {links.length === 1 ? 'SOURCE' : 'SOURCES'}
      </AppText>
      {links.map((url) => (
        <SourceLink key={url} url={url} />
      ))}
    </View>
  );
}
