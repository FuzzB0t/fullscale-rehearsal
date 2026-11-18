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
