// Step 5 helper: make a plain 1200x500 sample image (a clearly labelled stand-in, not a real photo).
//   node scripts/step5/make-hero-image.mjs <out.png>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const out = path.resolve(root, process.argv[2] ?? '.local/5/hero-sample.png');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 500 } });
  await page.setContent('<body style="margin:0;display:flex;align-items:center;justify-content:center;height:500px;background:linear-gradient(135deg,#1b6ec2,#124a85);color:#fff;font:700 54px system-ui,sans-serif">Sample hero image (rehearsal)</body>');
  await page.screenshot({ path: out });
  console.log('wrote', path.relative(root, out));
} finally { await browser.close(); }
