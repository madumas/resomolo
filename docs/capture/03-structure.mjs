/** Capture: Droite, Arbre, Tableau, Diagrammes — base + exemples via fixtures */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBrowser, fresh, tool, click, esc, snap, ctxClick, loadFixture } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
function fixture(name) {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8'));
}

const { browser, page } = await makeBrowser();

// ── DROITE base — 0 à 20 ──────────────────────
console.log('Droite (base)');
await fresh(page);
await tool(page, 'droiteNumerique');
await click(page, 150, 60);
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-droite.png', { x: 15, y: 40, w: 290, h: 35 });

// ── DROITE exemple — fixture avec marqueurs 8 et 13 ──
console.log('Droite (exemple)');
await loadFixture(page, fixture('exemple-droite.json'));
await snap(page, 'exemple-droite.png', { x: 5, y: 25, w: 310, h: 40 });

// ── ARBRE base — 3×2 ──────────────────────────
console.log('Arbre (base)');
await fresh(page);
await tool(page, 'arbre');
await click(page, 130, 80);
await page.waitForTimeout(500);
await ctxClick(page, 'Gabarit');
await page.locator('[data-testid="context-actions"] button:has-text("3×2")').click().catch(() => {});
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-arbre.png', { x: 10, y: 12, w: 290, h: 145 });

// ── ARBRE exemple — fixture Pile/Face × Rouge/Bleu + Calcul + Réponse ──
console.log('Arbre (exemple)');
await loadFixture(page, fixture('exemple-arbre.json'));
await snap(page, 'exemple-arbre.png', { x: 10, y: 15, w: 430, h: 170 });

// ── TABLEAU base — 3×3 ────────────────────────
console.log('Tableau (base)');
await fresh(page);
await tool(page, 'tableau');
await click(page, 100, 65);
await page.waitForTimeout(400);
await esc(page);
await snap(page, 'catalogue-tableau.png', { x: 50, y: 32, w: 125, h: 65 });

// ── TABLEAU exemple — fixture sondage fruits ───
console.log('Tableau (exemple)');
await loadFixture(page, fixture('exemple-tableau.json'));
await snap(page, 'exemple-tableau.png', { x: 25, y: 15, w: 140, h: 85 });

// ── DIAGRAMME À BANDES base ────────────────────
console.log('Diagramme à bandes (base)');
await fresh(page);
await tool(page, 'diagrammeBandes');
await click(page, 55, 40);
await page.waitForTimeout(500);
await esc(page);
await snap(page, 'catalogue-diagramme-bandes.png', { x: 2, y: 2, w: 180, h: 115 });

// ── DIAGRAMME À BANDES exemple — fixture fruits ─
console.log('Diagramme à bandes (exemple)');
await loadFixture(page, fixture('exemple-diagramme-bandes.json'));
await snap(page, 'exemple-diagramme-bandes.png', { x: 2, y: 2, w: 180, h: 115 });

// ── DIAGRAMME À LIGNE base ─────────────────────
console.log('Diagramme à ligne (base)');
await fresh(page);
await tool(page, 'diagrammeLigne');
await click(page, 55, 40);
await page.waitForTimeout(500);
await esc(page);
await snap(page, 'catalogue-diagramme-ligne.png', { x: 2, y: 2, w: 180, h: 115 });

// ── DIAGRAMME À LIGNE exemple — fixture température ─
console.log('Diagramme à ligne (exemple)');
await loadFixture(page, fixture('exemple-diagramme-ligne.json'));
await snap(page, 'exemple-diagramme-ligne.png', { x: 2, y: 2, w: 180, h: 115 });

await browser.close();
console.log('Done: structuré');
