const TURNSTILE_SCRIPT_ORIGIN = 'https://challenges.cloudflare.com';
const SITE_KEY_RE = /^[A-Za-z0-9._-]{10,128}$/;
const NONCE_RE = /^[a-f0-9]{64}$/;

const BASE_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
};

function text(status: number, body: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      ...BASE_SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function randomCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function asJavaScriptString(value: string): string {
  // Keep server-controlled values from ever closing the inline script context.
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function challengeHtml(siteKey: string, requestNonce: string, cspNonce: string): string {
  const safeSiteKey = asJavaScriptString(siteKey);
  const safeRequestNonce = asJavaScriptString(requestNonce);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <title>Claude Learner verification</title>
  <style nonce="${cspNonce}">
    html, body { background: transparent; height: 100%; margin: 0; overflow: hidden; }
    #turnstile-container { min-height: 1px; min-width: 1px; }
  </style>
  <script nonce="${cspNonce}">
    'use strict';
    const requestNonce = ${safeRequestNonce};
    const siteKey = ${safeSiteKey};

    function post(message) {
      const bridge = window.ReactNativeWebView;
      if (!bridge || typeof bridge.postMessage !== 'function') return;
      bridge.postMessage(JSON.stringify(message));
    }

    function boundedCode(value, fallback) {
      if (typeof value !== 'string') return fallback;
      const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64);
      return cleaned || fallback;
    }

    function onTurnstileReady() {
      post({ type: 'turnstile-ready', nonce: requestNonce });
      try {
        window.turnstile.render('#turnstile-container', {
          sitekey: siteKey,
          action: 'anonymous-sign-in',
          appearance: 'interaction-only',
          execution: 'render',
          retry: 'auto',
          callback: function (token) {
            if (typeof token !== 'string' || token.length === 0) {
              post({ type: 'turnstile-error', nonce: requestNonce, code: 'empty-token' });
              return;
            }
            post({ type: 'turnstile-token', nonce: requestNonce, token: token });
          },
          'error-callback': function (code) {
            post({
              type: 'turnstile-error',
              nonce: requestNonce,
              code: boundedCode(code, 'challenge-error'),
            });
          },
          'expired-callback': function () {
            post({ type: 'turnstile-error', nonce: requestNonce, code: 'token-expired' });
          },
          'timeout-callback': function () {
            post({ type: 'turnstile-error', nonce: requestNonce, code: 'challenge-timeout' });
          },
        });
      } catch (_error) {
        post({ type: 'turnstile-error', nonce: requestNonce, code: 'render-failed' });
      }
    }

    window.onTurnstileReady = onTurnstileReady;
  </script>
  <script
    nonce="${cspNonce}"
    src="${TURNSTILE_SCRIPT_ORIGIN}/turnstile/v0/api.js?onload=onTurnstileReady&amp;render=explicit"
    async
    defer
  ></script>
</head>
<body>
  <div id="turnstile-container" aria-label="Security verification"></div>
</body>
</html>`;
}

export function handleTurnstileChallenge(request: Request, siteKey: string | undefined): Response {
  if (request.method !== 'GET') {
    return text(405, 'Method not allowed', { Allow: 'GET' });
  }

  if (!siteKey || !SITE_KEY_RE.test(siteKey)) {
    return text(500, 'Challenge unavailable');
  }

  const url = new URL(request.url);
  const nonces = url.searchParams.getAll('nonce');
  const onlyNonceParameter = Array.from(url.searchParams.keys()).every((key) => key === 'nonce');
  if (nonces.length !== 1 || !onlyNonceParameter || !NONCE_RE.test(nonces[0])) {
    return text(400, 'Invalid challenge request');
  }

  const cspNonce = randomCspNonce();
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${cspNonce}' 'strict-dynamic' ${TURNSTILE_SCRIPT_ORIGIN}`,
    `connect-src ${TURNSTILE_SCRIPT_ORIGIN}`,
    `frame-src ${TURNSTILE_SCRIPT_ORIGIN}`,
    `style-src 'nonce-${cspNonce}'`,
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

  return new Response(challengeHtml(siteKey, nonces[0], cspNonce), {
    status: 200,
    headers: {
      ...BASE_SECURITY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': csp,
    },
  });
}
