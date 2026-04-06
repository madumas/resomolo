/** Capture: Jeton (8 bleus + 5 rouges) + Boîte (nommée avec jetons) */
import { makeBrowser, fresh, tool, click, esc, colorBtn, snap } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── JETON — "Léo a 8 billes, il en reçoit 5" ────
console.log('Jeton');
await fresh(page);
// 8 jetons bleus (2 rangées de 4)
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 4; c++) {
    await tool(page, 'jeton');
    await click(page, 55 + c * 14, 55 + r * 14);
    await esc(page);
  }
}
// 5 jetons rouges
for (let c = 0; c < 5; c++) {
  await tool(page, 'jeton');
  await click(page, 130 + c * 14, 55);
  await esc(page);
}
// Color all rouges
for (let c = 0; c < 5; c++) {
  await click(page, 130 + c * 14, 55);
  await colorBtn(page, 'rouge');
  await esc(page);
}
await snap(page, 'catalogue-jeton.png', { x: 35, y: 38, w: 130, h: 42 });

// ── BOÎTE — "1 sac de 6 bonbons" ────────────────
console.log('Boîte');
await fresh(page);
await tool(page, 'boite');
await click(page, 90, 65); await esc(page);
// 6 jetons dedans
for (let c = 0; c < 6; c++) {
  await tool(page, 'jeton');
  await click(page, 60 + c * 13, 65);
  await esc(page);
}
// Name the box — click on it
await click(page, 90, 50);
await page.waitForTimeout(300);
const ctx = page.locator('[data-testid="context-actions"]');
if (await ctx.isVisible({ timeout: 1500 }).catch(() => false)) {
  await ctx.locator('button:has-text("Nommer")').click().catch(() => {});
  await page.waitForTimeout(200);
  const ed = page.locator('[data-testid="inline-editor"]');
  if (await ed.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ed.fill('1 sac');
    await ed.press('Enter');
    await page.waitForTimeout(250);
  }
}
await esc(page);
await snap(page, 'catalogue-boite.png', { x: 25, y: 30, w: 145, h: 65 });

await browser.close();
console.log('Done: concret');
