// Dev helper for 3a: set the three layout options on the fixture guide through its control-panel edit screen.
//   node scripts/portable/_3a-set-options.mjs <guideFirst|chapterFirst> <sticky on|off> <show on|off> [shot.png]
import { openCp, go, setSwitch, root } from '../rehearsal/cp-lib.mjs';
import path from 'node:path';
const [headline, sticky, show, shot] = process.argv.slice(2);
const { browser, page } = await openCp({ height: 1300 });
try {
  await go(page, 'entries/guidesForTeams');
  await page.getByRole('link', { name: 'Fixture guide (delete me)', exact: true }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const label = headline === "chapterFirst" ? "Chapter title first" : "Guide title first";
  await page.locator("#fields-layoutHeadline-field .selectize-input").click();
  await page.locator(".selectize-dropdown:visible .option", { hasText: label }).click();
  console.log("headline now:", (await page.locator("#fields-layoutHeadline-field .selectize-input .item").textContent()).trim());
  await setSwitch(page.getByRole('switch', { name: 'Sticky chapter menu' }), sticky === 'on');
  await setSwitch(page.getByRole('switch', { name: "Show 'In this section'" }), show === 'on');
  if (shot) await page.screenshot({ path: path.join(root, shot), fullPage: true });
  await page.locator('button[type=submit]:visible', { hasText: /^\s*Save\s*$/ }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const errors = await page.locator('.errors li, .notification.error').allTextContents();
  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'saved ok -> ' + page.url());
} finally { await browser.close(); }
