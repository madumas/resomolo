/** Capture: Calcul (3 modes) + Réponse */
import { makeBrowser, fresh, tool, click, esc, snap, edit, ctxClick } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── CALCUL expression ───────────────────────────
console.log('Calcul expression');
await fresh(page);
await tool(page, 'calcul');
await click(page, 100, 60);
await edit(page, '28 * 4 = 112');
await esc(page);
await snap(page, 'catalogue-calcul-expression.png', { x: 58, y: 40, w: 135, h: 38 });

// Helper: place a calcul, edit it, then select it to get context actions
async function placeAndSelectCalcul(page, expr) {
  await tool(page, 'calcul');
  await click(page, 100, 60);
  await edit(page, expr);
  // After edit+Enter, piece is deselected. Click on it to select (1st click = select).
  // The piece is at ~(100,60) in canvas mm. Use click helper.
  await page.waitForTimeout(300);
  await click(page, 100, 60);
  await page.waitForTimeout(500);
}

// ── CALCUL colonnes ─────────────────────────────
console.log('Calcul colonnes');
await fresh(page);
await placeAndSelectCalcul(page, '347 + 256');
const ctx1 = page.locator('[data-testid="context-actions"]');
const colBtn = ctx1.locator('button:has-text("En colonnes")');
if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await colBtn.click();
  await page.waitForTimeout(600);
  await snap(page, 'catalogue-calcul-colonnes.png', { x: 25, y: 15, w: 230, h: 135 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: "En colonnes" not found');
  const btns = await ctx1.locator('button').allTextContents().catch(() => []);
  console.log('  Visible ctx buttons:', btns.join(' | '));
}

// ── CALCUL division ─────────────────────────────
console.log('Calcul division');
await fresh(page);
await placeAndSelectCalcul(page, '156 / 12');
const ctx2 = page.locator('[data-testid="context-actions"]');
const divBtn = ctx2.locator('button:has-text("Division posée")');
if (await divBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await divBtn.click();
  await page.waitForTimeout(600);
  await snap(page, 'catalogue-calcul-division.png', { x: 20, y: 10, w: 260, h: 155 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: "Division posée" not found');
  const btns = await ctx2.locator('button').allTextContents().catch(() => []);
  console.log('  Visible ctx buttons:', btns.join(' | '));
}

// ── RÉPONSE ─────────────────────────────────────
console.log('Réponse');
await fresh(page);
await tool(page, 'reponse');
await click(page, 120, 60);
await edit(page, 'Mia a 5 autocollants de plus que Noah.');
await esc(page);
await snap(page, 'catalogue-reponse.png', { x: 50, y: 38, w: 210, h: 42 });

await browser.close();
console.log('Done: calculer');
