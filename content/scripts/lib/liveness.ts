// content/scripts/lib/liveness.ts
//
// Opt-in URL liveness for content:validate (--check-liveness). Structural citation validation (host on
// the allowlist, https) is always-on and lives in validators.ts; this network probe runs ONLY behind
// the flag because the plan explicitly rejects recurring liveness CI (flaky HEAD checks). It is
// network-tolerant: a genuine offline/timeout is a WARNING, never a build failure. Only a clear
// "the page is gone" response (HTTP >= 400) is reported as dead.

import type { Question } from '../../schema/types';

export interface LivenessOutcome {
  dead: { url: string; questionId: string; status: number }[];
  warnings: { url: string; questionId: string; reason: string }[];
  checked: number;
}

async function probe(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number } | { network: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // HEAD first (cheap); some docs hosts reject HEAD, so fall back to a ranged GET.
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal: controller.signal, redirect: 'follow' });
    }
    return { ok: res.status < 400, status: res.status };
  } catch (err) {
    return { network: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe every unique sourceUrl. Offline/timeout → warning; HTTP >= 400 → dead (reported). */
export async function checkLiveness(
  questions: readonly Question[],
  timeoutMs = 8000,
): Promise<LivenessOutcome> {
  // Map unique URL -> the first question that cites it, so a dead link points at real content.
  const urlToQuestion = new Map<string, string>();
  for (const q of questions) {
    for (const url of q.sourceUrls) {
      if (!urlToQuestion.has(url)) urlToQuestion.set(url, q.id);
    }
  }

  const dead: LivenessOutcome['dead'] = [];
  const warnings: LivenessOutcome['warnings'] = [];
  for (const [url, questionId] of urlToQuestion) {
    const result = await probe(url, timeoutMs);
    if ('network' in result) {
      warnings.push({ url, questionId, reason: result.network });
    } else if (!result.ok) {
      dead.push({ url, questionId, status: result.status });
    }
  }
  return { dead, warnings, checked: urlToQuestion.size };
}
