// Take a full-page screenshot of a URL with the project's own Chromium.
//
//   node scripts/shot.mjs <url> <output.png> [--width=1280] [--height=900] [--cookie-file=state.json]
//
// The browser lives in ./.playwright-browsers (git-ignored) so nothing is installed
// outside the project. HTTPS is verified normally: DDEV's mkcert CA is in the Windows
// trust store, so a certificate error here means the local CA setup is broken, and
// we want to see that rather than hide it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Must be set BEFORE Playwright is imported (static imports are hoisted above this line),
// because Playwright reads the variable at load time.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')),
);
const [url, out] = args.filter((a) => !a.startsWith('--'));
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <output.png> [--width=1280] [--height=900] [--cookie-file=state.json]');
  process.exit(2);
}

mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: Number(flags.width ?? 1280), height: Number(flags.height ?? 900) },
    ...(flags['cookie-file'] ? { storageState: flags['cookie-file'] } : {}),
  });
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: 'networkidle' });
  console.log(`${response?.status()} ${url} -> ${out}`);
  await page.screenshot({ path: out, fullPage: true });
} finally {
  await browser.close();
}
