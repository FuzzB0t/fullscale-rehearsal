// Replica build 3/5: CKEditor body field (THROWAWAY replica), default toolbar.
//
// Known limitation: the field's toolbar designer is drag-and-drop, and synthetic mouse drags
// (three attempts, different grab/drop points) were not picked up by Craft's drag library.
// Rather than work around the control panel, the field keeps CKEditor's default toolbar
// (Heading, Bold, Italic, Link). Bulleted/numbered lists can be added by hand in
// Settings > Fields > Chapter body (drag them into the editor toolbar).
import { openCp, go, save, nameAndHandle } from './cp-lib.mjs';

const { browser, page } = await openCp({ height: 1400 });
try {
  await go(page, 'settings/fields/new');
  await nameAndHandle(page, 'Chapter body', 'chapterBody');
  await page.locator('#type-button').click();
  await page.getByRole('option', { name: 'CKEditor', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await save(page, 'field chapterBody');
} finally {
  await browser.close();
}
