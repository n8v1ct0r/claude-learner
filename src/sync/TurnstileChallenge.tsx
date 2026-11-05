import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import type { CaptchaTokenProvider } from '@/api/auth';
import {
  buildTurnstileWebViewOriginWhitelist,
  createTurnstileTokenBroker,
  isTrustedTurnstileSubframeUrl,
  isTrustedTurnstileChallengeUrl,
  type TurnstileChallengeAttempt,
} from '@/sync/turnstile';

export interface TurnstileChallengeHandle {
  requestToken: CaptchaTokenProvider;
}

interface TurnstileChallengeProps {
  configuredSupabaseUrl: string;
}

/** Hidden, ephemeral WebView used only while a fresh anonymous-auth CAPTCHA token is requested. */
export const TurnstileChallenge = forwardRef<TurnstileChallengeHandle, TurnstileChallengeProps>(
  function TurnstileChallenge({ configuredSupabaseUrl }, ref) {
    const [attempt, setAttempt] = useState<TurnstileChallengeAttempt | null>(null);
    const broker = useMemo(
      () => createTurnstileTokenBroker({ configuredSupabaseUrl, onAttemptChange: setAttempt }),
      [configuredSupabaseUrl],
    );
    const originWhitelist = useMemo(
      () => buildTurnstileWebViewOriginWhitelist(configuredSupabaseUrl),
      [configuredSupabaseUrl],
    );

    useImperativeHandle(ref, () => ({ requestToken: broker.requestToken }), [broker]);
    useEffect(() => () => broker.dispose(), [broker]);

    if (!attempt) return null;

    const allowNavigation = (request: ShouldStartLoadRequest): boolean => {
      const trusted = request.isTopFrame === false
        ? isTrustedTurnstileSubframeUrl(request.url)
        : isTrustedTurnstileChallengeUrl(request.url, configuredSupabaseUrl, attempt.nonce);
      if (!trusted) broker.failCurrentAttempt(new Error('Bot verification attempted an untrusted navigation.'));
      return trusted;
    };

    const receiveMessage = (event: WebViewMessageEvent): void => {
      broker.receiveMessage(event.nativeEvent.url, event.nativeEvent.data);
    };

    return (
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.hiddenChallenge}
      >
        <WebView
          key={attempt.nonce}
          source={{ uri: attempt.url }}
          originWhitelist={originWhitelist}
          onShouldStartLoadWithRequest={allowNavigation}
          onMessage={receiveMessage}
          onError={() => broker.failCurrentAttempt(new Error('Bot verification could not load.'))}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 400) {
              broker.failCurrentAttempt(new Error('Bot verification could not load.'));
            }
          }}
          onContentProcessDidTerminate={() =>
            broker.failCurrentAttempt(new Error('Bot verification was interrupted.'))
          }
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled={false}
          allowsLinkPreview={false}
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          scrollEnabled={false}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  hiddenChallenge: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
    overflow: 'hidden',
  },
});
