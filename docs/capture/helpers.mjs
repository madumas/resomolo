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
  // Mark onboarding as done to prevent overlay blocking
  await page.evaluate(() => { localStorage.setItem('resomolo-onboarding-done', '1'); });
  await page.reload();
  await page.waitForSelector('[data-testid="canvas-svg"]', { timeout: 5000 });
  for (const t of ['Compris', 'Passer', 'OK', 'Fermer'])
    await page.locator(`button:has-text("${t}")`).click().catch(() => {});
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Switch to Complet via mode selector
  await page.locator('[data-testid="mode-selector"]').click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('[data-testid="mode-option-complet"]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
}

export async function fresh(page) {
  // Reset app state via test-restore event with empty canvas (avoids IDB delete crash)
  const emptyState = {
    past: [], future: [],
    current: {
      probleme: '', problemeReadOnly: false, problemeHighlights: [],
      referenceUnitMm: 60, pieces: [], availablePieces: null,
    },
  };
  // If page is already on the app, restore directly; otherwise navigate first
  const currentUrl = page.url();
  if (!currentUrl.includes('localhost:5199')) {
    await init(page);
  }
  await page.evaluate((um) => {
    window.dispatchEvent(new CustomEvent('test-restore', { detail: um }));
  }, emptyState);
  await page.waitForTimeout(400);
  // Ensure Complet mode is active (fleche, arbre, etc. need it)
  await page.locator('[data-testid="mode-selector"]').click().catch(() => {});
  await page.waitForTimeout(200);
  await page.locator('[data-testid="mode-option-complet"]').click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(200);
  svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
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
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(150);
    return;
  }
  // Try "Voir tout" / mode expansion
  await page.locator('button[aria-label="Plus d\'outils"]').first().click().catch(() => {});
  await page.waitForTimeout(200);
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(150);
    return;
  }
  // Try category popovers
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
  await page.locator(`button[aria-label^="Couleur ${couleur}"]`).click({ timeout: 2000 }).catch(() => {
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

/** Load a fixture state via test-restore event (no IDB/reload needed) */
export async function loadFixture(page, modelisationState) {
  const undoManager = { past: [], current: modelisationState, future: [] };
  await page.evaluate((um) => {
    window.dispatchEvent(new CustomEvent('test-restore', { detail: um }));
  }, undoManager);
  await page.waitForTimeout(500);
  svgBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
}

export async function makeBrowser() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  return { browser, page };
}
