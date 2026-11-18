// Replica build 6/7: "Resource cards" Matrix field (3 card entry types), then add it to the Chapter layout.
// (THROWAWAY replica)
import { openCp, go, save, nameAndHandle, addFieldsToLayout } from './cp-lib.mjs';

const { browser, page } = await openCp({ height: 1400 });
try {
  // 1. The Matrix field
  await go(page, 'settings/fields/new');
  await nameAndHandle(page, 'Resource cards', 'chapterResourceCards');
  await page.locator('#type-button').click();
  await page.getByRole('option', { name: 'Matrix', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  for (const handle of ['strategyCard', 'activityCard', 'artifactCard']) {  // menu items read 'Name handle', so match on the handle
    await page.getByRole('button', { name: 'Choose' }).first().click();
    await page.waitForTimeout(500);
    await page.locator(".menu--disclosure:visible").getByText(handle, { exact: true }).click();
    await page.waitForTimeout(700);
  }
  await page.locator('#types-craft-fields-Matrix-create-button-label').fill('Add a resource card');
  await save(page, 'field chapterResourceCards');

  // 2. Add it to the Chapter entry type layout
  await go(page, 'settings/entry-types');
  await page.getByRole('link', { name: 'Chapter', exact: true }).first().click();
  await page.waitForLoadState('networkidle');
  await addFieldsToLayout(page, ['chapterResourceCards']);
  await save(page, 'entry type chapter (+ resource cards)');
} finally {
  await browser.close();
}
