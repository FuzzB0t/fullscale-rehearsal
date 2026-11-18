import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto('https://fullscale-rehearsal.ddev.site/admin/settings/fields/new', { waitUntil: 'networkidle' });
  await page.locator('#type-button').click();
  await page.getByRole('option', { name: 'Matrix', exact: true }).click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Choose' }).first().click();
  await page.waitForTimeout(800);
  const html = await page.evaluate(() => [...document.querySelectorAll('.menu, [role=menu], [role=listbox], .hud, .slideout, .modal')].filter((e) => e.offsetWidth).map((e) => e.className + ' :: ' + e.innerText.replace(/\s+/g, ' ').slice(0, 300)));
  console.log(html.join('\n'));
  await page.screenshot({ path: path.join(root, '.local', 'shots', 'matrix-choose.png'), clip: { x: 230, y: 780, width: 900, height: 420 } });
} finally { await browser.close(); }
