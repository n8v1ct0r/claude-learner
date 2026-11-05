import { handleTurnstileChallenge } from './handler.ts';

Deno.serve((request) =>
  handleTurnstileChallenge(request, Deno.env.get('TURNSTILE_SITE_KEY'))
);
