/** Capture: Barre (comparaison nommée) + Schéma (4 gabarits) */
import { makeBrowser, fresh, tool, click, esc, snap, ctxClick, edit, colorBtn } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── BARRE — "Mia: 15, Noah: 10" comparaison ────
console.log('Barre');
await fresh(page);
// Place 2 bars — just default size, name them
await tool(page, 'barre');
await click(page, 55, 55);
await page.waitForTimeout(300);
// Name first bar
const ctx1 = page.locator('[data-testid="context-actions"]');
if (await ctx1.isVisible({ timeout: 1500 }).catch(() => false)) {
  await ctx1.locator('button:has-text("Nommer")').click();
  await page.waitForTimeout(200);
  await edit(page, 'Mia');
}
await esc(page);

await tool(page, 'barre');
await click(page, 55, 78);
await page.waitForTimeout(300);
// Color + name second bar
await colorBtn(page, 'rouge');
const ctx2 = page.locator('[data-testid="context-actions"]');
if (await ctx2.isVisible({ timeout: 1500 }).catch(() => false)) {
  await ctx2.locator('button:has-text("Nommer")').click();
  await page.waitForTimeout(200);
  await edit(page, 'Noah');
}
await esc(page);

await snap(page, 'catalogue-barre.png', { x: 15, y: 35, w: 140, h: 60 });

// ── SCHÉMA: parties-tout ────────────────────────
console.log('Schéma parties-tout');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
// Add 2 parts
await page.locator('[data-testid="context-actions"] button:has-text("+ Partie")').click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('[data-testid="context-actions"] button:has-text("+ Partie")').click().catch(() => {});
await page.waitForTimeout(200);
await esc(page);
await snap(page, 'catalogue-schema-parties.png', { x: 30, y: 28, w: 230, h: 80 });

// ── SCHÉMA: comparaison ─────────────────────────
console.log('Schéma comparaison');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
await ctxClick(page, 'Type');
await page.locator('[data-testid="context-actions"] button:has-text("Comparer")').click().catch(() => {});
await page.waitForTimeout(300);
await esc(page);
await snap(page, 'catalogue-schema-comparaison.png', { x: 30, y: 30, w: 230, h: 88 });

// ── SCHÉMA: groupes-égaux ───────────────────────
console.log('Schéma groupes-égaux');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
await ctxClick(page, 'Type');
await page.locator('[data-testid="context-actions"] button:has-text("groupes")').click().catch(() => {});
await page.waitForTimeout(300);
await page.locator('[data-testid="context-actions"] button:has-text("+ Barre")').click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('[data-testid="context-actions"] button:has-text("+ Barre")').click().catch(() => {});
await page.waitForTimeout(200);
await esc(page);
await snap(page, 'catalogue-schema-groupes.png', { x: 15, y: 22, w: 210, h: 120 });

// ── SCHÉMA: transformation ──────────────────────
console.log('Schéma transformation');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
await ctxClick(page, 'Type');
await page.locator('[data-testid="context-actions"] button:has-text("Avant")').click().catch(() => {});
await page.waitForTimeout(300);
await esc(page);
await snap(page, 'catalogue-schema-transformation.png', { x: 30, y: 18, w: 230, h: 90 });

await browser.close();
console.log('Done: proportionnel');
