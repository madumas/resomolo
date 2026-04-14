import { type Page, expect } from '@playwright/test';

/**
 * Read the actual viewBox width from the SVG element (handles responsive canvas).
 */
async function getViewBoxWidth(page: Page): Promise<number> {
  const vb = await page.locator('[data-testid="canvas-svg"]').getAttribute('viewBox');
  if (!vb) return 500; // fallback
  const parts = vb.split(/\s+/);
  return parseFloat(parts[2]) || 500;
}

/**
 * Get the px-per-mm ratio from the SVG viewBox and DOM size.
 */
export async function getPxPerMm(page: Page): Promise<number> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');
  const viewBoxWidth = await getViewBoxWidth(page);
  return box.width / viewBoxWidth;
}

/**
 * Click on the canvas at mm coordinates.
 * Uses locator.click() to correctly handle CSS zoom/transforms.
 */
export async function clickCanvas(page: Page, xMm: number, yMm: number): Promise<void> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');

  const viewBoxWidth = await getViewBoxWidth(page);
  const pxPerMm = box.width / viewBoxWidth;
  const localX = xMm * pxPerMm;
  const localY = yMm * pxPerMm;

  expect(localX).toBeGreaterThanOrEqual(0);
  expect(localX).toBeLessThanOrEqual(box.width);
  expect(localY).toBeGreaterThanOrEqual(0);
  expect(localY).toBeLessThanOrEqual(box.height);

  await svg.click({ position: { x: localX, y: localY }, force: true });
  await page.waitForTimeout(200); // click debounce
}

/**
 * Get the status bar text.
 */
export async function getStatusText(page: Page): Promise<string> {
  return page.locator('[data-testid="status-bar"]').innerText();
}

/**
 * Wait for the status bar to contain text.
 */
export async function waitForStatus(page: Page, text: string | RegExp): Promise<void> {
  const locator = page.locator('[data-testid="status-bar"]');
  if (typeof text === 'string') {
    await expect(locator).toContainText(text, { timeout: 5000 });
  } else {
    await expect(locator).toHaveText(text, { timeout: 5000 });
  }
}

/**
 * Click on a piece at mm coordinates and assert context actions appear.
 * If context actions are already visible (piece auto-selected after placement),
 * returns immediately — clicking again would enter edit mode and hide them.
 * Retries once with a slight offset if the first click misses.
 */
export async function selectPieceAt(page: Page, xMm: number, yMm: number): Promise<void> {
  const ctx = page.locator('[data-testid="context-actions"]');

  // Already selected (e.g. auto-selected after placement) — don't re-click
  if (await ctx.isVisible({ timeout: 300 }).catch(() => false)) return;

  await clickCanvas(page, xMm, yMm);
  await page.waitForTimeout(300);

  if (await ctx.isVisible({ timeout: 500 }).catch(() => false)) return;

  // Retry with slight offset (piece may be slightly off)
  await clickCanvas(page, xMm + 5, yMm + 3);
  await page.waitForTimeout(300);

  await expect(ctx).toBeVisible({ timeout: 2000 });
}

/**
 * Select a piece by ID without opening the inline editor.
 * Useful for calcul/reponse/etiquette pieces which always open the editor on click.
 * Dispatches a custom event that App.tsx listens for (test-only).
 */
export async function selectPieceById(page: Page, pieceId: string): Promise<void> {
  await page.evaluate((id) => {
    window.dispatchEvent(new CustomEvent('test-select-piece', { detail: { id } }));
  }, pieceId);
  await page.waitForTimeout(200);

  const ctx = page.locator('[data-testid="context-actions"]');
  await expect(ctx).toBeVisible({ timeout: 2000 });
}

/**
 * Select a tool by clicking its toolbar button.
 * Handles inline tools, category popovers, and mode expansion.
 */
