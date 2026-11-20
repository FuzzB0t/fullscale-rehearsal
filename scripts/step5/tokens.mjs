// Step 5 helper (case 15): list, and revoke, a user's authorized apps on the control panel's Tokens screen
// (/admin/myaccount/tokens), driving the same screen a person would use.
//   node scripts/step5/tokens.mjs list   <state.json> <shot.png>
//   node scripts/step5/tokens.mjs revoke <state.json> "<exact name of the app>" <shot-before.png> <shot-after.png>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const [mode, stateFile, a, b, c] = process.argv.slice(2);
const URL = 'https://fullscale-rehearsal.ddev.site/admin/myaccount/tokens';
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, storageState: path.resolve(root, stateFile) })).newPage();
  page.setDefaultTimeout(20000);
  const rows = async () => page.locator('table.data tbody tr').evaluateAll((trs) => trs.map((tr) => ({
    name: tr.querySelector('th')?.textContent.trim(), type: tr.children[1]?.textContent.trim().replace(/\s+/g, ' '), expires: tr.children[2]?.textContent.trim() })));
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (mode === 'list') {
    console.log(JSON.stringify(await rows(), null, 1));
    await page.screenshot({ path: path.resolve(root, a) });
  } else if (mode === 'revoke') {
    const name = a;
    console.log('before:', JSON.stringify(await rows()));
    await page.screenshot({ path: path.resolve(root, b) });
    // Find the row by its exact name (no regex needed): fail loudly unless exactly one row matches.
    const names = (await rows()).map((r) => r.name);
    const matches = names.map((n, i) => (n === name ? i : -1)).filter((i) => i >= 0);
    if (matches.length !== 1) throw new Error(`Expected exactly one app named "${name}", found ${matches.length}. Apps: ${JSON.stringify(names)}`);
    const row = page.locator('table.data tbody tr').nth(matches[0]);
    page.once('dialog', (d) => d.accept());   // the native "Are you sure you want to revoke" confirmation
    await row.locator('button.action-btn').click();
    await page.getByRole('button', { name: 'Revoke' }).or(page.getByRole('menuitem', { name: 'Revoke' })).first().click();
    await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
    console.log('after: ', JSON.stringify(await rows()));
    await page.screenshot({ path: path.resolve(root, c) });
  }
} finally { await browser.close(); }
