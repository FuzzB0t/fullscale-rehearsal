// Screenshots for a site change: the same pages before and after, side by side for a reviewer.
//
//   node scripts/change-shots.mjs <outDir> <prefix> [path ...] [--desktop-only]
//   e.g. node scripts/change-shots.mjs docs/change-previews/bigger-titles before
//        node scripts/change-shots.mjs docs/change-previews/bigger-titles after
//
// With no paths it picks representative pages by following links from the Guides for Teams index: the index, the first
// guide, and the first chapter of that guide. Pass paths (for example /guides-for-teams/digital-equity/getting-started)
// to photograph exactly the pages a change affects. For every page it writes two full-page pictures:
//   <outDir>/<prefix>-<page>.png        at 1200 px wide (a computer screen)
//   <outDir>/<prefix>-<page>-phone.png  at 390 px wide (a phone; the site's phone styles start at 640 px)
// because a change can look right on a computer and wrong on a phone, and a reviewer only sees what is photographed.
// --desktop-only skips the phone pictures.
//
// The site address comes from RENDER_CHECK_BASE (default https://fullscale-rehearsal.ddev.site), like the render check.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const BASE = String(process.env.RENDER_CHECK_BASE ?? 'https://fullscale-rehearsal.ddev.site').replace(/\/$/, '');
const args = process.argv.slice(2);
const desktopOnly = args.includes('--desktop-only');
const [outDir, prefix, ...paths] = args.filter((a) => a !== '--desktop-only');
if (!outDir || !prefix) { console.error('usage: node scripts/change-shots.mjs <outDir> <prefix> [path ...] [--desktop-only]'); process.exit(2); }

const VIEWS = [
  { suffix: '', label: 'computer', viewport: { width: 1200, height: 900 } },
  ...(desktopOnly ? [] : [{ suffix: '-phone', label: 'phone', viewport: { width: 390, height: 844 } }]),
];

function html(p) {
  return execFileSync('curl', ['-sS', '--max-time', '40', ...(process.platform === 'win32' ? ['--ssl-no-revoke'] : []), BASE + p], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
const linksUnder = (page, prefixPath) => [...new Set([...page.matchAll(/href="([^"#?]+)[^"]*"/g)].map((m) => m[1].replace(BASE, '').replace(/\/$/, '')).filter((h) => h.startsWith(prefixPath + '/')))];

// Accept "guides-for-teams/x", "/guides-for-teams/x" or a full URL. Git Bash on Windows rewrites an argument that starts
// with "/" into a Windows path (D:/Program Files/Git/guides-for-teams/x), so that form is undone here too. Passing the
// path without the leading slash avoids the rewrite in the first place.
const normalise = (p) => {
  p = p.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(p) && p.includes('/Git/')) p = p.slice(p.indexOf('/Git/') + 4);
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  return (p.startsWith('/') ? p : `/${p}`).replace(/\/$/, '');
};
let pages = paths.map(normalise);
if (!pages.length) {
  const seed = '/guides-for-teams';
  const guides = linksUnder(html(seed), seed).filter((h) => h.split('/').length === seed.split('/').length + 1);
  const chapters = guides.length ? linksUnder(html(guides[0]), guides[0]) : [];
  pages = [seed, ...(guides[0] ? [guides[0]] : []), ...(chapters[0] ? [chapters[0]] : [])];
}

const { chromium } = await import('@playwright/test');
fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
const browser = await chromium.launch();
try {
  for (const view of VIEWS) {
    const page = await (await browser.newContext({ viewport: view.viewport })).newPage();
    for (const p of pages) {
      const response = await page.goto(BASE + p, { waitUntil: 'networkidle' });
      const name = p.replace(/^\/guides-for-teams\/?/, '').replace(/\//g, '-') || 'index';
      const file = path.join(outDir, `${prefix}-${name}${view.suffix}.png`);
      await page.screenshot({ path: path.resolve(root, file), fullPage: true });
      console.log(`${response?.status()}  ${view.label.padEnd(8)} ${p}  ->  ${file.replace(/\\/g, '/')}`);
    }
  }
} finally { await browser.close(); }
