// Dev helper: describe CKEditor toolbar-designer items on the new-field form.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root, '.playwright-browsers');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: path.join(root, '.local', 'admin-state.json') });
  const page = await context.newPage();
  await page.goto('https://fullscale-rehearsal.ddev.site/admin/settings/fields/new', { waitUntil: 'networkidle' });
  await page.locator('#type-button').click();
  await page.getByRole('option', { name: 'CKEditor', exact: true }).click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const field = [...document.querySelectorAll('.field')].find((f) => f.innerText.trim().startsWith('Toolbar'));
    const root = field ?? document;
    const items = [...root.querySelectorAll('[data-item], [data-name], .ckeditor-tb--item, [class*=toolbar] [draggable], [class*=toolbar] button')];
    return { fieldClass: field?.className, containerHtml: field ? field.innerHTML.replace(/\s+/g, ' ').slice(0, 1500) : 'no toolbar field',
      sample: items.slice(0, 12).map((e) => `${e.tagName} class="${e.className}" data=${JSON.stringify({...e.dataset})} title="${e.getAttribute('title') ?? e.getAttribute('aria-label') ?? ''}" text="${(e.innerText||'').trim().slice(0,20)}"`) };
  });
  console.log(info.fieldClass); console.log(info.sample.join('\n')); console.log('--- html head'); console.log(info.containerHtml);
} finally { await browser.close(); }
