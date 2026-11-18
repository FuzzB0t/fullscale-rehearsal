// Dev helper: open a CP page, click a selector, screenshot the viewport.
//   node scripts/_clickshot.mjs <admin-path> "<css selector>" <out.png>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [target, sel, out] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto(`https://fullscale-rehearsal.ddev.site/admin/${target}`, { waitUntil: 'networkidle' });
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await page.locator(sel).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(root, '.local', 'shots', out) });
  console.log('shot', out);
} finally { await browser.close(); }
