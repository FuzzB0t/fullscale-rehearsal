// Step 4: create the sample guides through Craft's MCP server, as the Publisher, over HTTP + OAuth.
//
// Creates two guides with their real chapter titles and short SAMPLE text (original wording, not copied from
// the real site), using only MCP tool calls (elements_create). No database writes, no console seeding.
// Safe to re-run: anything that already exists (by slug) is skipped.
//
//   NODE_EXTRA_CA_CERTS=C:\Users\ultim\AppData\Local\mkcert\rootCA.pem node scripts/sample-content/create-guides.mjs
//
// Needs: .local/publisher-state.json (node scripts/cp-login.mjs --user=daniel.reyes --state=.local/publisher-state.json)
import fs from 'node:fs';
import path from 'node:path';
import { registerClientOnce, getToken, McpSession, root } from '../portable/_oauth.mjs';

const SECTION_ID = 1;                       // "Guides for Teams" in the replica (checked with craft exec)
const TYPE = { guide: 1, chapter: 2 };      // entry type IDs in the replica

const p = (t) => `<p>${t}</p>`;
const section = (title, text) => `<h3>${title}</h3>${p(text)}`;
const card = (type, title, description, url) => ({ [type]: { id: `new:${title}`, title, cardDescription: description, cardLink: { type: 'url', value: url } } });

const guides = [
  {
    title: 'Digital Equity', slug: 'digital-equity', isNew: true,
    tagline: 'Sample text: help every student get the access, skills and support they need to learn with technology.',
    chapters: [
      { title: 'Introduction', slug: 'introduction', subtitle: 'Why digital equity matters for learning.',
        body: p('Sample text. This chapter introduces the guide and explains who it is for.')
          + section('What we mean by digital equity', 'Sample text. Digital equity means every learner has what they need to take part fully in learning.')
          + section('Who this guide is for', 'Sample text. School and system teams planning how to close access gaps.') },
      { title: 'Getting Started', slug: 'getting-started', subtitle: 'Take stock before you act.',
        body: p('Sample text. Start by understanding where your community is today.')
          + section('Assemble a team', 'Sample text. Bring together people who see different parts of the picture.')
          + section('Examine your current state', 'Sample text. Gather what you already know about devices, connectivity and skills.'),
        cards: [
          card('strategyCard', 'Start with a listening session', 'Sample text. Hear from families and students first.', 'https://example.com/listening-session'),
          card('activityCard', 'Map access in your community', 'Sample text. A short activity to chart who has what.', 'https://example.com/map-access'),
          card('artifactCard', 'Digital equity audit template', 'Sample text. A template for recording what you find.', 'https://example.com/audit-template'),
        ] },
      { title: 'Digital Equity in the Classroom', slug: 'digital-equity-in-the-classroom', subtitle: 'What equity looks like day to day.',
        body: p('Sample text. Equity shows up in everyday teaching choices.')
          + section('Design for varied access', 'Sample text. Plan lessons that work with different devices and connections.')
          + section('Build skills alongside content', 'Sample text. Teach the digital skills students need as part of the subject.')
          + section('Check in on what students need', 'Sample text. Ask regularly, and adjust.') },
      { title: 'Essential Conditions to Support Digital Equity', slug: 'essential-conditions-to-support-digital-equity', subtitle: 'The conditions that make it last.',
        body: p('Sample text. Some conditions have to be in place for progress to hold.')
          + section('Devices and connectivity', 'Sample text. Reliable devices and a reliable connection for every learner.')
          + section('Support and training', 'Sample text. Help for families and staff when something goes wrong.')
          + section('Policies and funding', 'Sample text. Plans and budgets that keep the work going.'),
        cards: [
          card('strategyCard', 'Plan for repair and replacement', 'Sample text. Budget for the full life of a device.', 'https://example.com/repair-replacement'),
          card('artifactCard', 'Conditions checklist', 'Sample text. A one-page checklist of the essentials.', 'https://example.com/conditions-checklist'),
        ] },
      { title: 'Taking It Forward', slug: 'taking-it-forward', subtitle: 'Keep the work going.',
        body: p('Sample text. A closing chapter on keeping momentum.')
          + section('Set measures of progress', 'Sample text. Decide what success looks like and how you will notice it.')
          + section('Share what you learn', 'Sample text. Pass on what worked, and what did not.') },
    ],
  },
  {
    title: 'Research and Measurement', slug: 'research-and-measurement', isNew: false,
    tagline: 'Sample text: use evidence to learn what is working and improve it.',
    chapters: [
      { title: 'Introduction', slug: 'introduction', subtitle: 'Why measure, and what to measure.',
        body: p('Sample text. This chapter introduces the guide and its approach.')
          + section('Why research and measurement', 'Sample text. Evidence helps teams learn faster.')
          + section('How to use this guide', 'Sample text. Work through the chapters in order, or jump to what you need.') },
      { title: 'Getting Started', slug: 'getting-started', subtitle: 'Frame your questions.',
        body: p('Sample text. Begin with what you want to find out.')
          + section('Clarify your goals', 'Sample text. Write down what you are trying to change.')
          + section('Decide who needs the answers', 'Sample text. Know your audience before you collect anything.') },
      { title: 'Collect and Analyze Data', slug: 'collect-and-analyze-data', subtitle: 'From questions to findings.',
        body: p('Sample text. Gather only what you will use.')
          + section('Choose your questions', 'Sample text. Keep a short list of questions you can actually answer.')
          + section('Gather data', 'Sample text. Use methods that fit your time and your community.')
          + section('Make sense of results', 'Sample text. Look for patterns, then check them with the people involved.'),
        cards: [
          card('activityCard', 'Plan your data collection', 'Sample text. A worksheet for choosing methods.', 'https://example.com/data-plan'),
          card('artifactCard', 'Survey question bank', 'Sample text. Example questions to adapt.', 'https://example.com/question-bank'),
        ] },
      { title: 'Taking It Forward', slug: 'taking-it-forward', subtitle: 'Turn findings into action.',
        body: p('Sample text. Close the loop between findings and decisions.')
          + section('Share findings', 'Sample text. Present results so people can act on them.')
          + section('Plan the next cycle', 'Sample text. Decide what to measure next.') },
    ],
  },
];

