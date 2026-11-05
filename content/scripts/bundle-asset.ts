// content/scripts/bundle-asset.ts — content:bundle
//
// Copies the built content database (content/dist/content.db, a gitignored build artifact) to the
// committed app asset at assets/content/content.db, which Metro bundles into `expo export` output and
// expo-sqlite's SQLiteProvider copies onto the device at first launch (see src/db/content-provider.tsx).
//
// content:bundle runs content:build first (see package.json), so this script only performs the copy.
// The asset is committed so `npx expo export` always finds it from a clean checkout; regenerate it with
// `npm run content:bundle` whenever content changes (its meta.content_version tracks the authored set).

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..', '..');
const source = join(repoRoot, 'content', 'dist', 'content.db');
const destDir = join(repoRoot, 'assets', 'content');
const dest = join(destDir, 'content.db');

if (!existsSync(source)) {
  console.error(`content:bundle — missing ${source}; run \`npm run content:build\` first.`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);
console.error(`content:bundle -> ${dest}`);
