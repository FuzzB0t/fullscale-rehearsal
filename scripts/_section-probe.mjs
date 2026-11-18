import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const type = process.argv[2] ?? 'Structure';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto('https://fullscale-rehearsal.ddev.site/admin/settings/sections/new', { waitUntil: 'networkidle' });
  const sel = page.locator('select[name=type]');
  console.log('type select present:', await sel.count(), ' options:', await sel.locator('option').allInnerTexts());
  await sel.selectOption({ label: type });
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
  const rows = await page.evaluate(() => [...document.querySelectorAll('input, select, textarea, button')].filter((e) => e.offsetWidth || e.offsetHeight)
    .map((el) => `${el.tagName.toLowerCase()}[${el.type ?? ''}] name=${el.getAttribute('name') ?? ''} id=${el.id} label="${(el.labels?.[0]?.innerText ?? el.getAttribute('aria-label') ?? el.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 50)}"`));
  console.log(rows.filter((r) => !/Open subnavigation|Toggle sidebar|My Account|More actions/.test(r)).join('\n'));
} finally { await browser.close(); }
