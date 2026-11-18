// Dev helper: list the visible form controls on a control-panel page.
//   node scripts/_probe.mjs <admin-path> [--click="Button text"]
// Uses the saved admin session in .local/admin-state.json.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
const target = args.find((a) => !a.startsWith('--'));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto(`https://fullscale-rehearsal.ddev.site/admin/${target}`, { waitUntil: 'networkidle' });
  if (flags.click) { await page.getByRole('button', { name: flags.click }).first().click(); await page.waitForTimeout(1500); }
  const rows = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('input, select, textarea, button, [role=switch], [role=combobox]')]
      .filter(vis)
      .map((el) => {
        const label = el.labels?.[0]?.innerText?.trim().replace(/\s+/g, ' ') ?? el.getAttribute('aria-label') ?? el.innerText?.trim().replace(/\s+/g, ' ') ?? '';
        const opts = el.tagName === 'SELECT' ? ' options=[' + [...el.options].map((o) => o.value + ':' + o.text).join(' | ') + ']' : '';
        return `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''} name=${el.getAttribute('name') ?? ''} id=${el.id ?? ''} label="${label.slice(0, 50)}"${opts}`;
      });
  });
  console.log(rows.join('\n'));
  if (flags.click) {
    const items = await page.evaluate(() => [...document.querySelectorAll('[role=option], [role=menuitem], [role=menuitemradio], .menu li a, .menu li button, .selectize-dropdown-content .option')]
      .filter((el) => el.offsetWidth || el.offsetHeight)
      .map((el) => `${el.getAttribute('role') ?? el.tagName} data-value=${el.getAttribute('data-value') ?? el.getAttribute('data-type') ?? ''} text="${el.innerText.trim().replace(/\s+/g, ' ')}"`));
    console.log('--- menu items after click:\n' + items.join('\n'));
  }
  if (flags.shot) await page.screenshot({ path: path.join(root, '.local', 'shots', flags.shot), fullPage: true });
} finally { await browser.close(); }
