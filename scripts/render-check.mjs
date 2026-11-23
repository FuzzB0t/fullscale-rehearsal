// Render check: load every guide page and fail on a non-200 response or a template error.
//
//   node scripts/render-check.mjs [--base=https://site] [--seed=/guides-for-teams] [--max=300]
//   node scripts/render-check.mjs --hook          (Claude Code PostToolUse hook, see .claude/settings.json)
//
// How it finds the pages: it fetches the seed page (the Guides for Teams index) and follows every link under the
// same path, so it needs only a running site. No database access, no Craft console. A guide or chapter that is not
// linked from the index (or from another guide page) is not checked.
//
// Two uses, two strengths (the brief's rule: the hook is a convenience, CI is the real gate):
//   - Hook mode runs on a developer's or staff member's machine after a template or CSS edit. It reports a failure
//     to Claude through exit code 2 so Claude can fix it. If the site is not running it warns and exits 0, because
//     a hook must never trap someone whose site is simply switched off.
//   - CLI mode, as used by the pull request check (.github/workflows/render-check.yml), exits 1 on any failure and
//     treats an unreachable site as a failure.
//
// Why curl: Node does not trust the local mkcert certificate, but curl on Windows uses the Windows certificate
// store, and on Linux (CI) the check is run over plain http.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }),
);
const HOOK = !!args.hook;
const BASE = String(args.base ?? process.env.RENDER_CHECK_BASE ?? 'https://fullscale-rehearsal.ddev.site').replace(/\/$/, '');
const SEED = String(args.seed ?? '/guides-for-teams');
const MAX = Number(args.max ?? 300);

// --- Hook mode: only react to edits of templates or CSS ------------------------------------------------------------
if (HOOK) {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no stdin: run anyway */ }
  const file = String(input.tool_input?.file_path ?? '').replace(/\\/g, '/');
  if (file && !/\/(templates|web\/assets\/css)\//.test(file)) process.exit(0);   // some other file: nothing to check
}

/** Fetch a URL with curl. Returns { status, body, curlError }. */
function fetchPage(url) {
  const curlArgs = ['-sS', '--max-time', '40', ...(process.platform === 'win32' ? ['--ssl-no-revoke'] : []),
    '-w', '\n__STATUS__%{http_code}', url];
  try {
    const out = execFileSync('curl', curlArgs, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    const i = out.lastIndexOf('\n__STATUS__');
    return { status: Number(out.slice(i + 11)), body: out.slice(0, i), curlError: null };
  } catch (e) {
    return { status: 0, body: '', curlError: String(e.stderr || e.message).trim().split('\n')[0] };
  }
}

/** The markers of a broken template or PHP error, in dev (error page) and production (generic error page). */
const ERROR_MARKERS = [
  /Twig(?:\\|\s)?(?:Runtime|Syntax|Loader)?\s*Error/i, /Unable to find template/i, /Unknown "[^"]+" (?:filter|function|tag|test)/i,
  /Template Error/i, /Fatal error/i, /Stack trace/i, /Whoops/i, /yii\\base\\\w*Exception/i, /<title>[^<]*(?:Server Error|Error)\b/i,
];

function explainFailure(page) {
  if (page.curlError) return `could not connect: ${page.curlError}`;
  const text = page.body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const decode = (t) => t.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const title = (page.body.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim();
  const detail = (text.match(/(?:Unable to find template|Unknown "[^"]+" (?:filter|function|tag|test)|Variable "[^"]+" does not exist|Unexpected [^.]{3,80}|Impossible to access[^.]{3,120}|Twig[^.]{3,60}Error[^.]{0,160})/i) || [])[0];
  // Craft's dev error page repeats "Twig Syntax Error ... Twig\Error\SyntaxError:" before the message; keep just the message.
  const message = detail && decode(detail).replace(/^.*Error\\\w+:\s*/, '').slice(0, 220);
  return [`HTTP ${page.status}`, message || (title && `page title "${decode(title)}"`)].filter(Boolean).join(': ');
}

// --- Crawl ---------------------------------------------------------------------------------------------------------
const seedPath = SEED.startsWith('/') ? SEED : `/${SEED}`;
const queue = [seedPath];
const seen = new Set();
const results = [];
while (queue.length && results.length < MAX) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const page = fetchPage(BASE + path);

  if (page.curlError && results.length === 0) {
    // The very first request failed to connect: the site is not running.
    const msg = `Render check: cannot reach ${BASE}${path} (${page.curlError}). Start the site with ./scripts/start-site.ps1.`;
    if (HOOK) { console.error(msg + ' Skipped (the pull request check is the real gate).'); process.exit(0); }
    console.error(msg); process.exit(1);
  }

  const problems = [];
  if (page.status !== 200) problems.push(explainFailure(page));
  else {
    const hit = ERROR_MARKERS.find((re) => re.test(page.body));
    if (hit) problems.push(`page loads (HTTP 200) but contains an error marker: ${explainFailure(page)}`);
    if (page.body.length < 400) problems.push(`page is almost empty (${page.body.length} bytes)`);
  }
  results.push({ path, status: page.status, problems });

  if (page.status === 200) {
    for (const m of page.body.matchAll(/href="([^"#?]+)[^"]*"/g)) {
      let href = m[1];
      if (href.startsWith(BASE)) href = href.slice(BASE.length);
      if (href.startsWith(seedPath) && !seen.has(href.replace(/\/$/, '')) && !/\.(css|js|png|jpe?g|gif|svg|webp|pdf)$/i.test(href)) queue.push(href.replace(/\/$/, ''));
    }
  }
}

// --- Report --------------------------------------------------------------------------------------------------------
const failed = results.filter((r) => r.problems.length);
if (failed.length === 0) {
  if (!HOOK) console.log(results.map((r) => ` ok   ${r.status}  ${r.path}`).join('\n'));
  console.log(`Render check passed: ${results.length} pages, all HTTP 200, no template errors (${BASE}).`);
  process.exit(0);
}
// Many pages usually fail for the same reason (one broken partial), so print each distinct problem once, with its pages.
const groups = new Map();
for (const r of failed) { const key = r.problems.join(' | '); groups.set(key, [...(groups.get(key) ?? []), r.path]); }
const body = [...groups].map(([problem, paths]) => `  ${problem}\n    on ${paths.length} page${paths.length === 1 ? '' : 's'}: ${paths.slice(0, 4).join(', ')}${paths.length > 4 ? `, and ${paths.length - 4} more` : ''}`).join('\n');
const report = `Render check FAILED: ${failed.length} of ${results.length} pages have a problem (${BASE}).\n\n${body}`;
if (HOOK) {
  console.error(report + '\n\nThe last template or CSS edit is the likely cause. Fix it, or revert it, and the check runs again after the next edit.');
  process.exit(2);   // PostToolUse: exit 2 shows stderr to Claude
}
console.error(report);
process.exit(1);
