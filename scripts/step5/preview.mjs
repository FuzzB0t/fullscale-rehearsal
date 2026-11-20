// Step 5 helper: open a draft's Preview in the control panel as the drafter and report what the preview renders.
//   node scripts/step5/preview.mjs <cpEditUrl-with-draftId> <out.png>
// Uses the drafter's signed-in browser session (.local/drafter-state.json).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, storageState: path.join(root, '.local', 'drafter-state.json') })).newPage();
  page.setDefaultTimeout(30000);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Preview', exact: false }).first().click();
  await page.waitForSelector('iframe.lp-preview, .lp-preview-container iframe, iframe[src*="token"]', { timeout: 30000 });
  await page.waitForTimeout(4000);
  const frame = page.frames().find((f) => f !== page.mainFrame() && /token|x-craft/.test(f.url()));
  if (!frame) { console.log('No preview frame found. Frames:', page.frames().map((f) => f.url().slice(0, 100))); }
  else {
    const info = await frame.evaluate(() => ({
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map((e) => e.textContent.trim()),
      h2: [...document.querySelectorAll('h2')].map((e) => e.textContent.trim()),
      subtitle: document.querySelector('.chapter__subtitle')?.textContent.trim() ?? null,
      bodyH3: [...document.querySelectorAll('.chapter__body h3')].map((e) => e.textContent.trim()),
      inThisSection: [...document.querySelectorAll('.in-this-section a')].map((e) => e.textContent.trim()),
      bodyLinks: [...document.querySelectorAll('.chapter__body a')].map((e) => e.textContent.trim() + ' -> ' + e.getAttribute('href')),
      bodyStrong: document.querySelectorAll('.chapter__body strong').length,
      bodyEm: document.querySelectorAll('.chapter__body em').length,
      bodyListItems: document.querySelectorAll('.chapter__body li').length,
      resourceCards: [...document.querySelectorAll('.card')].map((e) => e.querySelector('.card__title')?.textContent.trim()),
      heroImage: !!document.querySelector('.chapter__media img'),
      stickyMenuClass: !!document.querySelector('.chapter-menu--sticky'),
      chapterFirstClass: !!document.querySelector('.chapter__title--lead'),
      menuPosition: (() => { const n = document.querySelector('.chapter-menu'); return n ? getComputedStyle(n).position : null; })(),
    }));
    console.log('preview frame url:', frame.url().replace(/token=[^&]+/, 'token=...').slice(0, 140));
    console.log(JSON.stringify(info));
  }
  await page.screenshot({ path: path.resolve(root, out) });
  console.log('screenshot:', out);
} finally { await browser.close(); }
