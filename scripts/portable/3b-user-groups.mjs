// Portable change 3b: user groups "Content Drafters" and "Publishers".
//
// Creates both groups through the control panel (so they land in project config like a hand-made change).
// Permissions are scoped by UID and UIDs differ per site, so the section and volume UIDs are read from
// project config on disk (section "Guides for Teams", volume "Guide images"), never hard-coded.
//
// Usage: node scripts/portable/3b-user-groups.mjs
// Only a record of HOW the groups were built here. On the real site follow docs/apply/3b-user-groups.md.
import fs from 'node:fs';
import path from 'node:path';
import { openCp, go, save, root } from '../rehearsal/cp-lib.mjs';

// UIDs of the section and volume in THIS project (read from project config, never hard-coded).
const uidFromName = (f) => f.match(/--([0-9a-f-]{36})\.yaml$/)?.[1];
const sectionFile = fs.readdirSync(path.join(root, 'config', 'project', 'sections')).find((f) => f.startsWith('guidesForTeams--'));
const volumeFile = fs.readdirSync(path.join(root, 'config', 'project', 'volumes')).find((f) => f.startsWith('guideImages--'));
const S = uidFromName(sectionFile);
const V = uidFromName(volumeFile);
if (!S || !V) throw new Error(`Could not read section/volume UIDs (section=${S}, volume=${V})`);

const drafter = [
  'accessCp',
  `viewEntries:${S}`, `viewPeerEntries:${S}`,
  `viewAssets:${V}`, `saveAssets:${V}`, `viewPeerAssets:${V}`,
];
const publisher = [
  ...drafter,
  `createEntries:${S}`, `saveEntries:${S}`, `savePeerEntries:${S}`,
  `deleteEntries:${S}`, `deletePeerEntries:${S}`,
  `viewPeerEntryDrafts:${S}`, `savePeerEntryDrafts:${S}`, `deletePeerEntryDrafts:${S}`,
];

const groups = [
  { name: 'Content Drafters', handle: 'contentDrafters', permissions: drafter,
    description: 'Can view Guides for Teams entries and upload images. Drafts only: cannot save, publish or delete entries.' },
  { name: 'Publishers', handle: 'publishers', permissions: publisher,
    description: 'Everything Content Drafters can do, plus create, save, apply drafts and delete Guides for Teams entries.' },
];

const { browser, page } = await openCp({ height: 1400 });
try {
  for (const g of groups) {
    await go(page, 'settings/users/groups/new');
    await page.locator('#name').fill(g.name);
    await page.locator('#handle').fill(g.handle);
    await page.locator('#description').fill(g.description);
    // Tick parents before children: a child checkbox is disabled until its parent is ticked.
    for (const perm of g.permissions) {
      const box = page.locator(`input[type=checkbox][name="permissions[]"][value="${perm}"]`);
      if ((await box.count()) !== 1) throw new Error(`Permission checkbox not found (or ambiguous): ${perm}`);
      if (!(await box.isChecked())) await page.locator(`label[for="${await box.getAttribute('id')}"]`).click();
      if (!(await box.isChecked())) throw new Error(`Could not tick ${perm} (is its parent ticked?)`);
    }
    await save(page, `user group ${g.handle}`);
  }
} finally {
  await browser.close();
}
