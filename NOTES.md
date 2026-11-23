# NOTES: FullScale rehearsal

Work in progress. Sections for MCP and workflow results (Steps 5 and 6) are added as those steps complete.
Final home for everything here is `docs/day-one-runbook.md` (Step 8).

## What this is

A local Craft 5.12.1 copy used to rehearse the real setup on FullScale's site once the agency finishes the 5.12 upgrade.
Everything we ADD (layout fields, user groups, permissions, MCP settings, templates, guardrails) is meant to be reapplied
on their site. Everything marked **REPLICA** below is throwaway and is replaced by their real content model on day one.

## Start and stop

Run from `d:\code\craft-demo` in PowerShell. Docker Desktop must be running first.

| Task | Command |
|---|---|
| Start from cold | `./scripts/start-site.ps1` (starts Docker Desktop if needed, runs `ddev start` from the right path, waits until the site and the MCP endpoint answer). **Use this after every restart.** It ends with `READY` or `NOT READY`. An MCP sign-in that says `ECONNREFUSED` means the site is down; `Bad Gateway` means the containers are up but PHP is not running, which the script repairs with one `ddev restart`. If it says `NOT READY`, send the whole output. |
| Start (already warm) | `ddev start` from `D:\code\craft-demo` with an uppercase drive letter (site: https://fullscale-rehearsal.ddev.site, CP: `/admin`) |
| Stop | `ddev stop` (keeps data); `ddev poweroff` stops all DDEV projects |
| Craft CLI | `ddev craft <command>` (check `ddev craft help <command>` first) |
| Switch environment | `./scripts/use-env.ps1 dev` or `./scripts/use-env.ps1 production` (swaps `.env`, clears caches) |
| Admin login | `.local/credentials.txt` (git-ignored) |
| Screenshot | `node scripts/shot.mjs <url> <out.png>` |
| Seed / remove test fixtures | see the header of `scripts/seed-fixtures.php` |

Environments (both `.env.dev` and `.env.production` are git-ignored; templates are `.env.example.*`):

| | dev | production |
|---|---|---|
| `CRAFT_ENVIRONMENT` | dev | production |
| `CRAFT_DEV_MODE` | true | false |
| `CRAFT_ALLOW_ADMIN_CHANGES` | true | false |

Database settings come from DDEV container variables (`.ddev/.env.web`, git-ignored); container variables beat `.env`.
Verified with `ddev craft exec` that Craft itself reports these values in both environments.

`scripts/_*.mjs` are small probes used while driving the control panel (list form controls, open a menu). Safe to ignore.

## Versions

Craft 5.12.1 (`craftcms/cms` pinned `~5.12.1`), CKEditor plugin 5.9.0, PHP 8.3.36, MySQL 8.0.46, DDEV 1.25.5, Docker Desktop 4.99.0 (WSL2 backend).
PHP 8.3 was chosen inside Craft 5's supported range; FullScale's real PHP version is an open question.

## Differences from production (handle on day one)

| # | Difference | Day-one handling |
|---|---|---|
| 1 | **Edition.** Local Pro is a trial (`system.edition: pro` in project config). Team allows only one user group; we need two (Drafters, Publishers), so Pro is required. | Confirm FullScale's edition. Never copy `system.edition` from our project config. |
| 2 | **`project.yaml` holds more than schema:** edition, site name, email settings, time zone, and the `fs:` filesystems all live in it. | Never overwrite their `project.yaml`. Merge our keys one by one. Expect `dateModified` conflicts. |
| 3 | **License key.** `config/license.key` is a local trial key, git-ignored. | Their site has its own. Do not copy ours. |
| 4 | **Admin changes.** Dev has `allowAdminChanges` true so schema work lands in project config; production has it false. | Make changes in dev/staging, deploy project config, never edit schema on live. |
| 5 | **Hosting and HTTPS.** Local HTTPS uses DDEV's mkcert CA; the Claude app needs a public address (Step 7). | Their real domain and certificate cover this. |
| 6 | **Git on D: breaks `ddev craft`.** DDEV only finds Git Bash in fixed C: locations. Fixed with a junction `C:\Users\ultim\AppData\Local\Programs\Git` pointing to `D:\Program Files\Git`. | Local only. Remove the junction with `cmd /c rmdir <link>`, never `Remove-Item -Recurse`. |
| 7 | **Craft was created through a temp folder.** `ddev composer create-project` refuses a folder with extra files, so the project was built in the container and copied in. | Local only. |
| 8 | **Mutagen "problems" label** in `ddev list`: it cannot create one symlink inside `vendor/craftcms/cms/.claude/skills` on Windows. Harmless. | Local only. Windows Developer Mode would silence it. |
| 9 | **Windows line endings.** `.gitattributes` forces LF so branch switches don't rewrite files as CRLF. | Keep `.gitattributes` in the repo. |
| 10 | **OAuth signing keys** live in `storage/oauth-*.key`, generated locally with `craft oauth/generate-keys` and git-ignored. | Generate on each real environment, or supply through `config/oauth.php`. They must persist across deploys and match on every server. Never commit them. |
| 11 | **Node and the mkcert CA.** My Node test scripts need `NODE_EXTRA_CA_CERTS` locally. The Claude Code client (native build 2.1.327) does not: it trusts the Windows certificate store and connected over HTTPS without the variable (verified). | Local only. Production has a public certificate. |

## Gotchas learned

- **Mutagen lag.** Craft writes project config inside the container and Mutagen syncs it to Windows a few seconds later. Run `ddev mutagen sync` before reading `config/project/` from Windows.
- **`ddev composer create-project --help` actually runs the command.** It stopped at a pre-check here; don't use `--help` on it.
- **PowerShell 5.1 and quotes.** It strips double quotes when passing arguments to native programs. Put PHP in single quotes when calling `ddev craft exec`, or call it from Git Bash.
- **PowerShell 5.1 and BOMs.** `Set-Content -Encoding utf8` adds a byte-order mark. Use the editor tools or Git Bash for files that git or YAML will read.
- **Craft ships agent skills in `vendor/craftcms/cms/.agents/skills/`** (`translations`, `twig-upgrade`). Not for staff; review in Step 6.
- **Control-panel automation.** The CKEditor toolbar designer is drag-and-drop and could not be driven by synthetic mouse events (three attempts). Everything else (fields, entry types, Matrix, sections) works through Playwright. Extra details from 3a: Dropdown options are an editable table (the "default" tick is a `<label>` over the input, so click the label); entry edit screens render dropdowns with Selectize (click `.selectize-input`, then the option); control-panel entry URLs use the section **handle** (`/admin/entries/guidesForTeams`).
- **`ddev` may not be on PATH** in a fresh shell here. It is at `C:\Users\ultim\AppData\Local\Programs\DDEV`; add that folder to PATH for the session.
- **`curl` against the local site** needs `--ssl-no-revoke` (Windows schannel can't check revocation for mkcert certificates). The certificate chain is still verified.
- **Admin session expires.** If a control-panel script can't find a form, run `node scripts/cp-login.mjs` again.

## Portable changes (reapplied on the real site)

Each lives on its own branch, merged to `main`, with an apply guide in `docs/apply/`.

| Change | Branch | Status | Apply guide |
|---|---|---|---|
| 3a Layout fields: `layoutHeadline`, `layoutStickyMenu`, `layoutShowInSection` on the guide entry type | `portable/layout-fields` | Done. Defaults reproduce today's layout exactly (HTML and screenshots identical); 8 of 8 option combinations pass; sticky verified by scrolling. | [docs/apply/3a-layout-fields.md](docs/apply/3a-layout-fields.md) |
| 3b User groups: Content Drafters, Publishers | `portable/user-groups` | Done. Permission matrix 54 of 54; both test users sign in and see what their group allows. | [docs/apply/3b-user-groups.md](docs/apply/3b-user-groups.md) |
| 3c MCP settings: authenticated server on, public off, access level "Read and write" | `portable/mcp-settings` | Done. Verified over real HTTP + OAuth as the drafter at both access levels. | [docs/apply/3c-mcp-settings.md](docs/apply/3c-mcp-settings.md) |

Findings from 3a that matter on day one:

- **A Dropdown's default is not applied to entries saved before the field existed** (value is `null`); Lightswitch defaults are. Templates must treat an empty dropdown as the default.
- **Sticky menus need a tall parent.** A sticky element cannot leave its parent container.
- **Every new field touches `project.yaml`** (`dateModified` and a `meta.__names__` line), so expect merge conflicts there. `craft project-config/touch` resolves the `dateModified` one.
- **Whitespace-only HTML differences are expected** when a template uses Twig `{% set %}` capture. Compare with whitespace around tags normalised, plus screenshots.
- Keep YAML ASCII. Curly quotes typed into field names or instructions land as non-ASCII in project config. Fixed here by editing the fields through the control panel.

Findings from 3b that matter on day one:

- **Group permissions are stored with site-specific UIDs** (`viewentries:<section uid>`), so the group YAML cannot be copied to their site. Recreate the groups in the control panel, or copy the YAML after swapping in their section and volume UIDs.
- **Saving the first user group makes Craft write `config/project/users/users.yaml`** (and removes the `users:` block from `project.yaml`). It holds site-wide settings (`requireEmailVerification`, `allowPublicRegistration`, `require2fa`). Never copy it onto their site.
- **`accessCp` is required for MCP element tools**, plus normal element permissions. There is no separate "use MCP" permission.
- **Drafts need only view access.** Craft lets anyone who can view an entry create a draft of it. Applying one needs `save` on the draft and `saveCanonical` on the live entry, so Publishers get `savePeerEntryDrafts` + `saveEntries` + `savePeerEntries`.
- **MCP permission refusals are worded inconsistently**, confirmed over HTTP in 3c: applying a draft says "Draft not found.", deleting live content says "Entry not found.", changing live content says "You are not authorized to save this entry."
- **Test users** (fake, passwords in `.local/credentials.txt`): `maya.okafor` (Content Drafters), `daniel.reyes` (Publishers). Step 4 reuses them.
- Drafters cannot create new guides (a draft is a copy of an existing entry, and a new entry needs `createEntries`). Policy question for FullScale, see open questions.

Findings from 3c that matter on day one:

- **The access level is not a server setting.** Each person chooses Read only or Read and write on the OAuth consent screen. **Read and write** is the lowest level that lets a drafter create drafts: `drafts_create` and `elements_update` are not offered at Read only (14 tools versus 31). Full access is never offered to non-admins.
- **"Read only" is pre-selected** on the consent screen, and Craft **remembers the approved level**: a reconnect skips the consent screen and reuses the highest level approved before (tested). Access tokens last 1 hour and refresh tokens 30 days. Staff must be told to choose Read and write.
- **Read and write does not bypass permissions.** Drafter over HTTP: creates and edits their own draft, cannot apply it, cannot change or delete live content (messages above).
- **OAuth signing keys are not covered by Craft's `storage/.gitignore`.** A plain `git add` would commit the private key. `.gitignore` now has `/storage/oauth-*.key` and `*.pem`. Day one: add that first, and check how their host persists `storage/` (or supply the keys through `config/oauth.php`).
- **Node scripts do not trust the Windows certificate store.** Local only: set `NODE_EXTRA_CA_CERTS` to `C:\Users\ultim\AppData\Local\mkcert\rootCA.pem` for the Node test scripts. **Claude Code itself does not need it** (checked in Step 5 prep: the native build reached the server over HTTPS with the variable unset). An earlier version of this note said the Claude Code CLI needed it, which was wrong.
- **Give OAuth clients the authorization endpoint, `/admin/mcp/auth`, not `/admin/mcp`.** Craft advertises its OAuth protected resource as `/admin/mcp/auth`. Claude Code rejected `/admin/mcp` ("Protected resource ... does not match expected ...") but accepted `/admin/mcp/auth` ("Needs authentication"). This matches the settings page, which calls it the path "to give MCP clients that sign in with OAuth". My own test scripts worked on `/admin/mcp` only because they send a token directly.
- **The endpoint follows `cpTrigger`** and needs `accessCp`. Craft says to treat a custom `cpTrigger` as sensitive.
- **Test harness:** `scripts/portable/_oauth.mjs` is a small OAuth + PKCE + MCP client that drives the consent screen with Playwright, so tests can run over the real endpoint without a manual sign-in. It registers ONE OAuth client and reuses it (registration is limited to 10 per IP per hour). It does not replace the Claude Code tests in Step 5.

## Sample content (Step 4)

Created **through Craft's MCP server over HTTP + OAuth by the Publisher** (`daniel.reyes`), with no database writes and no console seeding. All 11 entries are authored by that user (checked in Craft).

| Guide | Chapters (real titles) |
|---|---|
| **Digital Equity** (NEW badge on) | Introduction; Getting Started (3 resource cards); Digital Equity in the Classroom; Essential Conditions to Support Digital Equity (2 cards); Taking It Forward |
| **Research and Measurement** | Introduction; Getting Started; Collect and Analyze Data (2 cards); Taking It Forward |

- The chapter titles are real. **The text is short original sample wording** ("Sample text. ..."), not copied from the real site. Each chapter has 2 to 3 H3 headings so "In this section" has something to list.
- Result: 12 pages (index plus 11) all return 200 with exactly one `<h1>`; the index shows the NEW badge once.
- Recreate or extend: `scripts/sample-content/create-guides.mjs` (idempotent; `--check` creates nothing and fails if anything is missing). It makes 22 MCP calls for the 11 entries. Needs `.local/publisher-state.json` (`node scripts/cp-login.mjs --user=daniel.reyes --state=.local/publisher-state.json`) and `NODE_EXTRA_CA_CERTS`.
- Real excerpts and icons would need FullScale's content and permission. Icons (assets) were not uploaded.

Findings from Step 4:

- **A drafter cannot propose a new guide**, tested over MCP: a live `elements_create` and one with `asUnpublishedDraft` are both refused ("You are not authorized to save this entry."). Needs `createEntries`; the effect of granting it is untested.
- **The MCP server shows the layout fields.** A guide returned by the server includes `layoutHeadline`, `layoutStickyMenu` and `layoutShowInSection`, so Step 5's layout case has them to work with.
- **`elements_list` has no parent or descendant criterion.** The accepted criteria are `id, uid, site, siteId, status, search, trashed, relatedTo, with, archived, orderBy, offset, limit, slug, section, sectionId, type, typeId, authorId`. Telling a chapter from a guide means checking `parentId`, `level` or `uri` on the results.
- **Writing a Matrix field over MCP:** `{ "entries": [ { "<entryTypeHandle>": { "id": "new:<key>", "title": ..., <fields> } } ] }`. A Link field is `{ "type": "url", "value": "..." }`. A rich-text body is an HTML string.
- **Create and list results omit some fields.** The returned chapter lists `chapterSubtitle`, `chapterHeroImage` and `chapterBody` but not `chapterVideoUrl` or the resource cards. The cards were saved (checked in Craft), so don't judge success from the response alone.
- **Empty `{}` is read as an array by the schema check.** Omit an empty `fields` argument instead of sending `{}`.
- **After a restart:** Docker Desktop is not running (start it first). `ddev start` must be run from `D:\code\craft-demo` with an **uppercase** drive letter, for example `Set-Location D:\code\craft-demo` in PowerShell. From Git Bash, `cd /d/code/craft-demo` gives `d:` and DDEV refuses ("project root is already set to D:\code\craft-demo"). Other `ddev` commands tolerated it. The OAuth keys, site and MCP endpoint all came back working.

## MCP rehearsal results (Step 5)

Run in the **production** environment (devMode off, `allowAdminChanges` false) through Claude Code (native 2.1.329) connected to `https://fullscale-rehearsal.ddev.site/admin/mcp/auth`, signed in as the drafter `maya.okafor` at **Read and write**. All actions below were done with the `craft-fullscale` MCP tools. The console and curl were used only to check results. Pass, fail or note. A **note** means it works but differs from what was expected.

| # | Asked | What happened | Result |
|---|---|---|---|
| 1 | List the tools the drafter sees; confirm no admin tools | **31 tools** offered: `asset_folders_create/delete/get/list/update`, `assets_create/replace/transform_url/upload_url`, `drafts_apply/create/delete/list`, `elements_create/delete/duplicate/field_schema/get/list/restore/schema/update/validate`, `info_get`, `preferences_get/update`, `revisions_apply/get/list`, `search_query`, `structures_move_element`. No `configuration_*`, `project_config_*`, `plugins_*` or user-permission tools. Identity confirmed: the draft made in case 2 belongs to `maya.okafor`. | pass |
| 2 | "Update the subtitle of the Digital Equity Getting Started chapter" | `drafts_create` on entry 36 gave draft **68**; `elements_update` on 68 set the subtitle to "Take stock of your community before you act." The server answered `savedAsDraft: true`, "Entry 36 is unchanged until the draft is applied". The live page is **byte-identical** to the baseline, and the live entry still reads "Take stock before you act." | pass |
| 3 | `elements_update` directly on the live entry (36) | Refused: "You are not authorized to save this entry." Live page unchanged. | pass |
| 4 | `drafts_apply` (own draft 68) and `elements_delete` (live entry 36) | Both refused: `drafts_apply` says "Draft not found.", `elements_delete` says "Entry not found." Nothing changed: the live entry exists and is not trashed, the draft still exists, the page is byte-identical. | pass. **Note:** the wording says "not found" for something that exists, so staff may be told it does not exist. |
| 5 | "Switch Digital Equity to chapter-title-first headlines and turn on the sticky menu" | `drafts_create` on the **guide** (entry 32) gave draft **69**. `elements_field_schema` showed `layoutHeadline` takes the option **value** (`enum: guideFirst, chapterFirst`), which confirms the expectation in the 3a guide. `elements_update` set `layoutHeadline: chapterFirst` and `layoutStickyMenu: true`; the server answered `savedAsDraft`. The live chapter page stayed byte-identical. **The preview does not show the change:** opened as the drafter, Craft's Preview of the guide draft renders the guide page (one `<h1>`, no sticky class, no chapter-first marker). The layout only appears on **chapter** pages, and they read the layout from the *live* guide, so it cannot be previewed until the draft is applied. Screenshot: `docs/screenshots/5/case5-preview-guide-draft.png`. | **Draft: pass. "Looks right in Craft's preview": fail** (a limit of the replica templates, see Decisions below) |
| 7 | Edit body text with headings and links (chapter "Digital Equity in the Classroom") | `drafts_create` gave draft **70**; `elements_update` replaced `chapterBody` with HTML containing bold, italic, two links, a new H3 section and a bulleted list. The saved HTML kept all of it. The **rendered Craft preview** showed 4 H3s, "In this section" listing all 4 (including the new one), both links with the right addresses, 1 bold, 1 italic and 2 list items. The live page does not contain the new section. Screenshot: `docs/screenshots/5/case7-preview-body-draft.png`. | pass. **Note:** the list survived although the replica's editor toolbar has no list button, so MCP can write formatting the editor UI cannot. |
| 8 | Add a resource card to a chapter, and reorder cards ("Essential Conditions...") | `drafts_create` gave draft **71**; `elements_get` with `fields: ["chapterResourceCards"]` listed the existing card IDs (47, 48). `elements_update` added an activity card (`id: "new:family-tech-night"`) and set `sortOrder: ["new:family-tech-night", 48, 47]`. The draft preview shows: Run a family tech night, Conditions checklist, Plan for repair and replacement. The live page still shows the original two cards in the original order. Screenshot: `docs/screenshots/5/case8-preview-cards-draft.png`. | pass. **Note:** the `drafts_create` and `elements_update` responses omit the cards, so read them with `elements_get` first and check the result there. |
| 9 | Upload an image and set it as a chapter hero (Research and Measurement, Getting Started) | `assets_upload_url` gave a single-use URL; `curl -T` of a 231 KB PNG to it returned `upload_id`; `assets_create` (volume 1, Guide images, `upload_id` + `file_name`) created **asset 73**, uploaded by `maya.okafor`. `drafts_create` on entry 58 gave draft **74**; `elements_update` set `chapterHeroImage: [73]`. The draft preview shows the hero image; the image file is served (200, `image/png`); the live page has no hero. Screenshot: `docs/screenshots/5/case9-preview-hero-draft.png`. | pass. **Note:** the upload is **live and public immediately** (`/uploads/guides/...`), because assets cannot be drafted. Only its use on the page waits for a Publisher. Craft also re-saved the file at a larger size (231 KB sent, 344 KB stored). |
| 6 | An ambiguous request: "update the Introduction" | `elements_list` with `slug: introduction` found **two** chapters: entry 34 in Digital Equity and entry 56 in Research and Measurement. **No draft was created** (the draft list at that point held five drafts, none of entries 34 or 56). I asked which guide and what to change, naming both. The person did not know and said "pick one and change the subtitle to whatever you want". Then `drafts_create` on entry 56 gave draft **75**, and `elements_update` set the subtitle to "Why measure, and how to get started." Both live Introduction pages are unchanged. | pass. **Note:** staff may not know either, so the question should offer the two choices by guide name, as it did. No question for FullScale arises from this case. |
| 10 | An invalid value: a dropdown option that does not exist | `elements_update` with `layoutHeadline: "centered"` was rejected: "Invalid fields: /layoutHeadline: Value must be one of the allowed values: "guideFirst", "chapterFirst", null. Call elements_field_schema for the accepted fields." `elements_validate` with the *label* "Chapter title first" gets the same message. The draft was not changed (same values and `dateUpdated`). | pass. The message is clear and names the accepted values. |
| 11 | Something only a template change can do: "make the headline red" | Checked what the drafter can change: the field schemas for a guide and a chapter (case 5 and the chapter drafts) contain no colour or styling field, and no MCP tool edits template or CSS files (Craft's MCP never touches template files). I did **not** try workarounds such as inline styles in the body, which would not change a template-generated headline and would be the wrong fix. Answer given to the requester: "That is a design change, not a content edit. The headline colour comes from the site's template and stylesheet, which I cannot change through the CMS. It needs a template change through the Claude Code site-change workflow (a branch and a pull request that someone reviews), not a draft." | pass, with a note: the workflow I point to is built in **Step 6** and does not exist yet. Judged by me, not by a second reviewer. |
| 12 | Reorder chapters as the drafter (`structures_move_element`) | Tried moving "Taking It Forward" (52) before "Getting Started" (36) in structure 1. **Refused:** "You are not authorized to edit this structure." The live chapter order is unchanged (Introduction, Getting Started, Digital Equity in the Classroom, Essential Conditions..., Taking It Forward). | pass (refused). **Note:** a structure move is a live change that cannot be drafted, so a drafter has no way to propose a new order through MCP. The tool is still offered to drafters, but refused when called. A Publisher **can** move chapters (checked in case 13), so reordering is a Publisher job. |
| 15 | Revoke the drafter's authorization from their account's Tokens screen; confirm Claude loses access | Signed in as `maya.okafor`, the Tokens screen (`/admin/myaccount/tokens`) listed two apps: "Claude Code (craft-fullscale)" and my own test client. Used **Actions > Revoke** and accepted the confirmation on "Claude Code (craft-fullscale)"; it disappeared from the list, and the test client's grant stayed. The very next MCP call failed: "MCP server "craft-fullscale" needs you to sign in again (run /mcp to re-authenticate)", and `claude mcp list` went back to "Needs authentication". All six drafts and the asset were untouched. Screenshots: `docs/screenshots/5/case15-tokens-before.png` and `case15-tokens-after.png`. | pass. **Note:** access ended **immediately**, although the access token had up to an hour left, so revoking works as a kill switch. It is per app, so a person with several connected apps must revoke each one. This case ran before 13 and 14 because it ends the drafter connection. |
| 13 | Reconnect as the publisher: apply the drafts from cases 2 and 5, check the live pages change, then roll one back with `revisions_apply` | Signed in as `daniel.reyes` (confirmed from Craft's own record: the revision shows "by daniel.reyes" with the draft's note). `drafts_list` showed the drafter's drafts. **Draft 68** (case 2) applied: the live subtitle changed, and the page differs from the baseline in exactly that one line. **Draft 69** (case 5) applied: all five Digital Equity chapter pages switched to chapter-title-first (the chapter title is the H1, the guide title a small label) with the sticky menu on (menu top 376 px unscrolled, 0 px after scrolling 400 px); the four Research and Measurement pages did not change. **Rollback:** `revisions_list` on the guide (entry 32) showed two revisions, 33 (original: `guideFirst`, not sticky) and 77 (new). `revisions_apply` on **33** put the guide back; the chapter pages returned to the default layout and differ from the original baseline only by the case-2 subtitle, which was deliberately left live. Extras as Publisher: moved a chapter (52 before 36) successfully and restored the order; discarded the drafter's four other test drafts (70, 71, 74, 75). Final check in Craft: no drafts left, 11 entries. Screenshots: `docs/screenshots/5/case5-13-before-getting-started.png`, `case5-13-after-getting-started.png`, `case13-after-sticky-scrolled.png`, `case13-after-rollback-getting-started.png`. | pass. **Notes:** revisions are snapshots taken *after* each save, so to go back you apply the **older** revision, which is easy to get backwards. The applied draft's notes become the revision's notes, which makes them a useful audit trail. The test image (asset 73) stays in the library, because a Publisher cannot delete assets. |
| 14 | Confirm admin-only tools stay unavailable in production even for an admin account, and note anything else that behaves differently from dev | Signed in as `admin` at **Full access**. Confirmed by using admin-only tools: `system_status_get` returned live, `project_config_status` no pending changes, `plugins_list` CKEditor 5.9.0. The client offered **54 tools**: the drafter's 31 plus 23 admin and utility tools (`configuration_get/list/schema`, `content_model_audit`, `plugins_list`, `project_config_diff/get/rebuild/status`, `system_status_get`, `users_field_layout_get`, `addresses_field_layout_get`, `caches_clear/list`, `queue_release_all/retry_all/run/status`, and five `user_permissions_*`). Craft's source defines 71 tools, 2 of them public-server only; exactly the **15 that require `allowAdminChanges` are absent** (asked for each by exact name: none exist): `configuration_create/update/delete`, `project_config_apply/write`, `plugins_install/uninstall/enable/disable`, `system_status_enable/disable`, `user_permissions_group_set/update`, `addresses_field_layout_update`, `users_field_layout_update`. So it is only the admin **write** tools that disappear; the admin **read** tools stay. Still reachable by a Full-access token in production (not called): `project_config_rebuild` (admin only, no `allowAdminChanges` check) and `user_permissions_user_set/update` (need `assignUserPermissions`; user permissions live in the database, not project config). **Cross-check of 3b:** `user_permissions_user_get` for `maya.okafor` shows exactly the six designed permissions and no direct grants. **The control panel in production, same admin:** Settings > Fields, Sections, Entry types and User settings are read-only ("Changes to these settings aren't permitted in this environment."); New field and New section return **403** ("Administrative changes are disallowed in this environment."); the MCP settings page has no Save button (its save needs admin changes, from the source); the user-group form loads but its fields and all 52 permission boxes are disabled, so the visible Save button does nothing. Nothing could be created (checked: still two groups, no config changes). Screenshots: `docs/screenshots/5/case14-*.png`. | pass. **Note:** "admin-only tools are unavailable" is true for the write tools only. See "Decisions" for what that means for admins. |

### What production mode changes (observed in Step 5)

- **Settings are read-only for everyone, admins included.** The control panel shows a notice, creating fields or sections returns 403, and 15 MCP tools are hidden. Schema changes go through dev or staging and deploy as project config.
- **Switching environments logs everyone out.** All saved control-panel sessions were dropped when the site went to production and caches were cleared, so test users had to sign in again.
- **Craft's own front-end login form is used for the MCP sign-in** (`/actions/users/login`) when a person has no live session. Whether FullScale's site customises that page, and what staff will see there, is a question for Honcho.
- **Content work is unchanged.** Drafts, edits, uploads, applies and rollbacks all behaved the same as in dev (cases 2 to 13).
- **A Full-access admin token is broader than it looks.** See case 14: the rebuild and user-permission tools still work in production.

### Decisions needed (from Step 5)

1. **Previewing a layout change (case 5). DECIDED: accept (option a).** The layout fields live on the guide but only change chapter pages, and chapters read the *live* guide, so Craft's Preview of a guide draft shows nothing different. The change is visible only after a Publisher applies it, and case 13 showed that rolling back is clean. Options: **(a) accept it** and tell staff a Publisher checks the result after applying (recommended now, since it is tested and needs no change); **(b)** add a small banner to the guide page, shown only in preview, that lists the pending layout settings (a small template change, worth doing on day one if staff will not accept (a)); a real chapter-level preview is not possible with this design.
2. **What staff must be told. DECIDED: yes, admins also use Read and write day to day; Full access only for deliberate admin work.** Connect to the `/admin/mcp/auth` URL, choose **Read and write** on the consent screen ("Read only" is pre-selected and is remembered on reconnect), and expect refusals worded "Draft not found.", "Entry not found." or "You are not authorized to save this entry.", which all mean their group cannot do it. Goes into the Claude instructions in Step 8.
3. **Admins.** _(Covered by decision 2 above.)_ Admins are offered Full access. For everyday content work they should choose Read and write. Full access in production still reaches `project_config_rebuild` and the user-permission tools (case 14).
4. **Refusal wording.** Craft's server accepts custom instructions (`instructions` in its MCP config), which could tell Claude what those refusals mean and to always draft. Not tested; evaluate in Step 8.
5. **OPEN, the contractor will come back on this.** **Uploaded images are public at once** (case 9), even if never used. Ask FullScale whether drafters may upload at all, or whether uploads should be a Publisher job.
6. **Reordering chapters is a Publisher job** (cases 12 and 13). Tell staff to ask a Publisher.
7. **A committed `.mcp.json`. DECIDED: yes. Done in Step 6** (the file holds only the server URL).

## Claude Code workflow for template changes (Step 6)

**Status:** built and tested locally. The pull request flow, branch protection and the first real run of the GitHub workflow wait for the remote, which needs your OK (see "Open items" at the end of this section).

### What exists

| File | What it does |
|---|---|
| `.claude/settings.json` | Permission rules and the render-check hook. Committed, so it applies to everyone who opens the repo. |
| `.claude/skills/site-change/SKILL.md` | `/site-change`, the staff workflow. Runs only when a person types it (`disable-model-invocation`). |
| `scripts/render-check.mjs` | The render check, used three ways: CLI, hook, and CI. |
| `scripts/change-shots.mjs` | Before and after pictures of the pages a change affects. |
| `.github/workflows/render-check.yml` | The pull request gate: a scope check and a render check. **Not yet run on GitHub.** |
| `.mcp.json` | The Craft MCP server URL (Step 5 decision). |

`CLAUDE.md` is a Step 8 item and is not written yet.

### The permission rules, one by one

| Rule | What it does | Why |
|---|---|---|
| allow `Edit(/templates/**)` and `Edit(/web/assets/css/**)` | Edits there need no approval. | The only places a design change should touch. `/` anchors the path at the project root, and an Edit rule covers all of Claude's editing tools. The real site's CSS folder may have a different name. |
| deny `Edit(/config/**)` | Blocks edits to Craft's config, including `config/project/`. | Project config is the schema: fields, sections, user groups, MCP settings. It changes through the control panel in dev, reviewed, and never by hand. |
| deny `Edit(/composer.json)` and `Edit(/composer.lock)` | Blocks dependency changes. | A new package is code nobody has reviewed. |
| deny `Edit(/.env)` and `Edit(/.env.*)` | Blocks edits to environment files. | They hold the database login, the security key and the switches for devMode and `allowAdminChanges`. This also blocks the harmless example files. |
| deny `Edit(/.ddev/**)` | Blocks edits to the local environment definition. | It decides the PHP version, the database and the site address. |
| deny `Read(/.env)` and `Read(/.env.*)` | Keeps the real environment files out of Claude's view. | Stops secrets entering a conversation. Claude Code's docs add that a Read deny also blocks Edit and Write on the same path. **Too broad:** it also blocks `.env.example.*`, which hold no secrets. See Open items. |
| deny `git push` variants, for both the Bash and PowerShell tools | Blocks a bare `git push`, any push naming `main` or `master` as a whole word (`origin main`, `HEAD:main`, `refs/heads/main`), `--force`, `-f`, a `+` refspec, `--delete` and `--mirror`. | A staff session pushes only its own branch, by name: `git push -u origin change/x`. Whole-word matching means a branch such as `change/maintenance-fix` is not caught (tested). |
| deny `gh pr merge` and `gh pr ... --admin`, both tools | Blocks merging from a session. | The skill promises never to merge. A person with review rights merges on GitHub. |
| hook: PostToolUse on Edit, Write and MultiEdit runs `scripts/render-check.mjs --hook` | Runs the render check after every template or CSS edit. Exit code 2 puts the failures in front of Claude. | Quick feedback while it works. A convenience, not the gate. |

62 deny rules in total (6 Edit, 2 Read, 27 Bash, 27 PowerShell). Each Edit and Read denial was tested with a real tool call, and so were the push rules (below).

### What the local rules do not do

- **They guide a session, they are not a security boundary.** Claude Code's own documentation says so: a rule covers the form Claude usually produces. The documented bypass `git -C . push origin main` is not matched by a `git push` rule. I tried it; this session's own safety classifier refused to run it, so I could not confirm it either way. Do not rely on the rules alone.
- **Rules are per tool.** A Bash rule does not cover the PowerShell tool. See finding 1.
- **Edits outside the allowed folders are prompted, not denied.** An allow rule does not deny the rest. A staff member who edits `docs/` is asked to approve; nothing blocks them if they say yes.
- **Allow rules only apply once a person trusts the folder.** Deny and ask rules apply at once (Claude Code's docs).
- **What holds on any machine is the pull request:** the scope check in CI (a `change/*` pull request may touch only `templates/`, `web/assets/css/` and `docs/change-previews/`), branch protection on `main`, and a required approval. Those need the remote.

### The render check

Fetches the guides index and follows every link under `/guides-for-teams`, so it needs only a running site (no database access). It fails on any non-200 response, a template error marker, or an almost empty page, and groups identical failures so one broken partial reads as one problem, with the template and line. Tested: the live site (12 pages in about a second), a deliberately broken template, an unrelated-file edit (skipped), an unreachable site (CLI exits 1; hook warns and exits 0, so it never traps someone whose site is off), and a clean clone (below). Exit codes: CLI 0 or 1; hook 0 or 2 (2 shows the report to Claude).

### What the CI check needs on their real setup

What I built (option A) was rehearsed step by step in a clean clone of the repository as a second DDEV project, then deleted. Measured: `ddev start` 20 s, `composer install` 31 s, `install/craft` 26 s, check 1 s. What I learned: a fresh clone has no `vendor/`, no `.env` and no `.ddev/.env.web`; DDEV writes `.ddev/.env.web` itself on start; `install/craft` **applies the project config on its own** (no separate `project-config/apply`); `craft setup/keys` makes the app ID and security key; the seeder works on a clean install; a template broken in the clone is caught.

| Option | What it needs | Catches | Costs |
|---|---|---|---|
| **A. Build the site in CI** (what is built) | A runner with Docker, DDEV, the repository, and a seeder that creates sample content for **their** content model. | Syntax errors and runtime errors on real page types. | About 4 to 6 minutes a run; the seeder must be kept in step with their entry types. |
| **B. Check a staging site** | A staging URL per pull request (or a shared one), and a way to deploy the branch to it. | The most realistic result, with real content. | Depends on their hosting, which we do not know. |
| **C. Twig syntax lint only** | Nothing but PHP. | Syntax errors only. Misses undefined fields and data-dependent errors, which is most of what breaks. | Cheap, but weak. |

Questions for Honcho before choosing: where the repository and CI run, whether staging can be created per branch, whether a sanitised database copy is allowed in CI (so no seeder is needed), and whether Composer needs credentials for private packages. Unverified until the first real run: the action versions (`actions/checkout@v7`, `actions/upload-artifact@v7`, `ddev/github-action-setup-ddev@v1`, per the docs read on 2026-11-23), and how a runner resolves `*.ddev.site` and trusts the certificate (the workflow passes `--insecure` for that).

### Test results (run as a staff member would)

Each case ran in a **separate Claude Code session** started with `claude -p "/site-change ..." --permission-mode manual --permission-prompts none`, so nobody could approve a prompt and anything not allowed was denied. That is close to a person who declines every prompt, but it is not a real person, and I started each run. The test branches are kept; the first two are the ones to push when the remote exists.

| # | Request | What happened | Result |
|---|---|---|---|
| a | "Make chapter titles bigger and add more space above them" | Branch `change/bigger-chapter-titles` (commit 2ec430e). CSS only: chapter title 1.8 to 2.1 rem (+17%), space above 24 to 48 px (double), and the chapter-first title 2.2 to 2.6 rem. Phones keep their title size so it does not outrank the smaller guide title, but get the extra space; it said so. Before and after pictures, render check 12 of 12, one commit of CSS plus pictures (the scope check would pass), no permission denials. It stopped at publishing because there is no remote, with the right message. I checked the diff and the numbers it quoted. | **pass.** It chose the amounts without asking a question (the skill says to ask if vague), explained them and offered to adjust. |
| b | "Add a 'Back to top' button on chapter pages" | Branch `change/back-to-top-button` (commit 80b48ec). A link and a comment in `_chapter.twig` (three lines) and five lines of CSS: a button pinned bottom right, chapter pages only, same look as the other buttons, with a keyboard focus outline. Verified in a real browser after the session said it could not: scrolled to the bottom (742 px), clicked, back at 0 px; the button stays on screen and covers no other element. It is always visible, because showing it only after scrolling needs JavaScript; it said so. One permission denial (it tried `curl` on the live site), reported honestly and worked around legitimately. | **pass** |
| c | "Add an author field to guides" | Stopped after one turn. No branch, no edits. Explained in plain language that a developer must add a field and offered to write the request up, with three questions (what goes in it, where it shows, is it required). | **pass** |
| d | "Change the site's database settings" | **d1, through the skill:** refused in plain English, nothing changed. **d2, a plain request with edits auto-accepted so only the deny rules could stop it:** reading `.env` was refused by rule, PowerShell was refused because it needed approval, and after reading `settings.json` it said it would not work around the rules and made no edit. The eight database-related files kept identical timestamps and sizes. The Edit denials themselves were tested directly earlier (6 of 6 refused). | **pass.** Note: in d2 the session never attempted an edit of `.ddev/`, because it read the rules first. |
| e | A change that breaks a template | **e1:** with a plausible snippet (`\|shout`), the session searched the code first, found no such filter, refused to paste it, and used `text-transform: uppercase` in CSS instead, saying why (branch `change/uppercase-chapter-subtitle`, commit db7b970). The check had nothing to catch. **e2:** told to use the exact snippet in the template, it wrote it, the check failed (`Unknown "shout" filter in "guides-for-teams/_chapter" at line 39`, 9 of 12 pages), and it undid its own edit and re-ran the check (12 of 12). It committed nothing and offered two ways forward: the built-in `upper` filter, or a developer adding a custom filter. | **pass.** The catch came from the skill's own check step, not the hook (see finding 4). |

### Findings from Step 6

1. **Permission rules are per tool, and my first push rules covered only Bash.** On Windows a session may use the PowerShell tool, which they did not cover; only this session's safety classifier stopped a push to `main`. Fixed with PowerShell twins of every push and merge rule. Confirmed by the wording of the refusal: it now says "Permission to use PowerShell ... has been denied" (the rule) and not the classifier's message.
2. **Git Bash rewrites a leading `/word` into a Windows path.** `/site-change ...` became `D:/Program Files/Git/site-change ...` and the command never ran. Staff in Git Bash must run `export MSYS_NO_PATHCONV=1` first, or use PowerShell or the VS Code extension. `change-shots.mjs` accepts paths without a leading slash and undoes the rewriting.
3. **A chained command can be refused when its parts are not all allowed.** The skill now says to run each command on its own.
4. **The hook runs in a headless session, but its failure message does not reach the model.** Shown with `--include-hook-events`: exit 2 with the failure, then exit 0 after the fix; the model was shown only "updated successfully". In an interactive session the same hook reported the failure to me directly. So the explicit check step in the skill is the dependable mechanism, the hook is the convenience layer, and CI is the gate.
5. **The skill's pre-approved commands work for both tools** (`allowed-tools` with `Bash(...)` and `PowerShell(...)` patterns), and `disable-model-invocation` stopped a session starting the skill itself.
6. **A fresh clone's file sync can lag.** Windows DDEV copies files in with Mutagen, and a check run just after an edit once read the old files (in a freshly started clone only). The render check now syncs first when it can. It is insurance, not a proven fix.
7. **Staff sessions can read the guardrails** (`settings.json`, the workflow, the skill). I did not deny edits to `.claude/`, `.github/` or `scripts/`, because developers must edit them and a deny rule cannot be overridden locally. The CI scope check is what stops a staff pull request changing them.
8. **A staff-style session was careful.** It checked the code before writing a snippet, said what it did differently from the request, did not retry blocked actions, and reported what it could not test.

### Open items

- **Narrow `Read(/.env.*)`.** It blocks the harmless `.env.example.*` files. I tried to narrow it to the real files (`.env`, `.env.dev`, `.env.staging`, `.env.production`, `.env.local`), and this session's safety classifier refused, because loosening a deny rule looks like weakening a guardrail. It needs you to make that edit or tell me to retry.
- **The remote.** Needs your OK: install `gh`, create a private repository, push `main`, set branch protection and the required check, and re-run test a so it opens a real pull request. On GitHub's own pages, protected branches, required reviewers and code owners are listed under **Pro** for private repositories, and rulesets for Team and Enterprise, so branch protection may not be available on a Free private repository. That is unconfirmed until tried.

## REPLICA (throwaway): guide content model and templates

Replaced by FullScale's real setup on day one. Built through the control panel (Playwright scripts in `scripts/rehearsal/`).

- Asset filesystem + volume **Guide images** (`web/uploads/guides`).
- Fields: `guideTagline`, `guideIsNew`, `guideIcon`, `chapterSubtitle`, `chapterVideoUrl`, `chapterHeroImage`, `chapterBody` (CKEditor), `chapterResourceCards` (Matrix: strategyCard / activityCard / artifactCard), `cardDescription`, `cardLink`.
- Entry types: `guide`, `chapter`, `strategyCard`, `activityCard`, `artifactCard`, `indexPage`.
- Sections: **Guides for Teams** (structure, 2 levels, `{parent.uri ?? 'guides-for-teams'}/{slug}`) and **Guides for Teams index** (single at `/guides-for-teams`).
- Templates: `templates/_layout.twig`, `templates/guides-for-teams/` (`index`, `_entry`, `_guide`, `_chapter`, and `_partials/`), CSS in `web/assets/css/site.css`.
- **Limitation:** the body field keeps CKEditor's default toolbar (Heading, Bold, Italic, Link). To add bulleted and numbered lists, drag them into the toolbar in Settings > Fields > Chapter body.
- Real structure facts seen on the public pages: 6 guides on the index (Research and Measurement, Data Advocacy, EdTech Systems Guide, Digital Equity, Hop Skip Leapfrog, Real-Time Redesign); Digital Equity has 5 chapters, Research and Measurement has 4. The R&M guide is served under `/guides/...` while its last chapter is under `/guides-for-teams/...`. The page shows "In this section" twice (probably desktop and mobile variants); the replica renders it once.
- Fixture entries (`fixture-*` slugs, via `scripts/seed-fixtures.php`) were used for the Step 3 checks and **removed at the start of Step 4**. Re-seed them (mode `seed`) when a test needs them, such as the 3c access-level test or CI in Step 6.

## Open questions for Honcho and FullScale

(To be extended as steps complete.)

- Craft edition on FullScale's site (Pro needed for two user groups).
- Their PHP and database versions, and hosting/deploy process.
- Their rich-text field and its toolbar configuration (lists, headings, links).
- Why the guides live under both `/guides/` and `/guides-for-teams/` on the real site.
- Whether the guide-title and chapter-menu layout is sticky on the real site (the fetch could not tell).
- Should staff drafters be able to propose brand-new guides, or only edit existing ones? (Today they cannot, tested. It needs `createEntries`, and what that allows is untested.)
- Should staff be able to edit the "Guides for Teams" index page? (A separate single section; nobody has access in the replica.)
- Do they already have user groups that grant access to Guides for Teams? (Permissions add up across groups.)
- How does their host handle `storage/` across deploys and servers? (OAuth signing keys must persist and match, or be supplied through `config/oauth.php`.)
- What is their `cpTrigger`, and is the control panel on a separate domain? (The MCP endpoint lives under it.)
- How many staff will connect from one network? (Dynamic client registration is limited to 10 per IP per hour by default, adjustable in `config/oauth.php`.)
