// Replica build 5/7: entry types (THROWAWAY replica).
// Usage: node 05-entry-types.mjs [handleToSkip ...]
// The chapter type gets chapterResourceCards later (06-matrix-and-chapter.mjs), once that field exists.
import { openCp, go, save, nameAndHandle } from './cp-lib.mjs';

const skip = new Set(process.argv.slice(2));
const types = [
  { name: 'Guide',             handle: 'guide',        fields: ['guideTagline', 'guideIcon', 'guideIsNew'] },
  { name: 'Chapter',           handle: 'chapter',      fields: ['chapterSubtitle', 'chapterVideoUrl', 'chapterHeroImage', 'chapterBody'] },
  { name: 'Strategy card',     handle: 'strategyCard', fields: ['cardDescription', 'cardLink'] },
  { name: 'Activity card',     handle: 'activityCard', fields: ['cardDescription', 'cardLink'] },
  { name: 'Artifact card',     handle: 'artifactCard', fields: ['cardDescription', 'cardLink'] },
];

// The field picker stays open after each click, so open it once, click every field, then close it.
export async function addFieldsToLayout(page, handles) {
  await page.locator('.fld-tab button:text-is("Add")').first().click();
  await page.waitForTimeout(500);
  for (const handle of handles) {
    await page.getByText(handle, { exact: true }).first().click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1].endsWith('05-entry-types.mjs')) {
  const { browser, page } = await openCp({ height: 1300 });
  try {
    for (const t of types) {
      if (skip.has(t.handle)) { console.log(`skipped (exists): ${t.handle}`); continue; }
      await go(page, 'settings/entry-types/new');
      await nameAndHandle(page, t.name, t.handle);
      await addFieldsToLayout(page, t.fields);
      await save(page, `entry type ${t.handle}`);
    }
  } finally {
    await browser.close();
  }
}
