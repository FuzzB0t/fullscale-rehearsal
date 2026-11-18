// Dev helper: print the outerHTML (truncated) of the nearest field container around some label text.
//   node scripts/_html.mjs <admin-path> "<label text>" [maxChars]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [target, text, max = '1800'] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto(`https://fullscale-rehearsal.ddev.site/admin/${target}`, { waitUntil: 'networkidle' });
  const html = await page.evaluate(({ text }) => {
    const el = [...document.querySelectorAll('label, .heading, h2, h3, legend')].find((e) => e.innerText.trim().startsWith(text));
    const box = el?.closest('.field') ?? el?.parentElement;
    return box ? box.outerHTML : 'NOT FOUND';
  }, { text });
  console.log(html.replace(/\s+/g, ' ').slice(0, Number(max)));
} finally { await browser.close(); }
