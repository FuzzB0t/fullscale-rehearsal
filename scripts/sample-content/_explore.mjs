// Dev helper for Step 4: ask the MCP server what creating an entry needs (as the publisher).
import path from 'node:path';
import { registerClientOnce, getToken, McpSession, root } from '../portable/_oauth.mjs';
const client = await registerClientOnce();
const tok = await getToken({ client, stateFile: path.join(root, '.local', 'publisher-state.json'), level: 'mcp:write', shot: 'consent-publisher-mcp-write.png', shotDir: '4' });
const s = new McpSession(tok.access_token);
await s.init();
const j = (r) => { try { return JSON.parse(r.json.result.content[0].text); } catch { return r.json; } };
const schema = j(await s.call('elements_schema', { type: 'entry' }));
console.log('createAttributes:', JSON.stringify(schema.createAttributes, null, 1)?.slice(0, 1800));
console.log('fieldSchemaContext:', JSON.stringify(schema.fieldSchemaContext, null, 1)?.slice(0, 900));
