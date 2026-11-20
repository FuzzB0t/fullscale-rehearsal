# Step 5 hand-off: run the MCP rehearsal through Claude Code

For the Claude Code session that runs Step 5. Read this first, then the Step 5 section of `fullscale-demo-prompt.md`
(lines 118 to 144, the 15 cases), then `NOTES.md`. Steps 1 to 4 are finished and committed.

## State when this was written

- Site: https://fullscale-rehearsal.ddev.site, in the **production** environment (`CRAFT_ENVIRONMENT=production`, devMode off, `allowAdminChanges` false). Docker Desktop and DDEV must be running. **If anything says `ECONNREFUSED` or the site does not load, run `./scripts/start-site.ps1`** (it did not survive an overnight shutdown on two mornings).
- Content: guides **Digital Equity** (5 chapters) and **Research and Measurement** (4 chapters), created by the Publisher over MCP. Both have chapters called Introduction, Getting Started and Taking It Forward, which is what case 6 needs.
- Users (fake; passwords in `.local/credentials.txt`, git-ignored): drafter `maya.okafor` (Content Drafters), publisher `daniel.reyes` (Publishers), admin `admin`.
- MCP server `craft-fullscale` is already added to Claude Code (local scope, both `d:/code/craft-demo` and `D:/code/craft-demo` project keys) at **`https://fullscale-rehearsal.ddev.site/admin/mcp/auth`**. It must be the `/auth` URL. `claude mcp list` shows "Needs authentication" until someone signs in.
- Claude Code trusts the local certificate by itself. No `NODE_EXTRA_CA_CERTS` is needed for it.

## What the person at the keyboard does (the browser steps)

1. Start a Claude Code session in this folder so it loads the `craft-fullscale` server. In the VS Code extension, run `/mcp`.
2. Select **craft-fullscale**, then **Authenticate**. A browser opens.
3. Sign in as **maya.okafor**. On the consent screen **choose "Read and write"** ("Read only" is pre-selected) and click **Authorize**.
4. Later, for case 13, repeat from `/mcp` (clear the authentication first) as **daniel.reyes**, Read and write. For case 14, as **admin** (Full access is offered to admins only).

## Rules for the cases

- Use only the `craft-fullscale` MCP tools to do what each case asks. Do not use the Craft console, SQL, or a hand-made token to do it. Console and screenshots are fine for **checking** a result (for example that the live page is unchanged).
- Record what really happened, with exact tool names and error text. Do not decide pass or fail before running. A refusal is the expected result for cases 3 and 4.
- Cases 6 and 11 test your own judgment (ask which guide; say a template change is needed and point to the Claude Code workflow). Answer them as staff would experience them.
- Dynamic client registration is limited to 10 per IP per hour. Do not loop through clear-and-authenticate more than needed.
- Do not push anywhere. Commit in small steps with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Where to record

Add a section **"MCP rehearsal results (Step 5)"** to `NOTES.md` with one table:

| # | Asked | What happened | Result |
|---|---|---|---|

Result is **pass**, **fail**, or **note** (works, but differs from what was expected). Screenshots go in `docs/screenshots/5/`:
cases 5 and 13 need before and after pictures of the chapter page (`node scripts/shot.mjs <url> <out.png> --width=1200`).

## Useful facts already established (do not re-research)

- At Read and write, the drafter was offered 31 tools and no admin tools; at Read only, 14. See `docs/apply/3c-mcp-settings.md`.
- A drafter can create and edit their own draft, but cannot apply it ("Draft not found."), change live content ("You are not authorized to save this entry."), delete it ("Entry not found."), or create a new guide.
- The layout fields are `layoutHeadline` (option values `guideFirst` and `chapterFirst`), `layoutStickyMenu` and `layoutShowInSection`, on the **guide** entry, not the chapter.
- A rich-text body is an HTML string; a Matrix field is `{ "entries": [ { "<typeHandle>": { "id": "new:<key>", ... } } ] }`; a Link is `{ "type": "url", "value": "..." }`; omit an empty `fields` argument instead of sending `{}`. Details are in NOTES "Findings from Step 4".
- The draft of a guide changes the chapter page only after a Publisher applies it, because chapters read the layout from their parent guide.
- For "looks right in Craft's preview" (case 5): `.local/drafter-state.json` is a signed-in browser session for Playwright (`scripts/rehearsal/cp-lib.mjs` has helpers). If automating the preview is not practical, say so and record how you checked instead.
- Case 15: the Tokens screen is in the user's account area of the control panel. Find it with Playwright using `.local/drafter-state.json`.

## When finished

1. Complete the table, note anything that behaves differently from dev (case 14) in NOTES "Differences from production", and add Step 5 to `docs/time-log.md` from the machine clock.
2. Switch back to dev: `./scripts/use-env.ps1 dev` (PowerShell, from `D:\code\craft-demo`).
3. Remove the extra MCP entry you do not need: `claude mcp remove craft-fullscale` for the unused project key, if you want it tidy.
4. Commit. Then Step 6 (`fullscale-demo-prompt.md` line 146 onwards) is next, and it asks the user before anything touches a remote.
