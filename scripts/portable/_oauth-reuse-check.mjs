// Dev helper for 3c: what happens on a plain reconnect (no prompt=consent) by a user who approved before?
//   node scripts/portable/_oauth-reuse-check.mjs [state.json]
import http from 'node:http';
import path from 'node:path';
import { registerClientOnce, pkce, authorizeUrl, exchangeCode, McpSession, REDIRECT, root } from './_oauth.mjs';
const { chromium } = await import('@playwright/test');
const stateFile = path.resolve(root, process.argv[2] ?? '.local/drafter-state.json');
const client = await registerClientOnce();
const { verifier, challenge } = pkce();
let redirected = null;
const listener = http.createServer((req, res) => { redirected = `http://127.0.0.1:8765${req.url}`; res.end('ok'); });
await new Promise((r) => listener.listen(8765, '127.0.0.1', r));
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ storageState: stateFile })).newPage();
  await page.goto(authorizeUrl(client, { challenge, scope: 'mcp:read mcp:write mcp:admin', state: 'reuse', prompt: null }), { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('consent screen shown:', (await page.locator('input[name=access]').count()) > 0, '| redirected straight to client:', !!redirected);
} finally { listener.close(); await browser.close(); }
const tok = await exchangeCode(client, new URL(redirected).searchParams.get('code'), verifier);
const s = new McpSession(tok.access_token); await s.init();
const tools = await s.tools();
console.log(`tools offered after plain reconnect: ${tools.length} (read only = 14, read and write = 31)`);
