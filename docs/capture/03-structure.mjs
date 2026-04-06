/** Capture: Droite numérique, Arbre, Tableau, Diagramme bandes, Diagramme ligne */
import { makeBrowser, fresh, tool, click, esc, snap, ctxClick } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── DROITE NUMÉRIQUE — 0 à 20 ──────────────────
console.log('Droite numérique');
await fresh(page);
await tool(page, 'droiteNumerique');
await click(page, 150, 60);
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-droite.png', { x: 15, y: 30, w: 290, h: 50 });

// ── ARBRE — Entrée/Plat/Dessert ────────────────
console.log('Arbre');
await fresh(page);
await tool(page, 'arbre');
await click(page, 130, 80);
await page.waitForTimeout(500);
// Template 3×2 for a nice-looking tree
await ctxClick(page, 'Gabarit');
await page.locator('[data-testid="context-actions"] button:has-text("3×2")').click().catch(() => {});
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-arbre.png', { x: 10, y: 12, w: 290, h: 145 });

// ── TABLEAU — 3 lignes, 3 colonnes ─────────────
console.log('Tableau');
await fresh(page);
await tool(page, 'tableau');
await click(page, 100, 65);
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-tableau.png', { x: 50, y: 32, w: 125, h: 65 });

// ── DIAGRAMME À BANDES — place top-left for better framing ──
console.log('Diagramme à bandes');
await fresh(page);
await tool(page, 'diagrammeBandes');
await click(page, 70, 50);
await page.waitForTimeout(500);
await esc(page);
await snap(page, 'catalogue-diagramme-bandes.png', { x: 5, y: 5, w: 200, h: 120 });

// ── DIAGRAMME À LIGNE BRISÉE ────────────────────
console.log('Diagramme à ligne brisée');
await fresh(page);
await tool(page, 'diagrammeLigne');
await click(page, 70, 50);
await page.waitForTimeout(500);
await esc(page);
await snap(page, 'catalogue-diagramme-ligne.png', { x: 5, y: 5, w: 200, h: 120 });

await browser.close();
console.log('Done: structuré');
