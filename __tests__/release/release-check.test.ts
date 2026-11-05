// scripts/release-check.mjs guards the local-only App Store build: it must fail whenever Supabase
// config could be built into the bundle, from the shell or from any .env file Expo loads.
import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../../scripts/release-check.mjs');

function run(files: Record<string, string>, extraEnv: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'release-check-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  const env: NodeJS.ProcessEnv = { ...process.env, ...extraEnv };
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('EXPO_PUBLIC_SUPABASE_') && !(key in extraEnv)) delete env[key];
  }
  return spawnSync(process.execPath, [SCRIPT, dir], { env, encoding: 'utf8' });
}

describe('release:check (local-only App Store build)', () => {
  it('passes with no Supabase config anywhere, ignoring the .env.example template', () => {
    const result = run({ '.env.example': 'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54341\n' });
    expect(result.status).toBe(0);
  });

  it('fails when a loaded .env file sets the Supabase URL', () => {
    const result = run({ '.env': 'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54341\n' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_SUPABASE_URL is set in .env');
  });

  it('fails when .env.production.local sets the key, even quoted', () => {
    const result = run({ '.env.production.local': 'export EXPO_PUBLIC_SUPABASE_KEY="sb_publishable_x"\n' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_SUPABASE_KEY is set in .env.production.local');
  });

  it('treats empty assignments as unset', () => {
    const result = run({ '.env': 'EXPO_PUBLIC_SUPABASE_URL=\nEXPO_PUBLIC_SUPABASE_KEY=""\n' });
    expect(result.status).toBe(0);
  });

  it('fails when the shell environment sets either variable', () => {
    const result = run({}, { EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_x' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_SUPABASE_KEY is set in the shell environment');
  });
});
