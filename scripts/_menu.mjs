// Dev helper: click an element on a CP page and list the visible menu options.
//   node scripts/_menu.mjs <admin-path> "<css selector to click>"
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [target, sel] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto(`https://fullscale-rehearsal.ddev.site/admin/${target}`, { waitUntil: 'networkidle' });
  await page.locator(sel).first().click();
  await page.waitForTimeout(800);
  const items = await page.evaluate(() => [...document.querySelectorAll('[role=option], [role=menuitem], [role=menuitemradio], .menu li, .selectize-dropdown-content .option')]
    .filter((el) => el.offsetWidth || el.offsetHeight)
    .map((el) => `${el.getAttribute('role') ?? el.tagName} value=${el.getAttribute('data-value') ?? el.querySelector('[data-value]')?.getAttribute('data-value') ?? ''} text="${el.innerText.trim().replace(/\s+/g, ' ')}"`));
  console.log(items.join('\n'));
} finally { await browser.close(); }
