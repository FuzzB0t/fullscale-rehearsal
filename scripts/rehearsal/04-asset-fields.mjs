// Replica build 4/5: single-image asset fields (THROWAWAY replica).
import { openCp, go, save, nameAndHandle } from './cp-lib.mjs';

const fields = [
  { name: 'Guide icon',         handle: 'guideIcon',         instructions: 'Small illustration shown with the guide title.' },
  { name: 'Chapter hero image', handle: 'chapterHeroImage',  instructions: 'Shown at the top of the chapter when there is no video.' },
];

const { browser, page } = await openCp({ height: 1600 });
try {
  for (const f of fields) {
    await go(page, 'settings/fields/new');
    await nameAndHandle(page, f.name, f.handle);
    await page.locator('#instructions').fill(f.instructions);
    await page.locator('#type-button').click();
    await page.getByRole('option', { name: 'Assets', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.locator('#types-craft-fields-Assets-max-relations').fill('1');
    await save(page, `field ${f.handle}`);
  }
} finally {
  await browser.close();
}
