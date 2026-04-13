/** Capture: Barre + Schéma — images de base + exemples */
import { makeBrowser, fresh, tool, click, esc, snap, ctxClick, edit, colorBtn } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── BARRE base — deux barres nommées comparées ──
console.log('Barre (base)');
await fresh(page);
await tool(page, 'barre');
await click(page, 55, 55);
await page.waitForTimeout(300);
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
await colorBtn(page, 'rouge');
const ctx2 = page.locator('[data-testid="context-actions"]');
if (await ctx2.isVisible({ timeout: 1500 }).catch(() => false)) {
  await ctx2.locator('button:has-text("Nommer")').click();
  await page.waitForTimeout(200);
  await edit(page, 'Noah');
}
await esc(page);
await snap(page, 'catalogue-barre.png', { x: 15, y: 35, w: 140, h: 60 });

// ── BARRE exemple — Léa ×3 (14) vs Maxime ×2 (9), groupées + Calcul + Réponse ─
console.log('Barre (exemple)');
await fresh(page);
// Barre Léa ×3
await tool(page, 'barre');
await click(page, 55, 50);
await page.waitForTimeout(300);
{
  const c = page.locator('[data-testid="context-actions"]');
  if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
    await c.locator('button:has-text("Taille")').click().catch(() => {});
    await page.waitForTimeout(200);
    await c.locator('button:has-text("3×")').click().catch(() => {});
    await page.waitForTimeout(200);
    await c.locator('button:has-text("Nommer")').click().catch(() => {});
    await page.waitForTimeout(200);
    await edit(page, 'Léa');
    // Re-select to add Valeur
    await click(page, 100, 50);
    await page.waitForTimeout(300);
    await page.locator('[data-testid="context-actions"] button:has-text("Valeur")').click().catch(() => {});
    await page.waitForTimeout(200);
    await edit(page, '14');
  }
}
await esc(page);

// Barre Maxime ×2
await tool(page, 'barre');
await click(page, 55, 75);
await page.waitForTimeout(300);
{
  const c = page.locator('[data-testid="context-actions"]');
  if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
    await colorBtn(page, 'rouge');
    await c.locator('button:has-text("Taille")').click().catch(() => {});
    await page.waitForTimeout(200);
    await c.locator('button:has-text("2×")').click().catch(() => {});
    await page.waitForTimeout(200);
    await c.locator('button:has-text("Nommer")').click().catch(() => {});
    await page.waitForTimeout(200);
    await edit(page, 'Maxime');
    // Re-select to add Valeur
    await click(page, 85, 75);
    await page.waitForTimeout(300);
    await page.locator('[data-testid="context-actions"] button:has-text("Valeur")').click().catch(() => {});
    await page.waitForTimeout(200);
    await edit(page, '9');
  }
}
await esc(page);

// Grouper
await click(page, 100, 50);
await page.waitForTimeout(300);
{
  const c = page.locator('[data-testid="context-actions"]');
  if (await c.isVisible({ timeout: 1500 }).catch(() => false)) {
    await c.locator('[data-testid="ctx-grouper"]').click().catch(() => {});
    await page.waitForTimeout(300);
    await click(page, 85, 75);
    await page.waitForTimeout(500);
  }
}
await esc(page);

// Calcul + Réponse
await tool(page, 'calcul');
await click(page, 100, 110);
await edit(page, '14 - 9 = 5');
await esc(page);
await tool(page, 'reponse');
await click(page, 260, 110);
await edit(page, 'Léa a 5 billes de plus.');
await esc(page);

await snap(page, 'exemple-barre.png', { x: 10, y: 25, w: 430, h: 110 });

// ── SCHÉMA: 4 gabarits (images de base) ─────────
console.log('Schéma tout-et-parties');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
await page.locator('[data-testid="context-actions"] button:has-text("+ Partie")').click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('[data-testid="context-actions"] button:has-text("+ Partie")').click().catch(() => {});
await page.waitForTimeout(200);
await esc(page);
await snap(page, 'catalogue-schema-tout-et-parties.png', { x: 30, y: 28, w: 230, h: 80 });

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

// ── SCHÉMA exemple — tout-et-parties ───────────────
console.log('Schéma (exemple)');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
// Default gabarit is tout-et-parties, add 1 extra part
await page.locator('[data-testid="context-actions"] button:has-text("+ Partie")').click().catch(() => {});
await page.waitForTimeout(200);
await esc(page);
await snap(page, 'exemple-schema.png', { x: 20, y: 18, w: 250, h: 90 });

await browser.close();
console.log('Done: proportionnel');
