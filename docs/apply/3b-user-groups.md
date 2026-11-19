# Apply guide 3b: user groups (Content Drafters and Publishers)

Branch: `portable/user-groups`. Written for applying this to FullScale's real site.
**The group files cannot be copied there as they are** (reason below). Recreate the groups in the control panel, or copy the YAML after swapping in their UIDs.

## What it does

Two groups. Staff in **Content Drafters** can read the guides and propose edits as drafts, and nothing they do goes live. Staff in **Publishers** can review and publish.

| | Content Drafters (`contentDrafters`) | Publishers (`publishers`) |
|---|---|---|
| Sign in to the control panel | yes | yes |
| View Guides for Teams entries (their own and other people's) | yes | yes |
| Create a draft of an existing entry | yes | yes |
| Edit their own drafts | yes | yes |
| See and edit other people's drafts | no | yes |
| Apply a draft (make it live) and edit live entries | **no** | yes |
| Create new guides | no | yes |
| Delete entries and drafts | only their own drafts | yes |
| View assets in Guide images (own and others') | yes | yes |
| Upload assets to Guide images | yes | yes |
| Delete assets, create folders, change other people's files | no | no |
| Settings, users, plugins, utilities, the Guides for Teams index page | no | no |

Craft has no group inheritance, so **Publishers lists every permission itself** (it is not "Drafters plus"). Putting a user in both groups also works, because permissions add up.

### The exact permissions

`S` is the Guides for Teams section's UID and `V` is the Guide images volume's UID, both different on every site.

| Permission (as Craft stores it) | Control panel label | Drafters | Publishers |
|---|---|:-:|:-:|
| `accessCp` | Access the control panel | x | x |
| `viewEntries:S` | View entries | x | x |
| `viewPeerEntries:S` | View other users' entries | x | x |
| `viewAssets:V` | View assets | x | x |
| `viewPeerAssets:V` | View assets uploaded by other users | x | x |
| `saveAssets:V` | Save assets (this is "upload") | x | x |
| `createEntries:S` | Create entries | | x |
| `saveEntries:S` | Save entries | | x |
| `savePeerEntries:S` | Save other users' entries | | x |
| `deleteEntries:S` | Delete entries | | x |
| `deletePeerEntries:S` | Delete other users' entries | | x |
| `viewPeerEntryDrafts:S` | View other users' drafts | | x |
| `savePeerEntryDrafts:S` | Save other users' drafts | | x |
| `deletePeerEntryDrafts:S` | Delete other users' drafts | | x |

Craft saves them lower-cased in project config (`viewentries:<uid>`). It reads them case-insensitively.

**Why each choice** (all read from Craft's source, `src/elements/Entry.php` and `src/mcp/Authorization.php`, and confirmed by the test below):

- `accessCp` is required. Craft's default MCP endpoint (`/admin/mcp`) lives inside the control panel, and Craft's MCP settings page says only users with control panel access can use it. The `elements_schema` tool and the element-type resources also check it explicitly. Craft's own contributor notes add that it gives basic read-only access to element pickers across the site. With no other permissions the sidebar shows only Dashboard, Entries and Assets. Over the real MCP connection a drafter was able to sign in and work (see the 3c guide).
- Drafting needs only *view*. Craft lets anyone who can view an entry create a draft of it. Drafters never get `saveEntries`, so they cannot change a live entry and cannot apply a draft.
- `viewPeerEntries` is needed because the guides were created by other people. Without it a drafter sees none of them.
- A drafter has no `viewPeerEntryDrafts`, so drafters cannot see each other's drafts. A publisher has it, which is what lets them find and apply a drafter's work.
- Applying a draft takes two checks in Craft: `save` on the draft (publishers have `savePeerEntryDrafts`) and `saveCanonical` on the live entry (`saveEntries` + `savePeerEntries`). Publishers have both.
- Left out on purpose: `changeAuthorForPeerEntries`, any asset delete or folder permission, the "Guides for Teams index" single section, and anything admin-only.

## What was added or changed (exact list)

| Kind | Path | Port to the real site? |
|---|---|---|
| Group | `config/project/users/groups/contentDrafters--337ac640-32d7-499d-ba20-c46c7555fa3b.yaml` | **No, not as is.** Its permissions contain this site's section and volume UIDs. |
| Group | `config/project/users/groups/publishers--a8b8a506-d14e-408d-96fd-a6eedb6a7541.yaml` | **No, not as is.** Same reason. |
| Project config | `config/project/users/users.yaml` | **NEVER copy.** It holds site-wide settings (`requireEmailVerification`, `allowPublicRegistration`, `require2fa`, `defaultGroup`). Copying it would silently change how their users sign up. |
| Project config | `config/project/project.yaml`: the `users:` block disappeared from here (Craft moved it into `users/users.yaml` when the first group was saved), plus two `meta.__names__` lines and a new `dateModified` | **No. Never overwrite their file.** If their `project.yaml` still has a `users:` block, expect Craft to move it. Review that diff. |
| Build record | `scripts/portable/3b-user-groups.mjs` | Reference only. |
| Test | `scripts/portable/3b-permission-matrix.php` | Reuse. Change the entry slugs and test usernames. |

Test users are content, not project config, so they are not in git. Here they are `maya.okafor` (drafter) and `daniel.reyes` (publisher), fake addresses, passwords in `.local/credentials.txt`. On the real site people are invited by email.

## Apply on the real site

Do this on their dev or staging copy with `allowAdminChanges` on, never on live.

**Check the edition first.** Pro is needed for two groups (NOTES difference 1).

### Method A (recommended): recreate in the control panel (about 10 minutes)

1. **Settings > Users > User Groups > New group**. Name `Content Drafters`, handle `contentDrafters`, description from the YAML.
2. Tick the permissions in the table above. **Tick a parent before its children** (a child checkbox stays disabled until its parent is ticked). Save. The `accessCp` box is at the top; the section permissions are under "Guides for Teams" (their section may have a different name); asset permissions under their volume.
3. Repeat for `Publishers`.
4. Commit the resulting `config/project/` changes. Review the diff: two group files, `users/users.yaml` if it is new or changed, and a few lines in `project.yaml`. **Revert any change to `users/users.yaml` that you did not intend.**

### Method B: copy the YAML with their UIDs

1. Find their UIDs in the file names: `config/project/sections/<handle>--<UID>.yaml` and `config/project/volumes/<handle>--<UID>.yaml`.
2. Copy the two group YAML files. Replace every `3884b563-a7ad-4efb-bd11-bbd74f9d420b` with their section UID and every `3aa2d703-7281-4ffd-9a8d-a328b15f832f` with their volume UID. The group's own UID (in the file name) can stay.
3. Add the two group UIDs to `meta.__names__` in `project.yaml`. Do not replace the file. If git reports a `dateModified` conflict, run `ddev craft project-config/touch`.
4. `ddev craft project-config/diff`, then `ddev craft project-config/apply`.
5. **Do not copy `users/users.yaml`.**

## Verify (about 10 minutes)

1. **Test in the control panel first.** Create two throwaway users, one in each group (`ddev craft users/create --username=... --email=... --password=... --groups=contentDrafters`, checked with `craft help users/create`). Use fake addresses. Delete them afterwards.
2. Run `scripts/portable/3b-permission-matrix.php` (see its header for the command). It asks Craft the same questions its MCP server asks (`craft\mcp\Authorization::allows`) about a real entry, real drafts created through Craft's drafts service, and the asset folder, and prints 54 yes/no results against what each group should allow. Replica result: **54 of 54**. It removes its own drafts.
3. Sign in as each user and look. Replica result:
   - Drafter: sidebar is Dashboard, Entries, Assets. The live guide shows only **Preview, View, Create a draft**. Every field says Read Only. No "New entry" button.
   - Publisher: same, plus **Save** and a **New entry** button.
4. Check an existing site-wide setting did not change: compare `users/users.yaml` against their original.

## Things that will bite on the real site

1. **UIDs** (above). The single biggest reason this is a recreate, not a copy.
2. **`users/users.yaml`.** Creating the first group made Craft write this file. Never overwrite their copy.
3. **Existing groups.** If they already have groups that grant Guides for Teams permissions (an "Editors" group, say), a user in both gets the sum. Check before putting people in a group.
4. **Authors.** The replica's guides were authored by an admin. If their guides have no author or other authors, `viewPeerEntries` is what makes them visible. Keep it.
5. **New guides.** Drafters cannot create new guides, **tested over MCP**: both a live `elements_create` and one with `asUnpublishedDraft` were refused with "You are not authorized to save this entry." (a drafter has no `createEntries`). A draft is otherwise a copy of an existing entry. Whether to let drafters propose new guides is a policy choice, so ask FullScale. If yes, grant `createEntries` to Drafters and test what a user who can create but not save can then do, because that was not tested.
6. **The index page.** The "Guides for Teams index" single section is not granted to anyone. Add it per group if staff should edit that page.
7. **MCP refusals are worded inconsistently, and some read like "not found".** Confirmed over HTTP with the drafter at "Read and write": applying their own draft answers "Draft not found.", deleting the live guide answers "Entry not found.", and changing the live guide answers "You are not authorized to save this entry." Staff will see these, so the staff instructions should say what they mean (see the 3c guide).
8. **The matrix tests Craft's permission logic.** The same rules were then confirmed end to end over HTTP with OAuth as the real drafter (3c: drafter creates and edits a draft, cannot apply it, cannot change or delete the live entry). The recorded Step 5 cases repeat this through Claude Code.

## Roll back

Delete the two groups in the control panel (users in them lose the permissions), and commit the config change. Take care with `users/users.yaml`.

## Evidence in the replica

`docs/screenshots/3b/cp-drafter-guide.png` and `cp-publisher-guide.png`. The 54-row result is below.

### Matrix result (replica, Craft 5.12.1)

| What it checks | Drafter | Publisher |
|---|---|---|
| access the control panel | yes | yes |
| view the live guide | yes | yes |
| view a live chapter | yes | yes |
| save (change live) the live guide | no | yes |
| save (change live) a live chapter | no | yes |
| delete the live guide | no | yes |
| create a new guide entry | no | yes |
| duplicate the live guide | no | yes |
| create a draft of the live guide | yes | yes |
| view own draft | yes | yes |
| save own draft | yes | yes |
| delete own draft | yes | yes |
| apply own draft (save + saveCanonical) | no | yes |
| view someone else's draft | no | yes |
| save someone else's draft | no | yes |
| delete someone else's draft | no | yes |
| apply someone else's draft (save + saveCanonical) | no | yes |
| view the Guide images folder | yes | yes |
| upload an asset to Guide images | yes | yes |
| create a sub-folder | no | no |
| delete a folder | no | no |
| delete assets | no | no |
| save assets uploaded by others | no | no |
| assign user permissions (admin-type power) | no | no |
| view the user list | no | no |
| edit the Guides for Teams index (single section) | no | no |
| is an admin | no | no |
