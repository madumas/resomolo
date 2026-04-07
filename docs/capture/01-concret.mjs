/** Capture: Jeton + Boîte — images de base + exemples */
import { makeBrowser, fresh, tool, click, esc, colorBtn, snap, edit } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// Helper: click boîte empty bottom zone (validated: y=78 hits boîte, not jetons)
async function clickBoite(page, x, y) {
  await click(page, x, y);
  await page.waitForTimeout(400);
  const c = page.locator('[data-testid="context-actions"]');
  if (!await c.isVisible({ timeout: 1500 }).catch(() => false)) return false;
  return await c.locator('button:has-text("Nommer"), button:has-text("Copier")').first().isVisible().catch(() => false);
}

// ── JETON base — 8 bleus + 5 rouges ────────────
console.log('Jeton (base)');
await fresh(page);
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 4; c++) {
    await tool(page, 'jeton');
    await click(page, 55 + c * 14, 55 + r * 14);
    await esc(page);
  }
}
for (let c = 0; c < 5; c++) {
  await tool(page, 'jeton');
  await click(page, 130 + c * 14, 55);
  await esc(page);
}
for (let c = 0; c < 5; c++) {
  await click(page, 130 + c * 14, 55);
  await colorBtn(page, 'rouge');
  await esc(page);
}
await snap(page, 'catalogue-jeton.png', { x: 35, y: 38, w: 170, h: 42 });

// ── JETON exemple — 8 bleus + 5 rouges + Calcul + Réponse ──
console.log('Jeton (exemple)');
await fresh(page);
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 4; c++) {
    await tool(page, 'jeton');
    await click(page, 45 + c * 14, 50 + r * 14);
    await esc(page);
  }
}
for (let c = 0; c < 5; c++) {
  await tool(page, 'jeton');
  await click(page, 120 + c * 14, 50);
  await esc(page);
}
for (let c = 0; c < 5; c++) {
  await click(page, 120 + c * 14, 50);
  await colorBtn(page, 'rouge');
  await esc(page);
}
await tool(page, 'calcul');
await click(page, 100, 100);
await edit(page, '8 + 5 = 13');
await esc(page);
await tool(page, 'reponse');
await click(page, 250, 100);
await edit(page, 'Léo a 13 billes en tout.');
await esc(page);
await snap(page, 'exemple-jeton.png', { x: 15, y: 30, w: 420, h: 90 });

// ── BOÎTE base — 1 boîte nommée, 6 jetons 3×2 equidistants ─
console.log('Boîte (base)');
await fresh(page);
await tool(page, 'boite');
await click(page, 70, 42); await esc(page);
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 3; c++) {
    await tool(page, 'jeton');
    await click(page, 78 + c * 14, 52 + r * 14);
    await esc(page);
  }
}
if (await clickBoite(page, 85, 78)) {
  const ctx = page.locator('[data-testid="context-actions"]');
  await ctx.locator('button:has-text("Nommer")').click().catch(() => {});
  await page.waitForTimeout(200);
  await edit(page, 'sac 1');
}
await esc(page);
await snap(page, 'catalogue-boite.png', { x: 28, y: 15, w: 135, h: 95 });

// ── BOÎTE exemple — 4 sacs de 6 bonbons ────────
console.log('Boîte (exemple)');
await fresh(page);
await tool(page, 'boite');
await click(page, 70, 42); await esc(page);
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 3; c++) {
    await tool(page, 'jeton');
    await click(page, 78 + c * 14, 52 + r * 14);
    await esc(page);
  }
}
// Name
if (await clickBoite(page, 85, 78)) {
  const ctx = page.locator('[data-testid="context-actions"]');
  await ctx.locator('button:has-text("Nommer")').click().catch(() => {});
  await page.waitForTimeout(200);
  await edit(page, 'sac 1');
}
await esc(page);
// Copy 3 times
for (let i = 0; i < 3; i++) {
  if (await clickBoite(page, 85, 78)) {
    const ctx = page.locator('[data-testid="context-actions"]');
    await ctx.locator('button:has-text("Copier")').click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await esc(page);
}
// Calcul + Réponse
await tool(page, 'calcul');
await click(page, 100, 110);
await edit(page, '4 × 6 = 24');
await esc(page);
await tool(page, 'reponse');
await click(page, 260, 110);
await edit(page, 'En tout, il y a 24 bonbons.');
await esc(page);
// Ranger
const rangerBtn = page.locator('button:has-text("Ranger")');
if (await rangerBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  await rangerBtn.click();
  await page.waitForTimeout(800);
}
await snap(page, 'exemple-boite.png', { x: 5, y: 10, w: 470, h: 130 });

await browser.close();
console.log('Done: concret');
