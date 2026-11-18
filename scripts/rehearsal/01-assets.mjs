// Replica build 1/5: filesystem + asset volume for guide images. (THROWAWAY replica)
import { openCp, go, save, nameAndHandle, setSwitch } from './cp-lib.mjs';

const { browser, page } = await openCp();
try {
  // Filesystem: local folder under web/uploads/guides
  await go(page, 'settings/filesystems/new');
  await nameAndHandle(page, 'Guide images', 'guideImages');
  await setSwitch(page.locator('#types-craft-fs-Local-has-urls'), true);
  await page.waitForTimeout(500);
  await page.locator('#types-craft-fs-Local-path').fill('@webroot/uploads/guides');
  await page.locator('input[name="types[craft-fs-Local][url]"]').fill('@web/uploads/guides');
  await save(page, 'filesystem guideImages');

  // Volume using that filesystem
  await go(page, 'settings/assets/volumes/new');
  await nameAndHandle(page, 'Guide images', 'guideImages');
  await page.locator('#fs-handle-selectized').click();
  await page.locator('.selectize-dropdown-content .option', { hasText: 'Guide images' }).first().click();
  await save(page, 'volume guideImages');
} finally {
  await browser.close();
}
