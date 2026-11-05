// src/components/source-label.ts
//
// Pure helpers behind the "Source" links shown after an answer and in the exam review (owner rule 2:
// every question cites public documentation). The content database stores only the URLs, so the
// visible link text is derived from the URL itself: the page slug humanised into a readable name,
// qualified by its parent section or its in-page #anchor, with the site host as secondary text.
//
//   https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
//     -> { title: 'Tool use: Define tools', host: 'platform.claude.com' }
//   https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices#be-clear-and-direct
//     -> { title: 'Claude prompting best practices: Be clear and direct', host: 'platform.claude.com' }
//
// No react-native imports, so node-environment tests can run it over every URL in the content DB.

export interface SourceLinkLabel {
  /** Readable page name, e.g. "Tool use: Define tools". */
  title: string;
  /** Site host without a leading "www.", e.g. "platform.claude.com". */
  host: string;
}

/** Path segments that name no page: docs roots and locale prefixes. */
const STRUCTURAL_SEGMENTS = new Set(['docs', 'doc', 'en', 'en-us', 'en-gb', 'latest']);

/** Words that keep a fixed spelling when a slug is humanised. */
const FIXED_WORDS: Readonly<Record<string, string>> = {
  ai: 'AI',
  api: 'API',
  cli: 'CLI',
  id: 'ID',
  json: 'JSON',
  llm: 'LLM',
  mcp: 'MCP',
  sdk: 'SDK',
  ui: 'UI',
  url: 'URL',
  xml: 'XML',
  anthropic: 'Anthropic',
  claude: 'Claude',
  github: 'GitHub',
};

// https only: host, path, optional query, optional #anchor.
const SOURCE_URL = /^https:\/\/([^/?#\s]+)([^?#\s]*)(?:\?[^#\s]*)?(?:#(\S*))?$/i;

/** The only links the app opens: absolute https URLs. */
export function isOpenableSourceUrl(url: string): boolean {
  return SOURCE_URL.test(url.trim());
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** "claude-prompting-best-practices" -> "Claude prompting best practices". */
export function humanizeSlug(slug: string): string {
  const decoded = safeDecode(slug).replace(/\.(html?|mdx?|pdf)$/i, '').trim();
  // A segment that already reads as a title (a file name with spaces, e.g. a PDF) keeps its casing.
  if (/\s/.test(decoded)) return decoded.replace(/\s+/g, ' ');
  const words = decoded
    .split(/[-_]+/)
    .filter((word) => word.length > 0)
    .map((word) => FIXED_WORDS[word.toLowerCase()] ?? word.toLowerCase());
  if (words.length === 0) return '';
  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}

/** A readable name and host for a cited source URL. */
export function sourceLinkLabel(url: string): SourceLinkLabel {
  const match = SOURCE_URL.exec(url.trim());
  if (!match) return { title: url.trim(), host: '' };

  const host = match[1].toLowerCase().replace(/^www\./, '');
  // Decode BEFORE splitting: object-store URLs encode their "/" separators as %2F and spaces as "+"
  // (e.g. the public exam guide PDF), which would otherwise leak into the visible link name.
  const segments = safeDecode(match[2].replace(/\+/g, ' '))
    .split('/')
    .filter((segment) => segment.trim().length > 0 && !STRUCTURAL_SEGMENTS.has(segment.toLowerCase()));
  // A numeric ID segment (e.g. a course number) names nothing; prefer the slugs around it.
  const named = segments.filter((segment) => !/^\d+$/.test(segment));
  const path = named.length > 0 ? named : segments;

  const last = path[path.length - 1] ?? '';
  // A document file is named by itself; the storage folders above it are not a readable section.
  const isFile = /\.(pdf|html?)$/i.test(last);
  const page = humanizeSlug(last) + (/\.pdf$/i.test(last) ? ' (PDF)' : '');
  const parent = isFile ? '' : humanizeSlug(path[path.length - 2] ?? '');
  const anchor = humanizeSlug(match[3] ?? '');

  if (!humanizeSlug(last)) return { title: host, host };
  if (anchor) return { title: `${page}: ${anchor}`, host };
  if (parent) return { title: `${parent}: ${page}`, host };
  return { title: page, host };
}
