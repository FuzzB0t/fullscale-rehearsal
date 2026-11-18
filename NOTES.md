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
| Start | `ddev start` (site: https://fullscale-rehearsal.ddev.site, CP: `/admin`) |
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

## Gotchas learned

- **Mutagen lag.** Craft writes project config inside the container and Mutagen syncs it to Windows a few seconds later. Run `ddev mutagen sync` before reading `config/project/` from Windows.
- **`ddev composer create-project --help` actually runs the command.** It stopped at a pre-check here; don't use `--help` on it.
- **PowerShell 5.1 and quotes.** It strips double quotes when passing arguments to native programs. Put PHP in single quotes when calling `ddev craft exec`, or call it from Git Bash.
- **PowerShell 5.1 and BOMs.** `Set-Content -Encoding utf8` adds a byte-order mark. Use the editor tools or Git Bash for files that git or YAML will read.
- **Craft ships agent skills in `vendor/craftcms/cms/.agents/skills/`** (`translations`, `twig-upgrade`). Not for staff; review in Step 6.
- **Control-panel automation.** The CKEditor toolbar designer is drag-and-drop and could not be driven by synthetic mouse events (three attempts). Everything else (fields, entry types, Matrix, sections) works through Playwright.

## REPLICA (throwaway): guide content model and templates

Replaced by FullScale's real setup on day one. Built through the control panel (Playwright scripts in `scripts/rehearsal/`).

- Asset filesystem + volume **Guide images** (`web/uploads/guides`).
- Fields: `guideTagline`, `guideIsNew`, `guideIcon`, `chapterSubtitle`, `chapterVideoUrl`, `chapterHeroImage`, `chapterBody` (CKEditor), `chapterResourceCards` (Matrix: strategyCard / activityCard / artifactCard), `cardDescription`, `cardLink`.
- Entry types: `guide`, `chapter`, `strategyCard`, `activityCard`, `artifactCard`, `indexPage`.
- Sections: **Guides for Teams** (structure, 2 levels, `{parent.uri ?? 'guides-for-teams'}/{slug}`) and **Guides for Teams index** (single at `/guides-for-teams`).
- Templates: `templates/_layout.twig`, `templates/guides-for-teams/` (`index`, `_entry`, `_guide`, `_chapter`, and `_partials/`), CSS in `web/assets/css/site.css`.
- **Limitation:** the body field keeps CKEditor's default toolbar (Heading, Bold, Italic, Link). To add bulleted and numbered lists, drag them into the toolbar in Settings > Fields > Chapter body.
- Real structure facts seen on the public pages: 6 guides on the index (Research and Measurement, Data Advocacy, EdTech Systems Guide, Digital Equity, Hop Skip Leapfrog, Real-Time Redesign); Digital Equity has 5 chapters, Research and Measurement has 4. The R&M guide is served under `/guides/...` while its last chapter is under `/guides-for-teams/...`. The page shows "In this section" twice (probably desktop and mobile variants); the replica renders it once.
- Fixture entries (`fixture-*` slugs, via `scripts/seed-fixtures.php`) exist for template checks and are deleted before Step 4.

## Open questions for Honcho and FullScale

(To be extended as steps complete.)

- Craft edition on FullScale's site (Pro needed for two user groups).
- Their PHP and database versions, and hosting/deploy process.
- Their rich-text field and its toolbar configuration (lists, headings, links).
- Why the guides live under both `/guides/` and `/guides-for-teams/` on the real site.
- Whether the guide-title and chapter-menu layout is sticky on the real site (the fetch could not tell).
