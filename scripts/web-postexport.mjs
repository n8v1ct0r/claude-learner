// scripts/web-postexport.mjs
//
// Vercel never serves a directory named node_modules, but `expo export --platform web` writes the
// fonts and expo-router images it bundles from packages to dist/assets/node_modules/. Move that folder
// to dist/assets/pkg/ and point the exported bundle at the new path. Run by `npm run web:build`.
//
// The bundle filename carries a content hash and is served with an immutable cache header, so a
// rewritten bundle gets a new hash in its name and index.html is updated to match. Otherwise the
// CDN and browsers keep serving the old bytes under the old name.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const from = join(dist, 'assets', 'node_modules');
const to = join(dist, 'assets', 'pkg');

if (existsSync(from)) renameSync(from, to);

// The web tab bar draws Material Symbols from a 436 KB font that holds every icon. Subset it to the
// glyphs the tab bar names, read from the source so the two cannot drift. Needs fontTools'
// pyftsubset; without it the full font ships and the icons still render.
const fontFiles = walk(join(dist, 'assets', 'pkg'));
const symbolFont = fontFiles.find((f) => /MaterialSymbols_400Regular\.[a-f0-9]{32}\.ttf$/.test(f));
const tabsSource = readFileSync(join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');
const symbolNames = [...tabsSource.matchAll(/material="([a-z0-9_]+)"/g)].map((m) => m[1]);
const symbolMap = JSON.parse(
  readFileSync(join(root, 'node_modules', 'expo-symbols', 'build', 'android', 'symbols.json'), 'utf8'),
);
if (symbolFont && symbolNames.length > 0) {
  const codepoints = symbolNames.map((n) => {
    if (!symbolMap[n]) throw new Error(`web postexport: unknown Material Symbol "${n}"`);
    return `U+${symbolMap[n].toString(16).toUpperCase()}`;
  });
  try {
    const out = `${symbolFont}.subset`;
    execFileSync('pyftsubset', [symbolFont, `--unicodes=${codepoints.join(',')}`, `--output-file=${out}`]);
    const before = statSync(symbolFont).size;
    renameSync(out, symbolFont);
    console.log(
      `web postexport: subset ${relative(dist, symbolFont)} to ${symbolNames.length} icons, ${before} -> ${statSync(symbolFont).size} bytes`,
    );
  } catch (e) {
    console.warn(`web postexport: pyftsubset unavailable or failed, shipping the full icon font (${e.message})`);
  }
}

// Nunito ships Cyrillic and Vietnamese glyphs the app never shows. Keep Latin, punctuation, arrows,
// math and the symbol blocks the lessons and UI use; a missing glyph falls back to the system face.
// The subset is written as WOFF2 (about a quarter smaller over the wire than gzipped TTF, and every
// browser the demo targets reads it); the file keeps its hashed name with a .woff2 extension, and the
// bundle references are rewritten below. Without pyftsubset (or its brotli support) the full TTF ships.
const NUNITO_UNICODES = 'U+0000-017F,U+2000-206F,U+20AC,U+2122,U+2190-22FF,U+25A0-26FF,U+2700-27BF';
const fontRenames = []; // [old /assets/... path, new /assets/... path]
for (const f of fontFiles.filter((p) => /Nunito_\d+\w+\.[a-f0-9]{32}\.ttf$/.test(p))) {
  const woff2 = f.replace(/\.ttf$/, '.woff2');
  try {
    execFileSync('pyftsubset', [
      f,
      `--unicodes=${NUNITO_UNICODES}`,
      '--layout-features=*',
      '--flavor=woff2',
      `--output-file=${woff2}`,
    ]);
    const before = statSync(f).size;
    rmSync(f); // created by this export run
    fontRenames.push([`/${relative(dist, f)}`, `/${relative(dist, woff2)}`]);
    console.log(`web postexport: subset ${relative(dist, f)} to woff2, ${before} -> ${statSync(woff2).size} bytes`);
  } catch (e) {
    rmSync(woff2, { force: true });
    console.warn(`web postexport: pyftsubset unavailable or failed, shipping the full ${relative(dist, f)} (${e.message})`);
  }
}

const jsDir = join(dist, '_expo', 'static', 'js', 'web');
let rewritten = 0;
const renamed = [];
// With async routes the export is several chunks, and the entry chunk names the route chunks it loads.
// A rewritten chunk gets a new hashed name, so every chunk that names it changes too and needs its own
// new name: repeat until every changed file's name matches its content hash.
const chunks = new Map(); // current file name -> { original name, original text, text }
for (const name of readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(join(jsDir, name), 'utf8');
  let after = text.split('/assets/node_modules/').join('/assets/pkg/');
  rewritten += text.split('/assets/node_modules/').length - 1;
  for (const [oldPath, newPath] of fontRenames) after = after.split(oldPath).join(newPath);
  chunks.set(name, { original: name, before: text, text: after });
}
for (let pass = 0; ; pass++) {
  if (pass > 20) throw new Error('web postexport: chunk renames did not settle');
  let changed = false;
  for (const [name, chunk] of [...chunks]) {
    if (chunk.text === chunk.before) continue;
    const hash = createHash('md5').update(chunk.text).digest('hex');
    const newName = name.replace(/-[a-f0-9]{32}\.js$/, `-${hash}.js`);
    if (newName === name) continue;
    if (!/-[a-f0-9]{32}\.js$/.test(name)) throw new Error(`web postexport: cannot rehash ${name}`);
    chunks.delete(name);
    chunks.set(newName, chunk);
    for (const other of chunks.values()) other.text = other.text.split(name).join(newName);
    changed = true;
  }
  if (!changed) break;
}
for (const [name, chunk] of chunks) {
  if (name === chunk.original) continue;
  writeFileSync(join(jsDir, name), chunk.text);
  rmSync(join(jsDir, chunk.original)); // created by this export run
  renamed.push([chunk.original, name]);
}

// The first screen waits for the Nunito faces (useFonts), which the bundle only requests after it has
// downloaded and run. Preload them so they load alongside it. content.json is NOT preloaded: the first
// screen of a first visit (onboarding) does not need it, and as a high-priority preload its 180 KB
// competed with the scripts that screen does need. The web content provider fetches it as soon as the
// root layout chunk runs.
//
// With async routes the first screen also needs the root and tab layouts and the two index routes (the
// Learn tab and onboarding). Load those as deferred scripts ahead of the entry chunk: they download in
// parallel with it and register their modules before it runs, so the router finds them already loaded
// and renders them synchronously (expo's asyncRequire tries a synchronous import first on web). Left to
// the router they are requested only after the entry has run, and each one suspends its screen, which
// React reveals no sooner than 300 ms after the last fallback. Every other route chunk loads on
// navigation. (The pattern matches exactly those four route files today; a new layout or index route
// would also load up front, which is the right default for a layout.)
const firstScreenChunks = [...chunks.keys()].filter((f) => /^(_layout|index)-[a-f0-9]{32}\.js$/.test(f));
const nunitoFiles = walk(join(dist, 'assets', 'pkg')).filter((f) => /Nunito_\d+\w+\.[a-f0-9]{32}\.(ttf|woff2)$/.test(f));
const fontType = (f) => (f.endsWith('.woff2') ? 'woff2' : 'ttf');
const preloads = nunitoFiles.map(
  (f) => `<link rel="preload" href="/${relative(dist, f)}" as="font" type="font/${fontType(f)}" crossorigin>`,
);
const firstScreenScripts = firstScreenChunks.map((f) => `<script src="/_expo/static/js/web/${f}" defer></script>`);

// The static web splash and the prerendered first step (public/index.html) use the same Nunito files,
// so they paint in the app's face. font-display: block, not swap: the faces are preloaded and small, and
// painting the prerendered screen in a fallback face first would reflow it (a layout shift) on swap.
const nunitoFaces = nunitoFiles.map((f) => {
  const family = /(Nunito_\d+\w+)\./.exec(f)[1];
  const format = f.endsWith('.woff2') ? 'woff2' : 'truetype';
  return `@font-face { font-family: '${family}'; src: url('/${relative(dist, f)}') format('${format}'); font-display: block; }`;
});

// The first screen of a first visit (onboarding, step 1) as real HTML, so it paints with the page instead
// of after the scripts have downloaded and run. `npm run web:build` first runs a static (server-rendered)
// export of the same app into .web-prerender/; take the onboarding route's rendered markup and
// react-native-web stylesheet from it. public/index.html shows it, inert and hidden from assistive tech,
// only to a visitor who opens on that step, inside the splash: when the app's own onboarding screen is
// up, the splash (and this copy) is removed over the identical live screen. Without the static export
// the plain splash shows, as before.
const prerenderDir = join(root, '.web-prerender');
const prerenderPage = join(prerenderDir, 'onboarding', 'index.html');
let prerender = null;
if (existsSync(prerenderPage)) {
  const page = readFileSync(prerenderPage, 'utf8');
  const open = '<div id="root">';
  const start = page.indexOf(open);
  const end = page.indexOf('<script', start);
  const css = /<style id="react-native-stylesheet">([\s\S]*?)<\/style>/.exec(page)?.[1];
  const markup = start >= 0 && end > start ? page.slice(start + open.length, end).replace(/<\/div>\s*$/, '') : '';
  if (!css || !markup.includes('When is your exam?')) throw new Error('web postexport: onboarding prerender is not the first step');
  prerender = { css, markup };
  rmSync(prerenderDir, { recursive: true }); // created by this build
  console.log(`web postexport: prerendered onboarding step 1 (${markup.length} bytes of markup)`);
} else {
  console.warn('web postexport: no .web-prerender export; the first visit shows the plain splash');
}

// With the first step already in the page, its faces and its first frame come before the app's
// scripts: the deferred script tags become a loader that, for a visitor on that step, waits until the
// Nunito faces it paints with have loaded and the next frame has drawn it, then requests the scripts in
// their original order (async=false keeps it). Otherwise ~350 KB of script downloads alongside the
// ~57 KB of faces and the screen's first paint waits on the shared bandwidth. Cost: the scripts start
// about one round trip later; they were going to finish after the faces anyway. Any other visitor
// (returning, mid-onboarding) has nothing prerendered to show and requests them at once.
function bootAfterFirstStep(text) {
  const tags = [...text.matchAll(/<script src="(\/_expo\/static\/js\/web\/[^"]+\.js)" defer><\/script>/g)];
  if (tags.length === 0) throw new Error('web postexport: no app script tags in html');
  for (const tag of tags) text = text.replace(tag[0], '');
  const srcs = JSON.stringify(tags.map((t) => t[1]));
  const faces = JSON.stringify(nunitoFiles.map((f) => `16px ${/(Nunito_\d+\w+)\./.exec(f)[1]}`));
  const loader = `<script>(function () {
  var srcs = ${srcs};
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    srcs.forEach(function (src) {
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      document.body.appendChild(el);
    });
  }
  function afterPaint() {
    requestAnimationFrame(function () { setTimeout(boot, 0); });
  }
  var firstStep = document.documentElement.classList.contains('cl-first-step');
  if (!firstStep || !document.fonts || !document.fonts.load) return boot();
  setTimeout(boot, 2000); // never let a slow face hold the app back for long
  Promise.all(${faces}.map(function (face) { return document.fonts.load(face); })).then(afterPaint, afterPaint);
})();</script>`;
  return text.replace('</body>', `${loader}\n</body>`);
}

const htmlFiles = readdirSync(dist).filter((f) => f.endsWith('.html')).map((f) => join(dist, f));
for (const html of htmlFiles) {
  let text = readFileSync(html, 'utf8');
  for (const [oldName, newName] of renamed) text = text.split(oldName).join(newName);
  text = text.replace('/*__WEB_SPLASH_FONTS__*/', nunitoFaces.join('\n      '));
  if (prerender && text.includes('<!--__WEB_PRERENDER__-->')) {
    text = text.replace(
      '<!--__WEB_PRERENDER__-->',
      `<div id="web-prerender" aria-hidden="true" inert>${prerender.markup}</div>`,
    );
    text = text.replace('</head>', `<style id="web-prerender-styles">${prerender.css}</style>\n</head>`);
  }
  if (!text.includes('as="font"')) {
    text = text.replace('</head>', `${preloads.join('\n')}\n</head>`);
    const entryTag = /<script src="\/_expo\/static\/js\/web\/entry-[a-f0-9]{32}\.js" defer><\/script>/.exec(text);
    if (!entryTag) throw new Error('web postexport: no entry script tag in html');
    text = text.replace(entryTag[0], `${firstScreenScripts.join('')}${entryTag[0]}`);
    if (prerender) text = bootAfterFirstStep(text);
  }
  writeFileSync(html, text);
}
// Every renamed chunk must still be reachable: named by an html page or by another chunk.
const allJs = readdirSync(jsDir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(jsDir, f), 'utf8'));
for (const [, newName] of renamed) {
  const inHtml = htmlFiles.some((h) => readFileSync(h, 'utf8').includes(newName));
  if (!inHtml && !allJs.some((text) => text.includes(newName))) {
    throw new Error(`web postexport: nothing references ${newName}`);
  }
}
console.log(
  `web postexport: moved assets/node_modules -> assets/pkg, rewrote ${rewritten} references and ${fontRenames.length} font(s), renamed ${renamed.length} bundle(s)`,
);
