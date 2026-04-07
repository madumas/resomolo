/** Capture: Calcul (3 modes) + Réponse — base + exemples */
import { makeBrowser, fresh, tool, click, esc, snap, edit } from './helpers.mjs';

const { browser, page } = await makeBrowser();

async function placeAndSelectCalcul(expr) {
  await tool(page, 'calcul');
  await click(page, 120, 60);
  await edit(page, expr);
  await page.waitForTimeout(300);
  await click(page, 130, 70);
  await page.waitForTimeout(500);
}

// ── CALCUL expression base — 28 × 4 = 112 ─────
console.log('Calcul expression (base)');
await fresh(page);
await tool(page, 'calcul');
await click(page, 120, 60);
await edit(page, '28 * 4 = 112');
await esc(page);
await snap(page, 'catalogue-calcul-expression.png', { x: 70, y: 48, w: 140, h: 30 });

// ── CALCUL colonnes base — 347 + 256 ───────────
console.log('Calcul colonnes (base)');
await fresh(page);
await placeAndSelectCalcul('347 + 256');
const ctx1 = page.locator('[data-testid="context-actions"]');
if (await ctx1.isVisible({ timeout: 2000 }).catch(() => false)) {
  await ctx1.locator('button:has-text("En colonnes")').click();
  await page.waitForTimeout(600);
  await snap(page, 'catalogue-calcul-colonnes.png', { x: 20, y: 5, w: 260, h: 155 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: colonnes — could not select calcul piece');
}

// ── CALCUL division base — 156 ÷ 12 ───────────
console.log('Calcul division (base)');
await fresh(page);
await placeAndSelectCalcul('156 / 12');
const ctx2 = page.locator('[data-testid="context-actions"]');
if (await ctx2.isVisible({ timeout: 2000 }).catch(() => false)) {
  await ctx2.locator('button:has-text("Division")').click();
  await page.waitForTimeout(600);
  await snap(page, 'catalogue-calcul-division.png', { x: 15, y: 5, w: 280, h: 160 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: division — could not select calcul piece');
}

// ── CALCUL exemple — "28 × 4 =" (non rempli) ──
console.log('Calcul (exemple)');
await fresh(page);
await tool(page, 'calcul');
await click(page, 120, 60);
await edit(page, '28 × 4 =');
await esc(page);
await snap(page, 'exemple-calcul.png', { x: 70, y: 48, w: 140, h: 30 });

// ── RÉPONSE base ───────────────────────────────
console.log('Réponse (base)');
await fresh(page);
await tool(page, 'reponse');
await click(page, 140, 60);
await edit(page, 'Mia a 5 autocollants de plus que Noah.');
await esc(page);
await snap(page, 'catalogue-reponse.png', { x: 50, y: 38, w: 250, h: 42 });

// ── RÉPONSE exemple — "En tout, il y a 24 bonbons." ─
console.log('Réponse (exemple)');
await fresh(page);
await tool(page, 'reponse');
await click(page, 140, 60);
await edit(page, 'En tout, il y a 24 bonbons.');
await esc(page);
await snap(page, 'exemple-reponse.png', { x: 50, y: 38, w: 250, h: 42 });

await browser.close();
console.log('Done: calculer');
