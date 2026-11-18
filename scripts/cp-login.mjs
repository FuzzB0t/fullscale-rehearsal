// Sign in to the Craft control panel and save the browser session for reuse.
//
//   node scripts/cp-login.mjs [--user=admin] [--site=https://fullscale-rehearsal.ddev.site] [--state=.local/admin-state.json]
//
// The password is read from .local/credentials.txt (git-ignored) for the admin account, or from
// the CP_PASSWORD environment variable for any other user. Nothing secret is printed.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, mkdirSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');

const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')),
);
const user = flags.user ?? 'admin';
const site = (flags.site ?? 'https://fullscale-rehearsal.ddev.site').replace(/\/$/, '');
const state = path.resolve(root, flags.state ?? '.local/admin-state.json');

let password = process.env.CP_PASSWORD;
if (!password && user === 'admin') {
  const creds = readFileSync(path.join(root, '.local', 'credentials.txt'), 'utf8');
  password = creds.match(/^password:\s*(.+)$/m)?.[1]?.trim();
}
if (!password) {
  console.error('No password available: set CP_PASSWORD, or use --user=admin with .local/credentials.txt');
  process.exit(2);
}

mkdirSync(path.dirname(state), { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${site}/admin/login`, { waitUntil: 'networkidle' });
  // The login page has more than one username input (hidden passkey form), so target the visible ones.
  await page.locator('input[name="username"]:visible').first().fill(user);
  await page.locator('input[name="password"]:visible').first().fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30000 }),
    page.getByRole('button', { name: 'Sign in', exact: true }).click(),
  ]);
  console.log(`Signed in as ${user}; landed on ${new URL(page.url()).pathname}`);
  await context.storageState({ path: state });
  console.log(`Session saved to ${path.relative(root, state)}`);
} finally {
  await browser.close();
}
