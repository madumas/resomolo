/** Capture: Étiquette, Inconnue, Flèche — base + exemples (fixtures for complex ones) */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBrowser, fresh, tool, click, esc, snap, edit, colorBtn, loadFixture } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
function fixture(name) {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8'));
}

const { browser, page } = await makeBrowser();

// ── ÉTIQUETTE base — "Léo" et "grand-mère" ────
console.log('Étiquette (base)');
await fresh(page);
await tool(page, 'etiquette');
await click(page, 80, 60);
await edit(page, 'Léo');
await esc(page);
await tool(page, 'etiquette');
await click(page, 140, 60);
await edit(page, 'grand-mère');
await esc(page);
await snap(page, 'catalogue-etiquette.png', { x: 48, y: 40, w: 145, h: 35 });

// ── ÉTIQUETTE exemple — "Léo" et "Grand-mère" près de boîtes ─
console.log('Étiquette (exemple)');
await fresh(page);
await tool(page, 'boite');
await click(page, 70, 60); await esc(page);
await tool(page, 'boite');
await click(page, 170, 60);
await colorBtn(page, 'rouge');
await esc(page);
await tool(page, 'etiquette');
await click(page, 62, 46);
await edit(page, 'Léo');
await esc(page);
await tool(page, 'etiquette');
await click(page, 162, 46);
await edit(page, 'Grand-mère');
await esc(page);
await snap(page, 'exemple-etiquette.png', { x: 20, y: 26, w: 230, h: 65 });

// ── INCONNUE base — "?" attaché à une barre ───
console.log('Inconnue (base)');
await fresh(page);
await tool(page, 'barre');
await click(page, 100, 70);
await esc(page);
await tool(page, 'inconnue');
await click(page, 130, 58);
await page.waitForTimeout(300);
await esc(page); await esc(page);
await snap(page, 'catalogue-inconnue.png', { x: 55, y: 40, w: 120, h: 50 });

// ── INCONNUE exemple — fixture: barres groupées + ? ─
console.log('Inconnue (exemple)');
await loadFixture(page, fixture('exemple-inconnue.json'));
await snap(page, 'exemple-inconnue.png', { x: 10, y: 15, w: 270, h: 90 });

// ── FLÈCHE base — Léo → Mia avec jetons ───────
console.log('Flèche (base)');
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

// ── FLÈCHE exemple — fixture: boîtes Léo → Mia avec flèche "donne 5" ─
console.log('Flèche (exemple)');
await loadFixture(page, fixture('exemple-fleche.json'));
await snap(page, 'exemple-fleche.png', { x: 15, y: 18, w: 270, h: 85 });

await browser.close();
console.log('Done: annoter');
