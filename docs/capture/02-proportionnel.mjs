/** Capture: Barre + Schéma (5 gabarits) */
import { makeBrowser, fresh, tool, click, esc, snap, ctxClick } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── BARRE ───────────────────────────────────────
console.log('Barre');
await fresh(page);
await tool(page, 'barre');
await click(page, 60, 55); await esc(page);
await tool(page, 'barre');
await click(page, 60, 78); await esc(page);
await snap(page, 'catalogue-barre.png', { x: 25, y: 35, w: 130, h: 60 });

// ── SCHÉMA: parties-tout ────────────────────────
console.log('Schéma parties-tout');
await fresh(page);
await tool(page, 'schema');
await click(page, 130, 65);
await page.waitForTimeout(400);
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
await snap(page, 'catalogue-schema-comparaison.png', { x: 30, y: 18, w: 230, h: 100 });

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
await snap(page, 'catalogue-schema-groupes.png', { x: 30, y: 12, w: 200, h: 130 });

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
