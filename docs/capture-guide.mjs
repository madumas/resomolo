/**
 * Capture screenshots for guide-enseignant.
 * Run: node docs/capture-guide.mjs
 * Requires: dev server on port 5199
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES = path.join(__dirname, '..', 'public', 'docs', 'images');
const BASE = 'http://localhost:5199';

async function dismissDialogs(page) {
  for (const t of ['Compris', 'Passer', 'OK', 'Fermer'])
    await page.locator(`button:has-text("${t}")`).click().catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

async function switchToComplet(page) {
  await page.locator('[data-testid="mode-selector"]').click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('[data-testid="mode-option-complet"]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
}

// ─────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// ── VUE D'ENSEMBLE — full app with a solved problem ──
console.log('Vue d\'ensemble');
// Load with a comparison problem pre-solved
await page.goto(BASE, { timeout: 15000 });
await page.waitForSelector('[data-testid="canvas-svg"]');
await dismissDialogs(page);
await switchToComplet(page);

// Open problem bank and pick a problem
await page.locator('button:has-text("Problèmes")').click({ timeout: 3000 });
await page.waitForTimeout(500);
// Click first problem
const problemBtn = page.locator('button:has-text("Choisir")').first();
if (await problemBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await problemBtn.click();
  await page.waitForTimeout(500);
}
await dismissDialogs(page);

// Place some pieces to make it look like a solved problem
const svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
const mm2px = (mm) => mm * svgBox.width / 500;
const cx = (mm) => svgBox.x + mm2px(mm);
const cy = (mm) => svgBox.y + mm2px(mm);

// Place a barre
await page.locator('[data-testid="tool-barre"]').click().catch(() => {});
await page.waitForTimeout(150);
await page.mouse.click(cx(120), cy(70));
await page.waitForTimeout(250);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// Place a calcul
await page.locator('[data-testid="tool-calcul"]').click().catch(() => {});
await page.waitForTimeout(150);
await page.mouse.click(cx(120), cy(130));
await page.waitForTimeout(250);
const ed = page.locator('[data-testid="inline-editor"]');
if (await ed.isVisible({ timeout: 1500 }).catch(() => false)) {
  await ed.fill('12 + 8 = 20');
  await ed.press('Enter');
  await page.waitForTimeout(250);
}
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// Place a reponse
await page.locator('[data-testid="tool-reponse"]').click().catch(() => {});
await page.waitForTimeout(150);
await page.mouse.click(cx(120), cy(170));
await page.waitForTimeout(250);
const ed2 = page.locator('[data-testid="inline-editor"]');
if (await ed2.isVisible({ timeout: 1500 }).catch(() => false)) {
  await ed2.fill('Il y a 20 pommes en tout.');
  await ed2.press('Enter');
  await page.waitForTimeout(250);
}
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// Deselect all
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

await page.screenshot({ path: path.join(IMAGES, 'guide-vue-ensemble.png') });
console.log('  OK: guide-vue-ensemble.png');

// ── BARRE DE STATUT ──
console.log('Barre de statut');
const statusBar = page.locator('[data-testid="status-bar"]');
if (await statusBar.isVisible({ timeout: 2000 }).catch(() => false)) {
  await statusBar.screenshot({ path: path.join(IMAGES, 'guide-barre-statut.png') });
  console.log('  OK: guide-barre-statut.png');
} else {
  console.log('  SKIP: status bar not visible');
}

// ── MODE SELECTOR ──
console.log('Mode selector');
const modeSelector = page.locator('[data-testid="mode-selector"]');
await modeSelector.click();
await page.waitForTimeout(300);
// Capture the dropdown area
const msBox = await modeSelector.boundingBox();
if (msBox) {
  await page.screenshot({
    path: path.join(IMAGES, 'guide-mode-selector.png'),
    clip: { x: msBox.x - 10, y: msBox.y - 5, width: msBox.width + 20, height: 120 },
  });
  console.log('  OK: guide-mode-selector.png');
}
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// ── BANQUE DE PROBLEMES ──
console.log('Banque de problèmes');
await page.locator('button:has-text("Problèmes")').click({ timeout: 3000 });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(IMAGES, 'guide-banque-problemes.png') });
console.log('  OK: guide-banque-problemes.png');
// Close
await page.locator('button:has-text("Fermer")').click().catch(() => {});
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// ── SHARE PANEL ──
console.log('Share panel');
const shareBtn = page.locator('[data-testid="action-share"], button:has-text("Partager")').first();
if (await shareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await shareBtn.click();
  await page.waitForTimeout(300);
  // Click "Lien & QR code" option
  const linkBtn = page.locator('button:has-text("Lien")').first();
  if (await linkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await linkBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(IMAGES, 'guide-share-panel.png') });
    console.log('  OK: guide-share-panel.png');
    // Close share dialog
    await page.locator('button:has-text("×"), button[aria-label="Fermer"]').first().click().catch(() => {});
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

// ── PROFILS RAPIDES (Settings) ──
console.log('Profils rapides');
const settingsBtn = page.locator('[data-testid="settings-button"], button[aria-label="Paramètres"]').first();
if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await settingsBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(IMAGES, 'guide-profils-rapides.png') });
  console.log('  OK: guide-profils-rapides.png');
  await page.locator('button:has-text("Fermer"), button:has-text("×")').first().click().catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ── SURLIGNAGE (aide-memoire) ──
console.log('Surlignage');
// Reload with a problem to show highlighting
await page.reload({ timeout: 15000 });
await page.waitForSelector('[data-testid="canvas-svg"]');
await dismissDialogs(page);
// The problem zone should be visible with highlights
const problemZone = page.locator('[data-testid="problem-zone"]');
if (await problemZone.isVisible({ timeout: 2000 }).catch(() => false)) {
  await problemZone.screenshot({ path: path.join(IMAGES, 'aide-memoire-surlignage.png') });
  console.log('  OK: aide-memoire-surlignage.png');
} else {
  console.log('  SKIP: problem zone not visible');
}

// ── PARTAGER MENU (dropdown) ──
console.log('Partager menu');
if (await shareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  await shareBtn.click();
  await page.waitForTimeout(300);
  const menuBox = await shareBtn.boundingBox();
  if (menuBox) {
    await page.screenshot({
      path: path.join(IMAGES, 'guide-partager-menu.png'),
      clip: { x: menuBox.x - 20, y: menuBox.y - 200, width: 250, height: 220 },
    });
    console.log('  OK: guide-partager-menu.png');
  }
  await page.keyboard.press('Escape');
}

await browser.close();
console.log('\nDone! All guide screenshots captured.');
