// Dev helper: list the permission checkboxes on the "new user group" screen.
import { openCp, go } from '../rehearsal/cp-lib.mjs';
const { browser, page } = await openCp({ height: 1400 });
try {
  await go(page, 'settings/users/groups/new');
  const rows = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox][name="permissions[]"]')].map((el) => {
    const lab = document.querySelector(`label[for="${el.id}"]`)?.textContent.trim().replace(/\s+/g, ' ');
    return `${el.value}\t${lab ?? ''}\tvisible=${!!(el.offsetWidth || el.offsetHeight)}`;
  }));
  console.log(rows.filter((r) => /accessCp|Entries:|Drafts:|Assets:|3884b563|3aa2d703/i.test(r)).join('\n'));
  console.log('total permission checkboxes:', rows.length);
  await page.screenshot({ path: '.local/shots/new-group.png', fullPage: false });
} finally { await browser.close(); }
