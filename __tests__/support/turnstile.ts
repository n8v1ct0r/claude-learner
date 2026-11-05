/** Cloudflare's documented public dummy token for automated Turnstile success tests. */
export const TURNSTILE_TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

/** Supabase Auth options that pair with the public always-pass test secret in CI/local stacks. */
export const TURNSTILE_TEST_OPTIONS = {
  options: { captchaToken: TURNSTILE_TEST_TOKEN },
};
