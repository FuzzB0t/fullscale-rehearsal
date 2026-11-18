// Dev helper: open the OAuth consent screen as a test user and dump what it offers.
//   node scripts/portable/_oauth-consent-probe.mjs <state.json> <label>
import path from 'node:path';
import { registerClientOnce, pkce, authorizeUrl, root } from './_oauth.mjs';
const { chromium } = await import('@playwright/test');
const [stateFile, label] = process.argv.slice(2);
const client = await registerClientOnce();
console.log('client registered/reused:', client.client_id.slice(0, 8) + '...');
const { challenge } = pkce();
const url = authorizeUrl(client, { challenge, scope: 'mcp:read mcp:write mcp:admin', state: 'probe' });
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, storageState: path.resolve(root, stateFile) })).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log('landed on:', new URL(page.url()).pathname);
  const info = await page.evaluate(() => ({
    text: document.querySelector('main, #content, body').innerText.replace(/\n{2,}/g, '\n').slice(0, 900),
    controls: [...document.querySelectorAll('input, button, select, a.btn')].filter((e) => e.offsetWidth || e.offsetHeight).map((e) => `${e.tagName.toLowerCase()}[${e.type ?? ''}] name=${e.getAttribute('name') ?? ''} value=${e.getAttribute('value') ?? ''} text=${(e.innerText ?? '').trim().slice(0, 40)}`),
  }));
  console.log(info.text); console.log('--- controls'); console.log(info.controls.join('\n'));
  await page.screenshot({ path: path.join(root, 'docs', 'screenshots', '3c', `consent-${label}.png`), fullPage: true });
} finally { await browser.close(); }
