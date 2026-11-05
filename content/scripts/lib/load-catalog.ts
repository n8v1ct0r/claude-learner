// content/scripts/lib/load-catalog.ts
//
// The filesystem side of the content pipeline (kept OUT of validators.ts so those stay pure and
// jest-friendly). Discovers every authored content module under content/src, imports it so its
// define*() calls register into the singleton catalog (content/src/index.ts), and returns the
// resulting snapshot plus any modules that threw at import (a zod failure or a D3 conflict surfaces
// here). Also reads/writes the append-only id-registry.json ledger.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getCatalog } from '../../src/index';
import type { CatalogSnapshot } from '../../schema/types';
import type { RegistryEntry } from './validators';

const CONTENT_SRC_DIR = resolve(__dirname, '../../src');
const REGISTRY_PATH = resolve(__dirname, '../../id-registry.json');
const REGISTRY_FILE = 'content/id-registry.json';

// The registry module itself is imported statically above; importing it again as "content" would be
// a no-op but pointless. Test/type/declaration files never register content.
function isContentModule(absPath: string): boolean {
  if (!absPath.endsWith('.ts')) return false;
  if (absPath.endsWith('.d.ts') || absPath.endsWith('.test.ts') || absPath.endsWith('.spec.ts')) return false;
  if (absPath === resolve(CONTENT_SRC_DIR, 'index.ts')) return false;
  return true;
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(abs));
    } else if (entry.isFile()) {
      found.push(abs);
    }
  }
  return found;
}

export interface LoadResult {
  catalog: CatalogSnapshot;
  loadErrors: { file: string; error: string }[];
  moduleCount: number;
}

/**
 * Imports every content module (sorted, for deterministic error order). Registration is idempotent by
 * value, so importing a lesson both standalone and via its course is harmless. A throw at import
 * (invalid zod, D3 conflict) is captured — never swallowed — so the CLI can report it and fail.
 */
export async function loadCatalog(srcDir: string = CONTENT_SRC_DIR): Promise<LoadResult> {
  const files = existsSync(srcDir) ? walk(srcDir).filter(isContentModule).sort() : [];
  const loadErrors: { file: string; error: string }[] = [];
  for (const file of files) {
    try {
      await import(pathToFileURL(file).href);
    } catch (err) {
      loadErrors.push({ file, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { catalog: getCatalog(), loadErrors, moduleCount: files.length };
}

// --- id-registry.json ledger I/O -------------------------------------------------------------------

interface RegistryFile {
  note?: string;
  entries: RegistryEntry[];
}

const REGISTRY_NOTE =
  'Append-only ID ledger (one-way door D3). Every course/unit/lesson/question/exam slug ever ' +
  'registered lives here; content:validate fails if a recorded id vanishes (a rename or delete) and, ' +
  'without --update-registry, if a new id is not yet recorded. Written only by content:validate ' +
  '--update-registry. Deprecate, never rename or delete.';

export function readRegistry(): RegistryEntry[] {
  if (!existsSync(REGISTRY_PATH)) return [];
  const parsed = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as RegistryFile;
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

export function writeRegistry(entries: RegistryEntry[]): void {
  const doc: RegistryFile = { note: REGISTRY_NOTE, entries };
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(doc, null, 2)}\n`);
}

export const paths = { CONTENT_SRC_DIR, REGISTRY_PATH, REGISTRY_FILE };
