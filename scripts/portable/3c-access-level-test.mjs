// Portable change 3c: verify, over the real HTTP + OAuth endpoint, what each access level lets a drafter do.
//
// For each level the test user would choose on the consent screen (Read only, Read and write) it:
//   1. signs in as the drafter in a browser and approves that level (Playwright drives the consent screen),
//   2. exchanges the code for a token (PKCE),
//   3. lists the tools the server offers, then calls the ones that matter for drafting.
// It leaves the site as it found it (the draft it creates is deleted).
//
//   NODE_EXTRA_CA_CERTS=C:\Users\ultim\AppData\Local\mkcert\rootCA.pem node scripts/portable/3c-access-level-test.mjs [state.json] [label]
//
// Uses the fake drafter (maya.okafor) and the fixture guide. Reuses one OAuth client (.local/oauth-client.json).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { registerClientOnce, pkce, authorizeUrl, exchangeCode, McpSession, REDIRECT, root } from './_oauth.mjs';
const { chromium } = await import('@playwright/test');

const stateFile = path.resolve(root, process.argv[2] ?? '.local/drafter-state.json');
const who = process.argv[3] ?? 'drafter';
const client = await registerClientOnce();

/** Sign in (saved session) and approve one access level. Returns the token response. */
async function tokenFor(level, shot) {
  const { verifier, challenge } = pkce();
  const state = `t-${Math.random().toString(36).slice(2)}`;
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 }, storageState: stateFile })).newPage();
    page.setDefaultTimeout(20000);
    // Like a real MCP client, listen on the redirect address and catch the callback.
    let redirected = null;
    const listener = http.createServer((req, res) => { redirected = `http://127.0.0.1:8765${req.url}`; res.end('You can close this window.'); });
    await new Promise((resolve) => listener.listen(8765, '127.0.0.1', resolve));
    page.on('close', () => listener.close());
    await page.goto(authorizeUrl(client, { challenge, scope: 'mcp:read mcp:write mcp:admin', state }), { waitUntil: 'networkidle' });
    const radio = page.locator(`input[type=radio][name=access][value="${level}"]`);
    if ((await radio.count()) !== 1) throw new Error(`Access level ${level} is not offered to this user`);
    const id = await radio.getAttribute('id');
    await (id ? page.locator(`label[for="${id}"]`) : radio).click();
    if (shot) await page.screenshot({ path: path.join(root, 'docs', 'screenshots', '3c', shot) });
    await page.getByRole('button', { name: 'Authorize', exact: true }).click();
    await page.waitForTimeout(1500);
    listener.close();
    if (!redirected) throw new Error('Consent did not redirect back to the client');
    const u = new URL(redirected);
    if (u.searchParams.get('state') !== state) throw new Error('OAuth state mismatch');
    const code = u.searchParams.get('code');
    if (!code) throw new Error(`No code in redirect: ${redirected}`);
    return await exchangeCode(client, code, verifier);
  } finally { await browser.close(); }
}

const short = (r) => {
  if (r.json?.error) return `ERROR ${r.json.error.code}: ${r.json.error.message}`;
  const res = r.json?.result;
  if (res?.isError) return `REFUSED: ${(res.content ?? []).map((c) => c.text).join(' ').slice(0, 160)}`;
  if (r.status >= 400) return `HTTP ${r.status}: ${JSON.stringify(r.json).slice(0, 160)}`;
  return 'OK';
};
const payload = (r) => { try { return JSON.parse(r.json.result.content[0].text); } catch { return r.json?.result?.structuredContent ?? null; } };

const report = {};
for (const level of ['mcp:read', 'mcp:write']) {
  const out = { level, steps: [] };
  const tok = await tokenFor(level, `consent-${who}-${level.replace(':', '-')}.png`);
  out.grantedScope = tok.scope ?? '(not returned)';
  const s = new McpSession(tok.access_token);
  const init = await s.init();
  out.initialize = init.status;
  const tools = await s.tools();
  out.toolsOffered = tools.map((t) => t.name).sort();
  const step = (what, r) => out.steps.push({ what, result: short(r) });

  // Read: find the fixture guide
  const list = await s.call('elements_list', { type: 'entry', criteria: { section: 'guidesForTeams', slug: 'fixture-guide' } });
  step('elements_list: find the fixture guide', list);
  const live = payload(list)?.elements?.[0];
  out.liveEntryId = live?.id ?? null;
  step('drafts_list: list drafts', await s.call('drafts_list', { type: 'entry', id: live?.id }));

  // Write-level actions
  const created = await s.call('drafts_create', { type: 'entry', id: live?.id, name: `3c ${level} test` });
  step('drafts_create: draft of the live guide', created);
  const draft = payload(created)?.draft;
  if (draft?.id) {
    step('elements_update: change a field on OWN draft', await s.call('elements_update', { type: 'entry', id: draft.id, fields: { layoutStickyMenu: true } }));
    step('drafts_apply: make OWN draft live', await s.call('drafts_apply', { type: 'entry', id: draft.id }));
    step('drafts_delete: delete OWN draft (cleanup)', await s.call('drafts_delete', { type: 'entry', id: draft.id }));
  }
  step('elements_update: change the LIVE guide directly', await s.call('elements_update', { type: 'entry', id: live?.id, fields: { layoutStickyMenu: true } }));
  step('elements_delete: delete the LIVE guide', await s.call('elements_delete', { type: 'entry', id: live?.id }));
  report[level] = out;
}
fs.writeFileSync(path.join(root, '.local', `3c-access-level-${who}.json`), JSON.stringify(report, null, 2));
for (const out of Object.values(report)) {
  console.log(`\n=== ${who} at ${out.level} initialize=${out.initialize}`);
  console.log(`tools offered (${out.toolsOffered.length}): ${out.toolsOffered.join(', ')}`);
  for (const s of out.steps) console.log(`  ${s.result.padEnd(70).slice(0, 70)}  <- ${s.what}`);
}
