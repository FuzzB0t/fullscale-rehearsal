// Dev helper for 3a: scroll a chapter page and report where the chapter menu sits (proves "sticky" works).
//   node scripts/portable/_3a-sticky-check.mjs <url> <out.png>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 500 } })).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // Make the page long enough to scroll even with fixture-sized content, without changing the template under test.
  await page.addStyleTag({ content: '.chapter__body { padding-bottom: 1500px; }' });
  const nav = page.locator('.chapter-menu');
  const top = async () => Math.round((await nav.boundingBox()).y);
  const before = await top();
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);
  const after = await top();
  console.log(`menu top at scroll 0: ${before}px; at scroll 400: ${after}px -> ${after === 0 ? 'STICKS to the top' : 'scrolls away'}`);
  await page.screenshot({ path: path.resolve(root, out) });
} finally { await browser.close(); }
