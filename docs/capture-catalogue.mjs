/**
 * Capture screenshots for piece catalogue.
 * Run: node docs/capture-catalogue.mjs
 * Requires: dev server on port 5199
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES = path.join(__dirname, '..', 'public', 'docs', 'images');
const BASE = 'http://localhost:5199';
const CANVAS_W = 500;

let svgBox;

async function init(page) {
  await page.goto(BASE, { timeout: 15000 });
  await page.waitForSelector('[data-testid="canvas-svg"]');
  for (const t of ['Compris', 'Passer', 'OK', 'Fermer'])
    await page.locator(`button:has-text("${t}")`).click().catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Switch to mode Complet (dropdown: Simplifié▾ → Complet)
const modeBtn = page.locator('button:has-text("Simplifié"), button:has-text("Complet")').first();
await modeBtn.click().catch(() => {});
await page.waitForTimeout(200);
await page.locator(':has-text("Complet")').last().click().catch(() => {});
  await page.waitForTimeout(200);
  svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
}

function mm2px(mm) { return mm * svgBox.width / CANVAS_W; }
function cx(mm) { return svgBox.x + mm2px(mm); }
function cy(mm) { return svgBox.y + mm2px(mm); }

async function click(page, xMm, yMm) {
  await page.mouse.click(cx(xMm), cy(yMm));
  await page.waitForTimeout(250);
}

async function tool(page, name) {
  const btn = page.locator(`[data-testid="tool-${name}"]`);
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(150);
    return;
  }
  await page.locator('button[aria-label="Plus d\'outils"]').first().click().catch(() => {});
  await page.waitForTimeout(200);
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(150);
    return;
  }
  const groups = page.locator('[data-testid="toolbar"] [data-testid^="group-"]');
  for (let i = 0; i < await groups.count(); i++) {
    await groups.nth(i).click();
    await page.waitForTimeout(200);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(150);
      return;
    }
  }
}

async function ctxClick(page, textOrSelector) {
  const ctx = page.locator('[data-testid="context-actions"]');
  await ctx.waitFor({ timeout: 2000 });
  const btn = ctx.locator(`button:has-text("${textOrSelector}")`);
  await btn.first().click();
  await page.waitForTimeout(250);
}

async function edit(page, text) {
  const ed = page.locator('[data-testid="inline-editor"]');
  if (await ed.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ed.fill(text);
    await ed.press('Enter');
    await page.waitForTimeout(250);
  }
}

async function esc(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

async function snap(page, filename, region) {
  const clip = {
    x: cx(region.x), y: cy(region.y),
    width: mm2px(region.w), height: mm2px(region.h),
  };
  await page.screenshot({ path: path.join(IMAGES, filename), clip });
  console.log(`  OK: ${filename}`);
}

async function fresh(page) {
  await page.reload({ timeout: 15000 });
  await page.waitForSelector('[data-testid="canvas-svg"]');
  for (const t of ['Compris', 'Passer', 'OK', 'Fermer'])
    await page.locator(`button:has-text("${t}")`).click().catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Switch to mode Complet (dropdown: Simplifié▾ → Complet)
const modeBtn = page.locator('button:has-text("Simplifié"), button:has-text("Complet")').first();
await modeBtn.click().catch(() => {});
await page.waitForTimeout(200);
await page.locator(':has-text("Complet")').last().click().catch(() => {});
  await page.waitForTimeout(200);
  svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
}

// ─────────────────────────────────────────────────
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await init(page);

// ── JETON ───────────────────────────────────────
console.log('Jeton');
await tool(page, 'jeton');
await click(page, 60, 60); await esc(page);
await tool(page, 'jeton');
await click(page, 75, 60); await esc(page);
await tool(page, 'jeton');
await click(page, 90, 60); await esc(page);
// Color 2nd rouge, 3rd vert — with timeout to avoid blocking
await click(page, 75, 60);
await page.locator('button[aria-label="Couleur rouge"]').click({ timeout: 2000 }).catch(() => { console.log('  (skip color rouge)'); });
await esc(page);
await click(page, 90, 60);
await page.locator('button[aria-label="Couleur vert"]').click({ timeout: 2000 }).catch(() => { console.log('  (skip color vert)'); });
await esc(page);
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
await page.locator('[data-testid="context-actions"] button:has-text("Type")').click().catch(() => {});
await page.waitForTimeout(250);
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
await page.locator('[data-testid="context-actions"] button:has-text("Type")').click().catch(() => {});
await page.waitForTimeout(250);
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
await page.locator('[data-testid="context-actions"] button:has-text("Type")').click().catch(() => {});
await page.waitForTimeout(250);
await page.locator('[data-testid="context-actions"] button:has-text("Avant")').click().catch(() => {});
await page.waitForTimeout(300);
await esc(page);
await snap(page, 'catalogue-schema-transformation.png', { x: 30, y: 18, w: 230, h: 90 });

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
await page.locator('[data-testid="context-actions"] button:has-text("Gabarit")').click().catch(() => {});
await page.waitForTimeout(250);
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

// ── CALCUL expression ───────────────────────────
console.log('Calcul expression');
await fresh(page);
await tool(page, 'calcul');
await click(page, 100, 60);
await edit(page, '28 * 4 = 112');
await esc(page);
await snap(page, 'catalogue-calcul-expression.png', { x: 58, y: 40, w: 135, h: 38 });

// ── CALCUL colonnes ─────────────────────────────
console.log('Calcul colonnes');
await fresh(page);
await tool(page, 'calcul');
await click(page, 100, 60);
await edit(page, '347 + 256');
await click(page, 100, 60);
await page.waitForTimeout(300);
const colBtn = page.locator('[data-testid="context-actions"] button:has-text("colonnes")');
if (await colBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  await colBtn.click();
  await page.waitForTimeout(500);
  await snap(page, 'catalogue-calcul-colonnes.png', { x: 25, y: 15, w: 230, h: 135 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: colonnes button not found');
}

// ── CALCUL division ─────────────────────────────
console.log('Calcul division');
await fresh(page);
await tool(page, 'calcul');
await click(page, 100, 60);
await edit(page, '156 / 12');
await click(page, 100, 60);
await page.waitForTimeout(300);
const divBtn = page.locator('[data-testid="context-actions"] button:has-text("Division")');
if (await divBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  await divBtn.click();
  await page.waitForTimeout(500);
  await snap(page, 'catalogue-calcul-division.png', { x: 20, y: 10, w: 260, h: 155 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
} else {
  console.log('  SKIP: division button not found');
}

// ── RÉPONSE ─────────────────────────────────────
console.log('Réponse');
await fresh(page);
await tool(page, 'reponse');
await click(page, 120, 60);
await edit(page, 'Mia a 5 autocollants de plus que Noah.');
await esc(page);
await snap(page, 'catalogue-reponse.png', { x: 50, y: 38, w: 210, h: 42 });

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

// ── FLÈCHE ──────────────────────────────────────
console.log('Flèche');
await fresh(page);
await tool(page, 'jeton');
await click(page, 80, 70); await esc(page);
await tool(page, 'jeton');
await click(page, 170, 70);
await page.locator('button[aria-label="Couleur rouge"]').click({ timeout: 2000 }).catch(() => { console.log('  (skip color)'); });
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

// ── DONE ────────────────────────────────────────
await browser.close();
console.log('\nDone! All catalogue screenshots captured.');
