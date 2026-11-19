// Dev helper for 3c / Step 5 prep: a tiny OAuth 2.1 + PKCE client for Craft's authenticated MCP server.
//
// It does what an MCP client (Claude Code, the Claude app) does, so the access levels and permissions can
// be checked over the real HTTP endpoint: discover, register once, sign in as a real Craft user in the
// browser and approve a chosen access level, exchange the code for a token, then speak MCP JSON-RPC.
//
// TLS: Node does not trust DDEV's mkcert CA by default. Run with
//   NODE_EXTRA_CA_CERTS=C:\Users\ultim\AppData\Local\mkcert\rootCA.pem
// (the same variable the Claude Code CLI needs on this machine).
//
// Dynamic client registration is limited to 10 clients per IP per hour, so the client is registered ONCE
// and reused from .local/oauth-client.json.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');

export const SITE = 'https://fullscale-rehearsal.ddev.site';
export const ISSUER = `${SITE}/admin/oauth/mcp`;
export const MCP_URL = `${SITE}/admin/mcp`;
export const REDIRECT = 'http://127.0.0.1:8765/callback';
const CLIENT_FILE = path.join(root, '.local', 'oauth-client.json');

const b64url = (buf) => buf.toString('base64url');

export async function registerClientOnce() {
  if (fs.existsSync(CLIENT_FILE)) return JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const meta = await (await fetch(`${SITE}/.well-known/oauth-authorization-server/admin/oauth/mcp`)).json();
  const res = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'rehearsal-access-level-test',
      redirect_uris: [REDIRECT],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.client_id) throw new Error(`Client registration failed: ${res.status} ${JSON.stringify(body)}`);
  fs.mkdirSync(path.dirname(CLIENT_FILE), { recursive: true });
  fs.writeFileSync(CLIENT_FILE, JSON.stringify({ client_id: body.client_id, meta }, null, 2));
  return { client_id: body.client_id, meta };
}

export function pkce() {
  const verifier = b64url(crypto.randomBytes(48));
  return { verifier, challenge: b64url(crypto.createHash('sha256').update(verifier).digest()) };
}

/** `prompt: 'consent'` always shows the consent screen. Pass `prompt: null` to behave like a plain reconnect,
 *  where Craft reuses the user's earlier approval and skips the screen. */
export function authorizeUrl(client, { challenge, scope, state, prompt = 'consent' }) {
  const u = new URL(client.meta.authorization_endpoint);
  Object.entries({
    response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, scope,
    code_challenge: challenge, code_challenge_method: 'S256', state, resource: `${SITE}/admin/mcp/auth`,
    ...(prompt ? { prompt } : {}),
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export async function exchangeCode(client, code, verifier) {
  const res = await fetch(client.meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: verifier }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

/**
 * Sign in as a real Craft user (a saved control-panel session) and approve one access level on the consent
 * screen, like a person connecting an MCP client. Listens on the redirect address to catch the callback, then
 * exchanges the code (PKCE). Returns the token response.
 *   stateFile: Playwright session file from scripts/cp-login.mjs    level: 'mcp:read' | 'mcp:write'
 *   shot: optional file name (under docs/screenshots/<shotDir>) for a picture of the consent screen
 */
export async function getToken({ client, stateFile, level, shot, shotDir = '3c' }) {
  const { chromium } = await import('@playwright/test');
  const { verifier, challenge } = pkce();
  const state = `t-${Math.random().toString(36).slice(2)}`;
  const browser = await chromium.launch();
  let listener;
  try {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 }, storageState: stateFile })).newPage();
    page.setDefaultTimeout(20000);
    let redirected = null;
    listener = http.createServer((req, res) => { redirected = `http://127.0.0.1:8765${req.url}`; res.end('You can close this window.'); });
    await new Promise((resolve) => listener.listen(8765, '127.0.0.1', resolve));
    await page.goto(authorizeUrl(client, { challenge, scope: 'mcp:read mcp:write mcp:admin', state }), { waitUntil: 'networkidle' });
    const radio = page.locator(`input[type=radio][name=access][value="${level}"]`);
    if ((await radio.count()) !== 1) throw new Error(`Access level ${level} is not offered to this user`);
    const id = await radio.getAttribute('id');
    await (id ? page.locator(`label[for="${id}"]`) : radio).click();
    if (shot) {
      const dir = path.join(root, 'docs', 'screenshots', shotDir);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, shot) });
    }
    await page.getByRole('button', { name: 'Authorize', exact: true }).click();
    await page.waitForTimeout(1500);
    if (!redirected) throw new Error('Consent did not redirect back to the client');
    const u = new URL(redirected);
    if (u.searchParams.get('state') !== state) throw new Error('OAuth state mismatch');
    const code = u.searchParams.get('code');
    if (!code) throw new Error(`No code in redirect: ${redirected}`);
    return await exchangeCode(client, code, verifier);
  } finally {
    listener?.close();
    await browser.close();
  }
}

/** A minimal MCP client over Streamable HTTP. Responses may be JSON or a single SSE event. */
export class McpSession {
  constructor(token) { this.token = token; this.id = 1; this.session = null; }
  async rpc(method, params, { notify = false } = {}) {
    const body = { jsonrpc: '2.0', method, ...(params ? { params } : {}), ...(notify ? {} : { id: this.id++ }) };
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${this.token}`, ...(this.session ? { 'Mcp-Session-Id': this.session } : {}),
      },
      body: JSON.stringify(body),
    });
    this.session ??= res.headers.get('mcp-session-id');
    const text = await res.text();
    if (notify) return { status: res.status };
    let json = null;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('text/event-stream')) {
      const data = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      json = data ? JSON.parse(data) : null;
    } else if (text.trim()) {
      try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
    }
    return { status: res.status, json };
  }
  async init() {
    const r = await this.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'rehearsal-access-level-test', version: '1' } });
    await this.rpc('notifications/initialized', undefined, { notify: true });
    return r;
  }
  async tools() { const r = await this.rpc('tools/list', {}); return r.json?.result?.tools ?? []; }
  async call(name, args) { return this.rpc('tools/call', { name, arguments: args ?? {} }); }
}
