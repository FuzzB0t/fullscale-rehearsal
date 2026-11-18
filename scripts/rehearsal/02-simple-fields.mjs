// Replica build 2/5: simple fields (THROWAWAY replica). Handles carry a guide/chapter/card prefix.
import { openCp, go, save, nameAndHandle, setSwitch } from './cp-lib.mjs';

// Usage: node 02-simple-fields.mjs [handleToSkip ...]   (skip fields that already exist)
const skip = new Set(process.argv.slice(2));

async function chooseType(page, label) {
  await page.locator('#type-button').click();
  await page.getByRole('option', { name: label, exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

const fields = [
  { name: 'Guide tagline',      handle: 'guideTagline',      type: 'Plain Text', instructions: 'One line shown under the guide title.' },
  { name: 'Guide NEW badge',    handle: 'guideIsNew',        type: 'Lightswitch', instructions: 'Show the NEW badge on the guides index.' },
  { name: 'Chapter subtitle',   handle: 'chapterSubtitle',   type: 'Plain Text', instructions: 'One line shown under the chapter title.' },
  { name: 'Chapter video URL',  handle: 'chapterVideoUrl',   type: 'Link' },
  { name: 'Card description',   handle: 'cardDescription',   type: 'Plain Text', multiline: true },
  { name: 'Card link',          handle: 'cardLink',          type: 'Link' },
];

const { browser, page } = await openCp({ height: 1400 });
try {
  for (const f of fields) {
    if (skip.has(f.handle)) { console.log(`skipped (exists): ${f.handle}`); continue; }
    await go(page, 'settings/fields/new');
    await nameAndHandle(page, f.name, f.handle);
    if (f.instructions) await page.locator('#instructions').fill(f.instructions);
    if (f.type !== 'Plain Text') await chooseType(page, f.type);
    if (f.multiline) await setSwitch(page.getByRole('switch', { name: 'Allow line breaks' }), true);
    await save(page, `field ${f.handle}`);
  }
} finally {
  await browser.close();
}
