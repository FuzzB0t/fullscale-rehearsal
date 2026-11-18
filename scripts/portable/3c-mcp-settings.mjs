// Portable change 3c: MCP settings.
//
// Through the control panel (Settings > MCP, admin only), so it lands in project config:
//   Authenticated MCP server: ON   (endpoint /admin/mcp, authorization endpoint /admin/mcp/auth, Craft's defaults)
//   Public MCP server:        OFF  (stays off; nothing is exposed to anonymous clients)
//
// There is no server-side "access level" setting. The level (Read only / Read and write / Full access)
// is chosen by each user on the OAuth consent screen, see docs/apply/3c-mcp-settings.md.
//
// Usage: node scripts/portable/3c-mcp-settings.mjs
import { openCp, go, save, setSwitch } from '../rehearsal/cp-lib.mjs';

const { browser, page } = await openCp({ height: 1000 });
try {
  await go(page, 'settings/mcp');

  // Public tab: must be OFF. Assert it rather than assume it.
  const publicSwitch = page.locator('#mcp-public-enabled');
  if ((await publicSwitch.getAttribute('aria-checked')) === 'true') await setSwitch(publicSwitch, false);
  if ((await publicSwitch.getAttribute('aria-checked')) !== 'false') throw new Error('Public MCP server is not off');

  // Authenticated tab: ON.
  await page.getByRole('tab', { name: 'Authenticated' }).click();
  await page.waitForTimeout(400);
  await setSwitch(page.locator('#mcp-enabled'), true);
  if ((await page.locator('#mcp-enabled').getAttribute('aria-checked')) !== 'true') throw new Error('Could not enable the authenticated server');

  await save(page, 'MCP settings');
} finally {
  await browser.close();
}
