# Time log

Feeds `docs/day-one-runbook.md`. "Active" is time spent running or fixing things.
"Waiting" is time blocked on a person (installs needing admin rights, approvals).
Active figures are rough: measured command times plus diagnosis time.

| Step | Started | Active | Waiting on you | Notes |
|---|---|---|---|---|
| 1. Environment | 2026-11-18 09:38 | ~35 min | most of the 09:38 to 13:30 span | Docker Desktop, WSL2, DDEV and the mkcert CA were installed by you between my steps. |

## Step 1 detail (active time)

| Task | Time | Day-one relevance |
|---|---|---|
| Docker + WSL2 + DDEV + mkcert install | (user, ~10 min, not measured) | None. FullScale's host handles this. |
| `ddev config` + first `ddev start` (image pulls) | 3.1 min | Local only. |
| Work out why `ddev craft` was missing (Git on D:) | ~10 min | Local only. Fixed with a junction, see NOTES.md. |
| `composer create-project craftcms/craft:^5` via temp dir + copy | ~1 min | Local only. FullScale already has a site. |
| `ddev craft install/craft` | 0.4 min | Local only. |
| `composer require` Craft ~5.12.1 + CKEditor, `plugin/install ckeditor` | ~1 min | **Applies on day one** (CKEditor may already be installed there). |
| Environment files + `scripts/use-env.ps1`, verified with `craft exec` | ~8 min | Production already has its own env settings. |
| Playwright + Chromium (743 MB) + screenshot script | ~6 min | Reusable on day one. |
| Pro edition trial through the control panel | ~3 min | **Check FullScale's edition**: Team allows one user group, Pro is needed for two. |

## Step 2: Replica content model

| Task | Time | Day-one relevance |
|---|---|---|
| Read three public pages (sub-agent, structure only) | ~1 min | None (replica). |
| Control-panel automation scaffolding (login helper, probes, form selectors) | ~25 min | Reusable for Step 3's control-panel changes. |
| Filesystem, volume, 9 fields, 6 entry types, Matrix, 2 sections | ~20 min | None (replica). Real model is imported/inspected on day one. |
| CKEditor toolbar drag attempts (3, abandoned) | ~10 min | Lists must be added by hand in the control panel. |
| Templates, CSS, fixture seeder, render checks | ~20 min | Template structure is reusable; fixture seeder is reused by CI in Step 6. |
| **Step 2 total (active)** | **~75 min** | Started 2026-11-18 ~13:45, finished 14:20. |

## Step 3: Portable changes

Times from the machine clock (start of the step to its last file edit), so they include waiting for page loads and scripted runs.
The per-task split is approximate.

| Task | Time | Day-one relevance |
|---|---|---|
| **3a** before captures (HTML + screenshots) | ~2 min | Repeat on their real pages before touching anything. |
| **3a** three fields + entry type layout through the control panel (scripted, plus a curly-quote fix) | ~4 min | **Applies on day one**, about 10 min by hand (Method A in the apply guide). |
| **3a** templates and CSS | ~3 min | Pattern only. Their markup differs, so allow longer. |
| **3a** verification: default identity, 8-combination matrix, sticky scroll check, old-entry and field-less check | ~5 min | **Applies on day one**, about 15 min by hand. |
| **3a** apply guide + NOTES | ~1 min of the clock, written alongside | |
| **3a total** | **~15 min** | 2026-11-18, 16:13 to 16:28. |

| Task | Time | Day-one relevance |
|---|---|---|
| **3b** read Craft's permission code, probe the group form | ~2 min | Reusable: the permission table in the apply guide saves this on day one. |
| **3b** both groups through the control panel (scripted) | ~1 min | **Applies on day one**, about 10 min by hand (Method A). |
| **3b** two test users, 54-check permission matrix, sign-in checks in the control panel | ~2 min | **Applies on day one**, about 10 min. |
| **3b** apply guide + NOTES | ~1 min | |
| **3b total** | **~6 min** | 2026-11-18, 16:51 to 16:56 (machine clock). |

| Task | Time | Day-one relevance |
|---|---|---|
| **3c** read Craft's MCP, OAuth and settings code; OAuth keys; .gitignore fix | ~3 min | Reusable: the guide holds the answers. The `.gitignore` fix is **day-one critical**. |
| **3c** MCP settings through the control panel | ~1 min | **Applies on day one**, about 5 min by hand. |
| **3c** OAuth + MCP test harness, access-level test at two levels, reconnect check (including one debugging detour: consent is remembered) | ~6 min | **Applies on day one**, about 15 min; the harness is reusable in Step 5. |
| **3c** apply guide + NOTES | ~3 min | |
| **3c total** | **~13 min** | 2026-11-18, 16:57 to 17:04 (machine clock). |
| **Step 3 total (3a + 3b + 3c)** | **~34 min** | Replica numbers; day one is quicker for fields, groups and settings and slower for templates. |

## Step 4: Sample content and users

Times from the machine clock. The users were created in Step 3b and reused here.

| Task | Time | Day-one relevance |
|---|---|---|
| Restart after the overnight shutdown (Docker Desktop, DDEV drive-letter case) | ~3 min | Local only. |
| Remove fixtures; move the sign-in into the shared OAuth helper; ask the server for its create and field schemas | ~5 min | The schema calls are worth repeating on day one before writing content. |
| Write the content script; create 2 guides and 9 chapters over MCP (22 calls); prove the re-run is safe | ~4 min | **Applies on day one** if sample guides are wanted on staging; real content comes from FullScale. |
| Verify in Craft (structure, authors, cards) and over HTTP (12 pages); drafter new-guide test; docs | ~3 min | |
| **Step 4 total** | **~15 min** | 2026-11-19, 14:25 to 14:32 (machine clock). |

## Step 5: MCP rehearsal (preparation)

| Task | Time | Day-one relevance |
|---|---|---|
| Switch to production mode; smoke-test pages, settings, MCP and publisher access there (sessions had to be re-created after the switch) | ~3 min | Production behaves as dev for all of this. |
| Connect the real Claude Code client: found the endpoint URL problem (`/admin/mcp` rejected, `/admin/mcp/auth` accepted) and that it needs no CA variable | ~8 min | **Applies on day one**: give staff the `/auth` URL. Saves a support round. |
| Hand-off file for the session that runs the 15 cases | ~3 min | |
| **Preparation so far** | **~14 min** | 2026-11-19, ~14:36 to 14:37 (machine clock). The 15 cases themselves are not run yet. |

## Step 5: MCP rehearsal (run)

Times are the machine clock, taken from commit timestamps where possible. Overnight and weekend gaps, and the time spent waiting for you to sign in, are not counted.

| Task | Time | Day-one relevance |
|---|---|---|
| Cases 1 to 12 and 15 as the drafter (2026-11-20, 14:10 to 14:23) | ~13 min | **Applies on day one**: the same cases against their staging site, about 30 to 45 min with sign-ins. |
| Site down after the weekend: diagnose, rebuild and test `scripts/start-site.ps1` (2026-11-23, ended 09:34) | ~20 min (estimate; the start was not clocked) | Local only. |
| Case 13 as the publisher (09:34 to 09:41) | ~7 min | **Applies on day one.** |
| Case 14 as the admin, production-mode checks, decisions and documentation (09:41 to about 09:50) | ~9 min | **Applies on day one.** |
| **Step 5 active total (with the ~14 min of preparation above)** | **~63 min** | Replica numbers. |
