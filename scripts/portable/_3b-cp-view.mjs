// Dev helper for 3b: what does a signed-in test user see in the control panel?
//   node scripts/portable/_3b-cp-view.mjs <state.json> <label>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [stateFile, label] = process.argv.slice(2);
const site = 'https://fullscale-rehearsal.ddev.site/admin';
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: path.resolve(root, stateFile) })).newPage();
  page.setDefaultTimeout(20000);
  const nav = await (async () => { await page.goto(`${site}/dashboard`, { waitUntil: 'networkidle' }); return page.locator('#global-sidebar nav a, #global-sidebar a').allTextContents(); })();
  console.log(`[${label}] sidebar:`, [...new Set(nav.map((t) => t.trim()).filter(Boolean))].join(' | '));
  await page.goto(`${site}/entries/guidesForTeams`, { waitUntil: 'networkidle' });
  const link = page.getByRole('link', { name: 'Fixture guide (delete me)', exact: true }).first();
  console.log(`[${label}] can see the guide in the entries list:`, (await link.count()) > 0);
  const newBtn = await page.locator('a, button').filter({ hasText: /^\s*New (entry|Guide)/ }).count();
  console.log(`[${label}] "New entry" button present:`, newBtn > 0);
  await link.click(); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
  const btns = await page.locator('#header button:visible, #header a.btn:visible, #action-buttons button:visible, #action-buttons a:visible').allTextContents();
  console.log(`[${label}] header buttons on the live guide:`, btns.map((t) => t.trim()).filter(Boolean).join(' | '));
  console.log(`[${label}] title field editable:`, await page.locator('#title').isEditable().catch(() => false));
  await page.screenshot({ path: path.join(root, 'docs', 'screenshots', '3b', `cp-${label}-guide.png`) });
} finally { await browser.close(); }
