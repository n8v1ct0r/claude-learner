// src/juice/haptics.web.ts: the web build's haptics.
//
// expo-haptics on web calls navigator.vibrate, which most desktop browsers ignore and Chrome logs as
// a console error when it fires before the first tap. The web demo has no haptics, so these are
// no-ops with the same exports as src/juice/haptics.ts. Native keeps haptics.ts unchanged.

/** Light impact: a no-op on web. */
export function tapLight(): void {}

/** Medium impact: a no-op on web. */
export function tapMedium(): void {}

/** Success notification: a no-op on web. */
export function celebrate(): void {}
