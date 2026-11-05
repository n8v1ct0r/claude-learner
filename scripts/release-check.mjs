#!/usr/bin/env node
// scripts/release-check.mjs — preflight for the App Store build. Claude Learners v1.0 is local-only.
//
// EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are inlined into the JS bundle at build time,
// and their presence switches on accounts, sync and AI grading (src/api/supabase.ts). Expo reads them
// from the shell and from .env, .env.local, .env.production and .env.production.local, so a leftover
// developer .env (for example one copied from .env.example) would silently turn the store build into
// an online build. This check fails if any of those sources sets either variable to a non-empty value.
// .env.example is a template that Expo never loads, so it is not checked.
//
// Usage: node scripts/release-check.mjs [projectRoot]   (npm run release:check)

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const VARS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_KEY'];
const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];
const root = process.argv[2] ?? process.cwd();

const problems = [];
for (const name of VARS) {
  if (process.env[name]) problems.push(`${name} is set in the shell environment`);
}
for (const file of ENV_FILES) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match || !VARS.includes(match[1])) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2').trim();
    if (value !== '') problems.push(`${match[1]} is set in ${file}`);
  }
}

if (problems.length > 0) {
  console.error('release:check FAILED: the App Store build must be local-only.');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('Unset the variable or rename the file, then rebuild.');
  process.exit(1);
}
console.log('release:check OK: no Supabase config will be built into the app (local-only v1.0).');
