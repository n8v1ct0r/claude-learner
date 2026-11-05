#!/usr/bin/env node
// scripts/listing-check.mjs — checks docs/app-store/listing.md against App Store Connect's limits.
//
// Reads each "## <Field> (<limit>)" section's text (up to the next "## " heading) and fails if any
// field is empty or over its limit. The app name is read from the Identity table. Apple counts
// characters, so this counts Unicode code points.
//
// Usage: node scripts/listing-check.mjs [path]   (npm run listing:check)

import { readFileSync } from 'node:fs';

const path = process.argv[2] ?? 'docs/app-store/listing.md';
const source = readFileSync(path, 'utf8');
const length = (text) => [...text].length;

const fields = [];
const nameRow = /^\| App name \((\d+)\) \| (.+?) \|$/m.exec(source);
if (nameRow) fields.push({ name: 'App name', limit: Number(nameRow[1]), text: nameRow[2].trim() });

for (const match of source.matchAll(/^## (.+?) \((\d+)\)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)) {
  fields.push({ name: match[1], limit: Number(match[2]), text: match[3].trim() });
}

let failed = false;
for (const { name, limit, text } of fields) {
  const used = length(text);
  const ok = used > 0 && used <= limit;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${used}/${limit}${used === 0 ? ' (empty)' : ''}`);
}
if (fields.length < 5) {
  console.error(`listing:check expected at least 5 limited fields, found ${fields.length}`);
  process.exit(1);
}
process.exit(failed ? 1 : 0);
