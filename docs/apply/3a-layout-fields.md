# Apply guide 3a: layout fields (headline order, sticky menu, "In this section")

Branch: `portable/layout-fields`. Written for applying this to FullScale's real site, whose field handles and
templates will differ from the replica. Everything here is about the three fields and the template logic. The
replica's markup and CSS are stand-ins.

## What it does

Three fields on the **guide** entry. Editors set them per guide, and every chapter of that guide follows.

| Field (handle) | Type | Options and default | Effect on the chapter page |
|---|---|---|---|
| Headline layout (`layoutHeadline`) | Dropdown | **Guide title first** (`guideFirst`, default), Chapter title first (`chapterFirst`) | Default: guide title is the H1, chapter title the H2 (today's layout). Chapter first: chapter title is the H1 and sits above the guide block, and the guide title becomes a plain label. There is always exactly one H1. |
| Sticky chapter menu (`layoutStickyMenu`) | Lightswitch | default **off** | On: the chapter menu stays pinned to the top while scrolling. |
| Show 'In this section' (`layoutShowInSection`) | Lightswitch | default **on** | Off: the "In this section" list is hidden. |

Defaults reproduce today's page exactly. Proof in the replica: with the defaults, the three fixture pages are
tag-for-tag identical to before, and the screenshots are byte-identical (sha256 of `before-chapter-one.png` starts `e01c26ba`).

## What was added or changed (exact list)

| Kind | Path | Port to the real site? |
|---|---|---|
| Field | `config/project/fields/layoutHeadline--3c78df84-2f62-4010-813b-76974851bf5c.yaml` | Yes. New UID, safe to copy as is. |
| Field | `config/project/fields/layoutStickyMenu--41b7e098-218d-4e25-8aea-0b3d2cb654e5.yaml` | Yes, same. |
| Field | `config/project/fields/layoutShowInSection--91f003fa-5a55-4b58-9e3e-5bff808f44d4.yaml` | Yes, same. |
| Entry type layout | `config/project/entryTypes/guide--c280f3a1-80e9-4671-b0b7-e4e297a3d1d3.yaml` | **No. Do not copy.** Their guide entry type has its own UID and fields. Add the three fields to their layout instead (Method A). |
| Project config | `config/project/project.yaml`: 3 new lines under `meta.__names__`, new `dateModified` | **No. Never overwrite their file.** Craft regenerates `meta.__names__`. Expect a `dateModified` conflict (see Method B). |
| Template | `templates/guides-for-teams/_chapter.twig` | Pattern only. Read the top of this file: three `set` lines plus the conditions. |
| Template | `templates/guides-for-teams/_partials/guide-heading.twig` | Pattern only (heading tag and menu position). |
| CSS | `web/assets/css/site.css`: last block, 4 rules | Pattern only. Use their class names and design tokens. |
| Build record | `scripts/portable/3a-layout-fields.mjs` | Reference only. Shows exactly how the replica was built through the control panel. |

## Apply on the real site

Do this on their dev or staging copy with `allowAdminChanges` on, never on live (live has it off).

### Method A (recommended): recreate through the control panel (about 10 minutes)

1. **Settings > Fields > New field**, three times:
   - `Headline layout`, handle `layoutHeadline`, Dropdown. Options: label `Guide title first`, value `guideFirst`, tick **Default?**. Second option: label `Chapter title first`, value `chapterFirst`.
   - `Sticky chapter menu`, handle `layoutStickyMenu`, Lightswitch, default value **off**.
   - `Show 'In this section'`, handle `layoutShowInSection`, Lightswitch, default value **on**.
   - Instructions text is in the field YAML files above. Use plain ASCII quotes (curly quotes in YAML are a needless merge risk).
2. **Settings > Entry Types > (their guide type)**: add the three fields to its field layout and save.
3. Commit the resulting `config/project/` changes. Check the diff first: only the three field files, one entry type file, and a few lines in `project.yaml`.
4. Update the templates (below), then verify (below).

### Method B: merge project config files (only if Method A isn't possible)

1. Copy the three field YAML files into `config/project/fields/`. Then add three elements to their guide entry type's field layout (YAML), each with `type: craft\fieldlayoutelements\CustomField`, a `fieldUid` of the matching new field, and a **new** unique `uid` per element. Copy a neighbouring element as the model.
2. Add the three UID lines to `meta.__names__` in `project.yaml`, in the existing format. Do not replace the file.
3. If git reports a conflict on `dateModified`, run `ddev craft project-config/touch` (documented to resolve that conflict).
4. `ddev craft project-config/diff` to see what Craft will apply, then `ddev craft project-config/apply`. Both exist in Craft 5.12.1 (checked with `craft help`).

## Template pattern

Read the options once, near the top of the chapter template, from the guide that owns the chapter:

```twig
{% set guide = entry.parent ?? entry %}
{% set chapterFirst  = (guide.layoutHeadline.value|default('guideFirst')) == 'chapterFirst' %}
{% set stickyMenu    = (guide.layoutStickyMenu ?? false) ? true : false %}
{% set showInSection = (guide.layoutShowInSection ?? true) ? true : false %}
```

Then: render the chapter title as `h1` or `h2`, render the guide title as `h1` or a plain element, put the chapter title
block before or after the guide heading, wrap the "In this section" include in `{% if showInSection %}`, and add a modifier class to the menu when `stickyMenu` is true.

### Things that will bite on the real site

1. **A Dropdown's default is not applied to entries saved before the field existed.** The value is `null` (checked in the replica on a guide created before the fields). Lightswitch defaults *are* applied. So treat an empty headline value as `guideFirst`, as above. Without that, every existing guide would break the moment the template is deployed.
2. **Sticky only works if the menu lives inside a tall container.** A sticky element cannot leave its parent. The replica's menu sat inside a header only as tall as itself, so the partial now renders the menu after the header when sticky is on. If their menu is in a short wrapper, move it. If their site has a fixed top bar, set `top:` to its height.
3. **The one-H1 rule.** Chapter-first changes which element is the H1. Keep exactly one per page, and demote the guide title to a non-heading element.
4. **Where the fields live.** They are on the guide, and chapters read `entry.parent`. If their chapters are not child entries of the guide (for example a Matrix field or an Entries relation), change the lookup in the first line.
5. **Missing fields are safe.** `??` and `default` keep the template working on a guide type that doesn't have the fields yet (checked in dev with strict Twig). Deploying templates before project config does not error.
6. **Whitespace.** Twig `{% set %}` capture adds blank space to the HTML. Compare before and after with whitespace around tags normalised, plus screenshots. Raw byte comparison will show false differences.
7. **Merge hotspots in project config:** `project.yaml` (`dateModified`, `meta.__names__`) and the guide entry type file.
8. **Control-panel permissions.** Anyone who can edit a guide can change these three fields. With the Drafters group (step 3b) that stays a draft until a Publisher applies it.
9. **MCP: confirmed in Step 5.** The fields are ordinary custom fields on the guide. `elements_field_schema` lists `layoutHeadline` as `enum: guideFirst, chapterFirst`, so a dropdown takes the option **value**, not the label. A bad value is rejected with a message that names the allowed values. A drafter changed all three through a draft and the live pages did not change until a Publisher applied it (NOTES, cases 5 and 13).
10. **You cannot preview this change from the guide draft.** The layout only appears on chapter pages, and chapter pages read the *live* guide. Craft's Preview of a guide draft shows the guide page, which does not change. Tell staff a Publisher checks the chapter pages after applying. Rolling back is clean (`revisions_apply` on the older revision; Step 5 case 13). If staff need a preview, add a small preview-only banner to the guide page that lists the pending settings.

## Verify (about 15 minutes)

1. **Before** applying: save the rendered HTML (`curl --ssl-no-revoke -s <url> -o before.html`, the flag only matters on the local mkcert site) and a screenshot of three real pages: a guide, a middle chapter, the last chapter. `node scripts/shot.mjs <url> out.png --width=1200`.
2. Apply fields and templates. **After**: repeat. With defaults, HTML must match after whitespace normalisation and screenshots must match exactly.
3. Run the 8-combination check. On one guide, set each combination of the three options in the control panel and confirm in the HTML: exactly one `<h1>`; the chapter-first class only when chapter first; the sticky class only when sticky; the "In this section" nav only when shown. The replica run was 8 of 8.
4. Confirm sticky in a real browser (scroll the page; the menu's top edge stays at 0). Replica: menu top 350px unscrolled, 0px after scrolling 400px.
5. Open an old guide that was never re-saved: it must look exactly as before.
6. Leave the guide with the explicit defaults. Output must again match step 1.

## Roll back

Revert the template and CSS commit. The fields can stay: unused fields change nothing on the page. To remove them, take them out of the guide entry type layout and delete the fields in dev, then deploy the project config.

## Evidence in the replica

Screenshots in `docs/screenshots/3a/`: `before-*.png` (default pages, byte-identical to after), `cp-guide-edit-layout-fields.png` (what the editor sees), `after-options-chapter-one.png` (chapter first, sticky, no "In this section"), `after-options-sticky-scrolled.png` (menu pinned after scrolling).
