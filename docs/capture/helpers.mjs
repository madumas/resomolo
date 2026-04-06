/**
 * Shared helpers for catalogue screenshot scripts.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const IMAGES = path.join(__dirname, '..', '..', 'public', 'docs', 'images');
export const BASE = 'http://localhost:5199';
const CANVAS_W = 500;

let svgBox;

export async function init(page) {
  await page.goto(BASE, { timeout: 15000 });
  await page.waitForSelector('[data-testid="canvas-svg"]', { timeout: 5000 });
  for (const t of ['Compris', 'Passer', 'OK', 'Fermer'])
    await page.locator(`button:has-text("${t}")`).click().catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Switch to Complet
  await page.locator('button:has-text("Simplifié"), button:has-text("Complet")').first().click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator(':has-text("Complet")').last().click().catch(() => {});
  await page.waitForTimeout(300);
  svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
}

export async function fresh(page) {
  // Clear IndexedDB to avoid leftover pieces
  await page.evaluate(() => {
    const dbs = window.indexedDB.databases ? window.indexedDB.databases() : Promise.resolve([]);
    return dbs.then(list => Promise.all(list.map(db => {
      return new Promise((resolve) => {
        const req = window.indexedDB.deleteDatabase(db.name);
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
      });
    })));
  }).catch(() => {});
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await init(page);
}

function mm2px(mm) { return mm * svgBox.width / CANVAS_W; }
function cx(mm) { return svgBox.x + mm2px(mm); }
function cy(mm) { return svgBox.y + mm2px(mm); }

export async function click(page, xMm, yMm) {
  await page.mouse.click(cx(xMm), cy(yMm));
  await page.waitForTimeout(250);
}

export async function tool(page, name) {
  const btn = page.locator(`[data-testid="tool-${name}"]`);
  if (!await btn.isVisible().catch(() => false)) {
    await page.locator('button:has-text("+Plus"), button[aria-label="Plus d\'outils"]').first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await btn.click();
  await page.waitForTimeout(150);
}

export async function ctxClick(page, text) {
  const ctx = page.locator('[data-testid="context-actions"]');
  await ctx.waitFor({ timeout: 2000 });
  await ctx.locator(`button:has-text("${text}")`).first().click();
  await page.waitForTimeout(250);
}

export async function edit(page, text) {
  const ed = page.locator('[data-testid="inline-editor"]');
  if (await ed.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ed.fill(text);
    await ed.press('Enter');
    await page.waitForTimeout(250);
  }
}

export async function esc(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

export async function colorBtn(page, couleur) {
  await page.locator(`button[aria-label="Couleur ${couleur}"]`).click({ timeout: 2000 }).catch(() => {
    console.log(`  (skip color ${couleur})`);
  });
  await page.waitForTimeout(150);
}

// Select a piece by dispatching to the app's state (bypasses click issues for text pieces)
export async function selectPieceById(page, pieceId) {
  await page.evaluate((id) => {
    // Access React fiber to find dispatch — or use the global store if available
    const event = new CustomEvent('__resomolo_select_piece', { detail: id });
    window.dispatchEvent(event);
  }, pieceId).catch(() => {});
  await page.waitForTimeout(300);
}

// Get the ID of the last placed piece
export async function getLastPieceId(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('[data-testid="canvas-svg"]');
    if (!svg) return null;
    // Find all elements with data-piece-id
    const els = svg.querySelectorAll('[data-piece-id]');
    if (els.length === 0) return null;
    return els[els.length - 1].getAttribute('data-piece-id');
  }).catch(() => null);
}

export async function snap(page, filename, region) {
  const clip = {
    x: cx(region.x), y: cy(region.y),
    width: mm2px(region.w), height: mm2px(region.h),
  };
  await page.screenshot({ path: path.join(IMAGES, filename), clip });
  console.log(`  OK: ${filename}`);
}

export async function makeBrowser() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  return { browser, page };
}
