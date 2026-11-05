import { createRef } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';

import {
  TurnstileChallenge,
  type TurnstileChallengeHandle,
} from '@/sync/TurnstileChallenge';

interface CapturedWebViewProps {
  source: { uri: string };
  originWhitelist: string[];
  onShouldStartLoadWithRequest: (request: { url: string; isTopFrame: boolean }) => boolean;
  onMessage: (event: { nativeEvent: { url: string; data: string } }) => void;
  incognito?: boolean;
  sharedCookiesEnabled?: boolean;
}

let mockWebViewProps: CapturedWebViewProps | null = null;

jest.mock('react-native-webview', () => ({
  WebView: (props: CapturedWebViewProps) => {
    mockWebViewProps = props;
    return null;
  },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: () => new Uint8Array(32).fill(0xab),
}));

const SUPABASE_URL = 'https://qredxvgflpkqqhlhwllf.supabase.co';

function capturedWebView(): CapturedWebViewProps {
  if (!mockWebViewProps) throw new Error('The mocked WebView has not rendered.');
  return mockWebViewProps;
}

describe('TurnstileChallenge WebView navigation policy', () => {
  beforeEach(() => {
    mockWebViewProps = null;
  });

  it('passes every required origin through the wrapper before enforcing frame-level policy', async () => {
    const ref = createRef<TurnstileChallengeHandle>();
    const view = await render(<TurnstileChallenge ref={ref} configuredSupabaseUrl={SUPABASE_URL} />);
    let tokenPromise!: Promise<string>;

    await act(async () => {
      tokenPromise = ref.current!.requestToken();
    });

    const webView = capturedWebView();
    const challengeUrl = webView.source.uri;
    const nonce = new URL(challengeUrl).searchParams.get('nonce');
    expect(nonce).toBe('ab'.repeat(32));
    expect(webView.originWhitelist).toEqual([
      SUPABASE_URL,
      'https://challenges.cloudflare.com',
      'about:blank',
      'about:srcdoc',
    ]);
    expect(webView.onShouldStartLoadWithRequest({ url: challengeUrl, isTopFrame: true })).toBe(true);
    expect(
      webView.onShouldStartLoadWithRequest({
        url: 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/widget',
        isTopFrame: false,
      }),
    ).toBe(true);
    expect(webView.onShouldStartLoadWithRequest({ url: 'about:blank', isTopFrame: false })).toBe(true);
    expect(webView.onShouldStartLoadWithRequest({ url: 'about:srcdoc', isTopFrame: false })).toBe(true);
    expect(webView.incognito).toBeUndefined();
    expect(webView.sharedCookiesEnabled).toBeUndefined();

    await act(async () => {
      webView.onMessage({
        nativeEvent: {
          url: challengeUrl,
          data: JSON.stringify({ type: 'turnstile-token', nonce, token: 'single-use-token' }),
        },
      });
    });
    await expect(tokenPromise).resolves.toBe('single-use-token');
    view.unmount();
  });

  it('rejects a Cloudflare URL when it attempts to replace the trusted top document', async () => {
    const ref = createRef<TurnstileChallengeHandle>();
    const view = await render(<TurnstileChallenge ref={ref} configuredSupabaseUrl={SUPABASE_URL} />);
    let tokenPromise!: Promise<string>;

    await act(async () => {
      tokenPromise = ref.current!.requestToken();
    });
    const rejection = expect(tokenPromise).rejects.toThrow('untrusted navigation');
    const webView = capturedWebView();
    let allowed = true;

    await act(async () => {
      allowed = webView.onShouldStartLoadWithRequest({
        url: 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/widget',
        isTopFrame: true,
      });
    });
    expect(allowed).toBe(false);
    await rejection;
    view.unmount();
  });

  it('rejects a non-Cloudflare subframe even when its origin passes the wrapper allowlist', async () => {
    const ref = createRef<TurnstileChallengeHandle>();
    const view = await render(<TurnstileChallenge ref={ref} configuredSupabaseUrl={SUPABASE_URL} />);
    let tokenPromise!: Promise<string>;

    await act(async () => {
      tokenPromise = ref.current!.requestToken();
    });
    const rejection = expect(tokenPromise).rejects.toThrow('untrusted navigation');
    const webView = capturedWebView();
    let allowed = true;

    await act(async () => {
      allowed = webView.onShouldStartLoadWithRequest({
        url: `${SUPABASE_URL}/storage/v1/object/private-frame`,
        isTopFrame: false,
      });
    });
    expect(allowed).toBe(false);
    await rejection;
    view.unmount();
  });
});