// --- Run -------------------------------------------------------------------------------------------------------
const client = await registerClientOnce();
const tok = await getToken({ client, stateFile: path.join(root, '.local', 'publisher-state.json'), level: 'mcp:write', shot: 'consent-publisher-mcp-write.png', shotDir: '4' });
const s = new McpSession(tok.access_token);
await s.init();

const payload = (r) => { try { return JSON.parse(r.json.result.content[0].text); } catch { return null; } };
const fail = (what, r) => { throw new Error(`${what} failed: ${JSON.stringify(r.json?.error ?? r.json?.result ?? r).slice(0, 400)}`); };
let calls = 0;
const call = async (name, args) => { calls++; return s.call(name, args); };

// elements_list has no parent criterion, so list by slug and tell guide from chapter by parent or URI.
async function findEntries(slug) {
  const r = await call('elements_list', { type: 'entry', criteria: { section: 'guidesForTeams', slug, limit: 50 } });
  if (r.json?.result?.isError || r.json?.error) fail(`list ${slug}`, r);
  return payload(r)?.elements ?? [];
}
const uriOf = (e) => String(e.uri ?? e.url ?? '');
// A guide is a level-1 entry of the "guide" type. Which of these the server includes is checked by --check.
const isGuide = (e) => e.level === 1 || e.typeId === TYPE.guide || (e.type?.handle ?? e.type) === 'guide';
const findGuide = async (slug) => (await findEntries(slug)).find(isGuide) ?? null;
const findChapter = async (slug, guide, guideSlug) => (await findEntries(slug)).find((e) => e.parentId === guide.id || uriOf(e).endsWith(`/${guideSlug}/${slug}`)) ?? null;
const CHECK_ONLY = process.argv.includes('--check');
const missing = [];

async function createEntry(attributes, fields) {
  const r = await call('elements_create', { type: 'entry', attributes: { sectionId: SECTION_ID, enabled: true, ...attributes }, fields });
  if (r.json?.result?.isError || r.json?.error) fail(`create ${attributes.slug}`, r);
  const out = payload(r);
  const el = out?.element ?? out;
  if (process.env.DEBUG) console.log('element shape:', Object.keys(el).join(', '));
  if (!el?.id) fail(`create ${attributes.slug} (no id returned)`, r);
  return el;
}

const created = [];
for (const g of guides) {
  let guide = await findGuide(g.slug);
  if (guide) console.log(`exists  ${g.title} (id ${guide.id})`);
  else if (CHECK_ONLY) { missing.push(g.slug); console.log(`MISSING ${g.title}`); continue; }
  else {
    guide = await createEntry({ typeId: TYPE.guide, title: g.title, slug: g.slug }, { guideTagline: g.tagline, guideIsNew: g.isNew });
    console.log(`created ${g.title} (id ${guide.id})`);
    created.push(g.slug);
  }
  for (const c of g.chapters) {
    const existing = await findChapter(c.slug, guide, g.slug);
    if (existing) { console.log(`  exists  ${c.title}`); continue; }
    if (CHECK_ONLY) { missing.push(`${g.slug}/${c.slug}`); console.log(`  MISSING ${c.title}`); continue; }
    const fields = { chapterSubtitle: c.subtitle, chapterBody: c.body };
    if (c.cards) fields.chapterResourceCards = { entries: c.cards };
    const ch = await createEntry({ typeId: TYPE.chapter, parentId: guide.id, title: c.title, slug: c.slug }, fields);
    console.log(`  created ${c.title} (id ${ch.id})`);
    created.push(`${g.slug}/${c.slug}`);
  }
}
if (CHECK_ONLY) {
  console.log(missing.length ? `\nCHECK FAILED: ${missing.length} missing` : '\nCHECK OK: everything exists');
  process.exit(missing.length ? 1 : 0);
}
fs.writeFileSync(path.join(root, '.local', 'step4-created.json'), JSON.stringify({ created, mcpCalls: calls }, null, 2));
console.log(`\nDone. Created ${created.length} entries with ${calls} MCP calls.`);
