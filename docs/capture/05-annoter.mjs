/** Capture: Étiquette, Inconnue, Flèche */
import { makeBrowser, fresh, tool, click, esc, snap, edit, colorBtn } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── ÉTIQUETTE ───────────────────────────────────
console.log('Étiquette');
await fresh(page);
await tool(page, 'etiquette');
await click(page, 80, 60);
await edit(page, 'Léo');
await esc(page);
await tool(page, 'etiquette');
await click(page, 140, 60);
await edit(page, 'grand-mère');
await esc(page);
await snap(page, 'catalogue-etiquette.png', { x: 48, y: 40, w: 145, h: 38 });

// ── INCONNUE ────────────────────────────────────
console.log('Inconnue');
await fresh(page);
// Place a barre first to attach the inconnue to
await tool(page, 'barre');
await click(page, 100, 65); await esc(page);
await tool(page, 'inconnue');
await click(page, 130, 55);
await page.waitForTimeout(300);
await esc(page);
await snap(page, 'catalogue-inconnue.png', { x: 55, y: 35, w: 120, h: 50 });

// ── FLÈCHE ──────────────────────────────────────
console.log('Flèche');
await fresh(page);
await tool(page, 'jeton');
await click(page, 80, 70); await esc(page);
await tool(page, 'jeton');
await click(page, 170, 70);
await colorBtn(page, 'rouge');
await esc(page);
await tool(page, 'etiquette');
await click(page, 73, 55);
await edit(page, 'Léo');
await esc(page);
await tool(page, 'etiquette');
await click(page, 163, 55);
await edit(page, 'Mia');
await esc(page);
await tool(page, 'fleche');
await click(page, 80, 70);
await page.waitForTimeout(400);
await click(page, 170, 70);
await page.waitForTimeout(300);
await edit(page, 'donne 5');
await esc(page);
await snap(page, 'catalogue-fleche.png', { x: 38, y: 22, w: 185, h: 72 });

await browser.close();
console.log('Done: annoter');
