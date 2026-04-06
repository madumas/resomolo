/** Capture: Droite numérique, Arbre, Tableau, Diagramme à bandes, Diagramme à ligne */
import { makeBrowser, fresh, tool, click, esc, snap, ctxClick } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── DROITE NUMÉRIQUE ────────────────────────────
console.log('Droite numérique');
await fresh(page);
await tool(page, 'droiteNumerique');
await click(page, 150, 60);
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-droite.png', { x: 15, y: 35, w: 290, h: 45 });

// ── ARBRE ───────────────────────────────────────
console.log('Arbre');
await fresh(page);
await tool(page, 'arbre');
await click(page, 130, 80);
await page.waitForTimeout(500);
await ctxClick(page, 'Gabarit');
await page.locator('[data-testid="context-actions"] button:has-text("3×2")').click().catch(() => {});
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-arbre.png', { x: 10, y: 12, w: 290, h: 145 });

// ── TABLEAU ─────────────────────────────────────
console.log('Tableau');
await fresh(page);
await tool(page, 'tableau');
await click(page, 100, 65);
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-tableau.png', { x: 52, y: 36, w: 120, h: 60 });

// ── DIAGRAMME À BANDES ──────────────────────────
console.log('Diagramme à bandes');
await fresh(page);
await tool(page, 'diagrammeBandes');
await click(page, 130, 80);
await page.waitForTimeout(500);
await esc(page);
await snap(page, 'catalogue-diagramme-bandes.png', { x: 20, y: 15, w: 260, h: 140 });

// ── DIAGRAMME À LIGNE BRISÉE ────────────────────
console.log('Diagramme à ligne brisée');
await fresh(page);
await tool(page, 'diagrammeLigne');
await click(page, 130, 80);
await page.waitForTimeout(500);
await esc(page);
await snap(page, 'catalogue-diagramme-ligne.png', { x: 20, y: 15, w: 260, h: 140 });

await browser.close();
console.log('Done: structuré');
