/** Capture: Calcul (expression, colonnes, division) + Réponse */
import { makeBrowser, fresh, tool, click, esc, snap, edit } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// Helper: place calcul at (120,60), edit, then click at (130,70) to select it.
// The hit-zone is offset ~+10mm from placement due to snap + piece sizing.
async function placeAndSelectCalcul(expr) {
  await tool(page, 'calcul');
  await click(page, 120, 60);
  await edit(page, expr);
  await page.waitForTimeout(300);
  await click(page, 130, 70);
  await page.waitForTimeout(500);
}

// ── CALCUL expression — 28 × 4 = 112 ───────────
console.log('Calcul expression');
await fresh(page);
await tool(page, 'calcul');
await click(page, 120, 60);
await edit(page, '28 * 4 = 112');
await esc(page);
await snap(page, 'catalogue-calcul-expression.png', { x: 65, y: 38, w: 145, h: 40 });

// ── CALCUL colonnes — 347 + 256 ─────────────────
console.log('Calcul colonnes');
await fresh(page);
await placeAndSelectCalcul('347 + 256');
const ctx1 = page.locator('[data-testid="context-actions"]');
if (await ctx1.isVisible({ timeout: 2000 }).catch(() => false)) {
  await ctx1.locator('button:has-text("En colonnes")').click();
  await page.waitForTimeout(600);
  await snap(page, 'catalogue-calcul-colonnes.png', { x: 30, y: 15, w: 240, h: 140 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: colonnes — could not select calcul piece');
}

// ── CALCUL division — 156 ÷ 12 ─────────────────
console.log('Calcul division');
await fresh(page);
await placeAndSelectCalcul('156 / 12');
const ctx2 = page.locator('[data-testid="context-actions"]');
if (await ctx2.isVisible({ timeout: 2000 }).catch(() => false)) {
  await ctx2.locator('button:has-text("Division")').click();
  await page.waitForTimeout(600);
  await snap(page, 'catalogue-calcul-division.png', { x: 20, y: 10, w: 260, h: 155 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: division — could not select calcul piece');
}

// ── RÉPONSE ─────────────────────────────────────
console.log('Réponse');
await fresh(page);
await tool(page, 'reponse');
await click(page, 140, 60);
await edit(page, 'Mia a 5 autocollants de plus que Noah.');
await esc(page);
await snap(page, 'catalogue-reponse.png', { x: 55, y: 38, w: 220, h: 42 });

await browser.close();
console.log('Done: calculer');