export async function selectTool(page: Page, tool: string): Promise<void> {
  const btn = page.locator(`[data-testid="tool-${tool}"]`);

  // 1. Tool directly visible (inline)
  if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(100);
    return;
  }

  // 2. Try expanding toolbar ("Voir tout" → switches to Complet mode)
  const moreBtn = page.locator('[data-testid="toolbar"] button[aria-label="Plus d\'outils"]');
  if (await moreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await moreBtn.click();
    await page.waitForTimeout(200);
  }

  // 3. Tool visible after expansion
  if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(100);
    return;
  }

  // 4. Tool is in a category popover — click through group buttons
  const groups = page.locator('[data-testid^="group-"]');
  const groupCount = await groups.count();
  for (let i = 0; i < groupCount; i++) {
    await groups.nth(i).click();
    await page.waitForTimeout(200);
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(100);
      return;
    }
  }

  // 5. Mobile toolbar drawer — click "Plus d'outils" on mobile-toolbar
  const mobilePlus = page.locator('[data-testid="mobile-toolbar"] button[aria-label="Plus d\'outils"]');
  if (await mobilePlus.isVisible({ timeout: 500 }).catch(() => false)) {
    await mobilePlus.click();
    await page.waitForTimeout(300);
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(100);
      return;
    }
  }

  throw new Error(`Tool "${tool}" not found in toolbar, popovers, or mobile drawer`);
}

/**
 * Count SVG pieces of a given type on the canvas.
 */
export async function countPieces(page: Page, selector: string): Promise<number> {
  return page.locator(`[data-testid="canvas-svg"] ${selector}`).count();
}

/**
 * Dismiss all overlays blocking the canvas:
 * 1. AdultGuide dialog ("Compris — commencer")
 * 2. Tutorial skip ("Passer" button)
 * 3. ProblemSelector (select "Problème libre" or Escape)
 */
export async function dismissOverlays(page: Page): Promise<void> {
  // 1. Adult guide — click "Compris — commencer"
  for (let i = 0; i < 3; i++) {
    const guideBtn = page.locator('button:has-text("Compris")');
    if (await guideBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await guideBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 2. Tutorial skip — click "Passer" button in status bar
  for (let i = 0; i < 3; i++) {
    const skipBtn = page.locator('button:has-text("Passer")');
    if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Problem selector — pick "Problème libre" button or press Escape
  const libreBtn = page.locator('button:has-text("Problème libre")');
  if (await libreBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await libreBtn.click();
    await page.waitForTimeout(300);
  } else {
    // Try Escape to close any remaining dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

/**
 * Navigate to a URL and make sure the app is ready (canvas visible, overlays dismissed).
 */
export async function navigateAndReady(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);
  await dismissOverlays(page);
}

/**
 * Open the Settings panel by clicking the gear button.
 */
export async function openSettings(page: Page): Promise<void> {
  await page.locator('button[aria-label="Paramètres"]').click();
  await page.waitForSelector('[role="dialog"][aria-label="Paramètres"]', { timeout: 3000 });
  await page.waitForTimeout(200);
}

/**
 * Close the Settings panel by clicking "Fermer".
 */
export async function closeSettings(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"][aria-label="Paramètres"]');
  const fermerBtn = dialog.locator('button:has-text("Fermer")');
  await fermerBtn.scrollIntoViewIfNeeded();
  await fermerBtn.click();
  await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
}

/**
 * Open the Problem selector by clicking "Problèmes" button.
 */
export async function openProblemSelector(page: Page): Promise<void> {
  await page.locator('[data-testid="toolbar"] button:has-text("Problèmes")').click();
  await page.waitForSelector('[role="dialog"][aria-label="Banque de problèmes"]', { timeout: 3000 });
  await page.waitForTimeout(200);
}

/**
 * Open the Slot Manager by clicking "Modélisations" button.
 */
export async function openSlotManager(page: Page): Promise<void> {
  await page.locator('[data-testid="action-bar"] button:has-text("Mes travaux")').click();
  await page.waitForSelector('[role="dialog"][aria-label="Mes travaux"]', { timeout: 3000 });
  await page.waitForTimeout(200);
}
