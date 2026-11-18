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
