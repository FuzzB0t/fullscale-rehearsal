// Dev helper: list the visible controls on Settings > MCP.
import { openCp, go } from '../rehearsal/cp-lib.mjs';
const { browser, page } = await openCp({ height: 1600 });
try {
  await go(page, 'settings/mcp'); await page.getByRole('tab', { name: 'Authenticated' }).click(); await page.waitForTimeout(500);
  const rows = await page.evaluate(() => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    return [...document.querySelectorAll('input, select, textarea, button[role=switch], button.lightswitch')].filter(vis).map((el) => {
      const label = el.labels?.[0]?.innerText?.trim().replace(/\s+/g, ' ') ?? el.getAttribute('aria-label') ?? '';
      return `${el.tagName.toLowerCase()}[${el.type ?? el.getAttribute('role') ?? ''}] name=${el.getAttribute('name') ?? ''} id=${el.id} label="${label.slice(0, 70)}" checked=${el.checked ?? el.getAttribute('aria-checked')}`;
    });
  });
  console.log(rows.slice(0, 30).join('\n'));
  console.log('... total visible controls:', rows.length);
  await page.screenshot({ path: '.local/shots/mcp-settings-auth-before.png', fullPage: true });
} finally { await browser.close(); }
