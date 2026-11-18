// Portable change 3a: layout fields on the guide entry type.
//
// Creates three fields through the control panel (so they land in project config exactly like a
// hand-made change) and adds them to the "guide" entry type's layout:
//
//   layoutHeadline       Dropdown     Guide title first (default) | Chapter title first
//   layoutStickyMenu     Lightswitch  default OFF  (the chapter menu scrolls away, as it does today)
//   layoutShowInSection  Lightswitch  default ON   ("In this section" is shown, as it does today)
//
// Usage: node scripts/portable/3a-layout-fields.mjs [handleToSkip ...]   (skip fields that already exist)
// This script is only a record of HOW the change was made here. On the real site the same fields are
// created by hand or by merging project config, see docs/apply/3a-layout-fields.md.
import { openCp, go, save, nameAndHandle, setSwitch, addFieldsToLayout } from '../rehearsal/cp-lib.mjs';

const skip = new Set(process.argv.slice(2));
const { browser, page } = await openCp({ height: 1400 });

try {
  // 1. Headline layout (Dropdown)
  if (!skip.has('layoutHeadline')) {
    await go(page, 'settings/fields/new');
    await nameAndHandle(page, 'Headline layout', 'layoutHeadline');
    await page.locator('#instructions').fill("Which title leads on this guide's chapter pages: the guide title (as today) or the chapter title.");
    await page.locator('#type-button').click();
    await page.getByRole('option', { name: 'Dropdown', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    const opt = (i, part) => page.locator(`textarea[name="types[craft-fields-Dropdown][options][${i}][${part}]"]`);
    await opt(0, 'label').fill('Guide title first');
    await opt(0, 'value').fill('guideFirst');
    // Craft draws the checkbox as a <label> on top of the input, so click the label like a person would.
    const defaultBox = page.locator('input[type=checkbox][name="types[craft-fields-Dropdown][options][0][default]"]');
    await page.locator(`label[for="${await defaultBox.getAttribute('id')}"]`).click();
    if (!(await defaultBox.isChecked())) throw new Error('Could not tick the default option');
    await page.getByRole('button', { name: 'Add an option' }).click();
    await page.waitForTimeout(500);
    await opt(1, 'label').fill('Chapter title first');
    await opt(1, 'value').fill('chapterFirst');
    await save(page, 'field layoutHeadline');
  }

  // 2. Lightswitches
  const switches = [
    { name: 'Sticky chapter menu', handle: 'layoutStickyMenu', on: false,
      instructions: 'Keep the chapter menu pinned to the top of the screen while readers scroll.' },
    { name: "Show 'In this section'", handle: 'layoutShowInSection', on: true,
      instructions: 'Show the "In this section" list of links at the top of each chapter page.' },
  ];
  for (const f of switches) {
    if (skip.has(f.handle)) { console.log(`skipped (exists): ${f.handle}`); continue; }
    await go(page, 'settings/fields/new');
    await nameAndHandle(page, f.name, f.handle);
    await page.locator('#instructions').fill(f.instructions);
    await page.locator('#type-button').click();
    await page.getByRole('option', { name: 'Lightswitch', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await setSwitch(page.locator('#types-craft-fields-Lightswitch-default'), f.on);
    await save(page, `field ${f.handle}`);
  }

  // 3. Add all three to the Guide entry type layout
  await go(page, 'settings/entry-types');
  await page.getByRole('link', { name: 'Guide', exact: true }).first().click();
  await page.waitForLoadState('networkidle');
  await addFieldsToLayout(page, ['layoutHeadline', 'layoutStickyMenu', 'layoutShowInSection']);
  await save(page, 'entry type guide (+ layout fields)');
} finally {
  await browser.close();
}
