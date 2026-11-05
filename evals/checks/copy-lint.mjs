#!/usr/bin/env node
// evals/checks/copy-lint.mjs — GC-13 no-shame guarantee (source side). Zero dependencies.
//
// Scans string LITERALS in src/**, app/**, and content/src/** for any banned-copy phrase
// (evals/banned-copy.json), case-insensitive substring. Only quoted text is inspected, so identifiers
// like `dangerouslySetInnerHTML` never trip the "danger" phrase — only rendered copy does.
//
// A genuinely non-user-facing technical string (a URL, a test fixture, an internal key) can be waived
// with a `// copy-lint-ignore-next-line` comment on the line ABOVE it — used sparingly.
//
// Exit 1 listing every file:line match; exit 0 with a one-line summary. FAIL-CLOSED: a missing or
// malformed banned-copy.json is RED, not a silent pass.
//
// NOTE (repo commit rule): evals/ changes commit SEPARATELY from src|content changes.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const bannedPath = resolve(here, '../banned-copy.json');

const SCAN_ROOTS = ['src', 'app', 'content/src'];
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.expo', '.git', '__snapshots__']);
const IGNORE_MARKER = 'copy-lint-ignore-next-line';

function fail(msg) {
  console.error(`copy-lint: FAIL — ${msg}`);
  process.exit(1);
}

let banned;
try {
  const parsed = JSON.parse(readFileSync(bannedPath, 'utf8'));
  banned = parsed.banned;
} catch (e) {
  fail(`cannot read/parse ${bannedPath}: ${e.message}`);
}
if (!Array.isArray(banned) || banned.length === 0) {
  fail('banned-copy.json has no non-empty "banned" array (fail-closed).');
}
const bannedLower = banned.map((b) => String(b).toLowerCase());

// Match a single-line quoted string: '...', "...", or `...` (escapes respected).
const STRING_RE = /(['"`])(?:\\.|(?!\1).)*?\1/g;

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) walk(join(dir, entry.name), out);
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.');
      if (dot >= 0 && CODE_EXT.has(entry.name.slice(dot))) out.push(join(dir, entry.name));
    }
  }
  return out;
}

const files = [];
for (const root of SCAN_ROOTS) {
  const abs = resolve(repoRoot, root);
  if (existsSync(abs) && statSync(abs).isDirectory()) walk(abs, files);
}
files.sort();

const matches = [];
let scannedFiles = 0;
for (const file of files) {
  scannedFiles += 1;
  const lines = readFileSync(file, 'utf8').split('\n');
  let skipNext = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (line.includes(IGNORE_MARKER)) {
      skipNext = true;
      continue;
    }
    const literals = line.match(STRING_RE);
    if (!literals) continue;
    for (const literal of literals) {
      const inner = literal.slice(1, -1).toLowerCase();
      bannedLower.forEach((phrase, idx) => {
        if (inner.includes(phrase)) {
          matches.push({
            file: relative(repoRoot, file),
            line: i + 1,
            phrase: banned[idx],
            text: literal.length > 60 ? `${literal.slice(0, 57)}…` : literal,
          });
        }
      });
    }
  }
}

if (matches.length > 0) {
  console.error(`copy-lint: ${matches.length} banned-copy match(es) in ${scannedFiles} scanned file(s):`);
  for (const m of matches) {
    console.error(`  ${m.file}:${m.line}  "${m.phrase}"  in  ${m.text}`);
  }
  console.error('Reframe with no-shame copy (evals/banned-copy.json preferred_reframes), or, for a');
  console.error('non-user-facing technical string, add // copy-lint-ignore-next-line above it.');
  process.exit(1);
}

console.log(`copy-lint: OK — no banned copy in ${scannedFiles} file(s) across ${SCAN_ROOTS.join(', ')}.`);
process.exit(0);
