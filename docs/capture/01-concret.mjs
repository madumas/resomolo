/** Capture: Jeton + Boîte */
import { makeBrowser, fresh, tool, click, esc, colorBtn, snap } from './helpers.mjs';

const { browser, page } = await makeBrowser();

// ── JETON ───────────────────────────────────────
console.log('Jeton');
await fresh(page);
await tool(page, 'jeton');
await click(page, 60, 60); await esc(page);
await tool(page, 'jeton');
await click(page, 75, 60); await esc(page);
await tool(page, 'jeton');
await click(page, 90, 60); await esc(page);
await click(page, 75, 60); await colorBtn(page, 'rouge'); await esc(page);
await click(page, 90, 60); await colorBtn(page, 'vert'); await esc(page);
await snap(page, 'catalogue-jeton.png', { x: 40, y: 42, w: 70, h: 35 });

// ── BOÎTE ───────────────────────────────────────
console.log('Boîte');
await fresh(page);
await tool(page, 'boite');
await click(page, 80, 65); await esc(page);
for (let i = 0; i < 4; i++) {
  await tool(page, 'jeton');
  await click(page, 60 + i * 15, 65); await esc(page);
}
await snap(page, 'catalogue-boite.png', { x: 30, y: 35, w: 115, h: 60 });

await browser.close();
console.log('Done: concret');
