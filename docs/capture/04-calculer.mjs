/** Capture: Calcul (expression, colonnes, division) + Réponse */
import { makeBrowser, fresh, tool, click, esc, snap, edit } from './helpers.mjs';

const { browser, page } = await makeBrowser();

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
await tool(page, 'calcul');
await click(page, 120, 60);
await edit(page, '347 + 256');
// After edit, piece is deselected. Click on the piece to select it.
// The piece starts at x=120 but expands left. Try clicking slightly left of center.
await page.waitForTimeout(300);
await click(page, 115, 60);
await page.waitForTimeout(500);
// Check if we got context actions
const ctx1 = page.locator('[data-testid="context-actions"]');
const vis1 = await ctx1.isVisible({ timeout: 2000 }).catch(() => false);
if (vis1) {
  const colBtn = ctx1.locator('button:has-text("En colonnes")');
  if (await colBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await colBtn.click();
    await page.waitForTimeout(600);
    await snap(page, 'catalogue-calcul-colonnes.png', { x: 30, y: 15, w: 240, h: 140 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } else {
    const btns = await ctx1.locator('button').allTextContents().catch(() => []);
    console.log('  SKIP colonnes — ctx buttons:', btns.join(' | '));
  }
} else {
  // Maybe clicked into editor — Escape first, then retry click
  await esc(page);
  await page.waitForTimeout(200);
  await click(page, 120, 60);
  await page.waitForTimeout(500);
  const vis1b = await ctx1.isVisible({ timeout: 2000 }).catch(() => false);
  if (vis1b) {
    const colBtn = ctx1.locator('button:has-text("En colonnes")');
    if (await colBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await colBtn.click();
      await page.waitForTimeout(600);
      await snap(page, 'catalogue-calcul-colonnes.png', { x: 30, y: 15, w: 240, h: 140 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  } else {
    console.log('  SKIP: colonnes — could not select calcul piece');
  }
}

// ── CALCUL division — 156 ÷ 12 ─────────────────
console.log('Calcul division');
await fresh(page);
await tool(page, 'calcul');
await click(page, 120, 60);
await edit(page, '156 / 12');
await page.waitForTimeout(300);
await click(page, 115, 60);
await page.waitForTimeout(500);
const ctx2 = page.locator('[data-testid="context-actions"]');
const vis2 = await ctx2.isVisible({ timeout: 2000 }).catch(() => false);
if (vis2) {
  const divBtn = ctx2.locator('button:has-text("Division")');
  if (await divBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await divBtn.click();
    await page.waitForTimeout(600);
    await snap(page, 'catalogue-calcul-division.png', { x: 20, y: 10, w: 260, h: 155 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } else {
    console.log('  SKIP division — button not found');
  }
} else {
  await esc(page);
  await page.waitForTimeout(200);
  await click(page, 120, 60);
  await page.waitForTimeout(500);
  const vis2b = await ctx2.isVisible({ timeout: 2000 }).catch(() => false);
  if (vis2b) {
    const divBtn = ctx2.locator('button:has-text("Division")');
    if (await divBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await divBtn.click();
      await page.waitForTimeout(600);
      await snap(page, 'catalogue-calcul-division.png', { x: 20, y: 10, w: 260, h: 155 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  } else {
    console.log('  SKIP: division — could not select calcul piece');
  }
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
