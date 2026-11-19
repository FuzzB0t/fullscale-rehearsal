// Dev helper for Step 4: can a drafter propose a brand-new guide over MCP? (Answers an open question in NOTES.md.)
import path from 'node:path';
import { registerClientOnce, getToken, McpSession, root } from '../portable/_oauth.mjs';
const client = await registerClientOnce();
const tok = await getToken({ client, stateFile: path.join(root, '.local', 'drafter-state.json'), level: 'mcp:write' });
const s = new McpSession(tok.access_token); await s.init();
const show = (what, r) => {
  const res = r.json?.result;
  const text = res?.content?.map((c) => c.text).join(' ') ?? '';
  console.log(`${(res?.isError || r.json?.error) ? 'REFUSED' : 'OK     '}  ${what}${res?.isError ? ': ' + text.slice(0, 140) : r.json?.error ? ': ' + r.json.error.message : ''}`);
  try { return JSON.parse(text); } catch { return null; }
};
const attrs = { sectionId: 1, typeId: 1, title: 'Drafter proposal (delete me)', slug: 'drafter-proposal' };
const live = show('elements_create (live) a new guide', await s.call('elements_create', { type: 'entry', attributes: attrs }));
const draft = show('elements_create asUnpublishedDraft: a new guide as a draft', await s.call('elements_create', { type: 'entry', attributes: attrs, asUnpublishedDraft: true, draftName: 'Drafter proposal' }));
const id = (draft?.element ?? draft)?.id ?? (live?.element ?? live)?.id;
if (id) { console.log('  created something (id ' + id + '), cleaning up'); show('drafts_delete / elements_delete cleanup', await s.call('drafts_delete', { type: 'entry', id })); }
