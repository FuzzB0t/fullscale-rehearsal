// Helpers for driving the Craft control panel with Playwright (THROWAWAY replica build).
// Every schema change goes through the same control-panel forms a person would use,
// so it lands in project config exactly like a hand-made change.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');

export const SITE = 'https://fullscale-rehearsal.ddev.site';

export async function openCp({ height = 1000 } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height },
    storageState: path.join(root, '.local', 'admin-state.json'),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  return { browser, context, page };
}

export async function go(page, adminPath) {
  await page.goto(`${SITE}/admin/${adminPath}`, { waitUntil: 'networkidle' });
}

/** Click the primary Save button and fail loudly (with a screenshot) if Craft reports errors. */
export async function save(page, label) {
  await page.locator('button[type=submit]:visible', { hasText: /^\s*Save\s*$/ }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const problems = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.errors li, #notifications .error, .notification.error').forEach((e) => out.push(e.textContent.trim()));
    return out;
  });
  if (problems.length) {
    const shot = path.join(root, '.local', 'shots', `FAIL-${label.replace(/\W+/g, '-')}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    throw new Error(`Craft rejected "${label}": ${problems.join(' | ')} (screenshot: ${path.relative(root, shot)})`);
  }
  console.log(`saved: ${label}  ->  ${new URL(page.url()).pathname}`);
}

export async function nameAndHandle(page, name, handle) {
  await page.locator('#name').fill(name);
  await page.locator('#handle').fill(handle);
}

/** Set a Craft lightswitch (a button with role=switch and aria-checked). */
export async function setSwitch(locator, on) {
  const cur = (await locator.getAttribute('aria-checked')) === 'true';
  if (cur !== on) await locator.click();
}
