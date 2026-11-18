// Dev helper: open "new field", choose a field type, then list the settings controls.
//   node scripts/_probe-type.mjs "Assets"
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const label = process.argv[2];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto('https://fullscale-rehearsal.ddev.site/admin/settings/fields/new', { waitUntil: 'networkidle' });
  await page.locator('#type-button').click();
  await page.getByRole('option', { name: label, exact: true }).click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1000);
  const rows = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const typeBox = document.querySelector('#type-field')?.parentElement;
    const start = document.querySelector('#type-field');
    const all = [...document.querySelectorAll('input, select, textarea, button')].filter(vis);
    const idx = all.findIndex((e) => e.id === 'type-button');
    return all.slice(idx + 1).map((el) => {
      const label = el.labels?.[0]?.innerText?.trim().replace(/\s+/g, ' ') ?? el.getAttribute('aria-label') ?? el.innerText?.trim().replace(/\s+/g, ' ') ?? '';
      const opts = el.tagName === 'SELECT' ? ' options=[' + [...el.options].map((o) => o.value + ':' + o.text).join(' | ') + ']' : '';
      return `${el.tagName.toLowerCase()}[${el.type ?? ''}] name=${el.getAttribute('name') ?? ''} id=${el.id} label="${label.slice(0, 60)}"${opts}`;
    });
  });
  console.log(rows.join('\n'));
  if (process.argv[3]) await page.screenshot({ path: path.join(root, '.local', 'shots', process.argv[3]), fullPage: true });
} finally { await browser.close(); }
