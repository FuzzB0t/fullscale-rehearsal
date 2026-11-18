// Replica build 7/7: sections (THROWAWAY replica).
//   "Guides for Teams"        Structure, 2 levels: guides on top, chapters beneath
//   "Guides for Teams index"  Single at /guides-for-teams (title-only "Index page" entry type)
import { openCp, go, save, nameAndHandle } from './cp-lib.mjs';

async function chooseEntryTypes(page, handles) {
  for (const handle of handles) {
    await page.getByRole('button', { name: 'Choose' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('.menu--disclosure:visible').getByText(handle, { exact: true }).click();
    await page.waitForTimeout(700);
  }
}

// Usage: node 07-sections.mjs [--only-index]   (skip the entry type + structure section if they already exist)
const onlyIndex = process.argv.includes('--only-index');
const { browser, page } = await openCp({ height: 1400 });
try {
  if (!onlyIndex) {
  // Title-only entry type for the index single
  await go(page, 'settings/entry-types/new');
  await nameAndHandle(page, 'Index page', 'indexPage');
  await save(page, 'entry type indexPage');

  // Structure section
  await go(page, 'settings/sections/new');
  await nameAndHandle(page, 'Guides for Teams', 'guidesForTeams');
  await page.locator('select[name=type]').selectOption({ label: 'Structure' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await chooseEntryTypes(page, ['guide', 'chapter']);
  await page.locator('textarea[name="sites[default][uriFormat]"]').fill("{parent.uri ?? 'guides-for-teams'}/{slug}");
  await page.locator('input[name="sites[default][template]"]').fill('guides-for-teams/_entry');
  await page.keyboard.press('Escape');
  await page.locator('#maxLevels').fill('2');
  await save(page, 'section guidesForTeams');
  }

  // Index single
  await go(page, 'settings/sections/new');
  await nameAndHandle(page, 'Guides for Teams index', 'guidesForTeamsIndex');
  await page.locator('select[name=type]').selectOption({ label: 'Single' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await chooseEntryTypes(page, ['indexPage']);
  await page.locator('textarea[name="sites[default][singleUri]"]').fill('guides-for-teams');  // Singles use singleUri, not uriFormat
  await page.locator('input[name="sites[default][template]"]').fill('guides-for-teams/index');
  await page.keyboard.press('Escape');
  await save(page, 'section guidesForTeamsIndex');
} finally {
  await browser.close();
}
