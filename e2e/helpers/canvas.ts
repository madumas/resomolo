import { type Page, expect } from '@playwright/test';

const CANVAS_WIDTH_MM = 500;

/**
 * Get the px-per-mm ratio from the SVG viewBox and DOM size.
 */
export async function getPxPerMm(page: Page): Promise<number> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');
  return box.width / CANVAS_WIDTH_MM;
}

/**
 * Click on the canvas at mm coordinates.
 */
export async function clickCanvas(page: Page, xMm: number, yMm: number): Promise<void> {
  const svg = page.locator('[data-testid="canvas-svg"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('SVG bounding box not found');

  const pxPerMm = box.width / CANVAS_WIDTH_MM;
  const pageX = box.x + xMm * pxPerMm;
  const pageY = box.y + yMm * pxPerMm;

  expect(pageX).toBeGreaterThanOrEqual(box.x);
  expect(pageX).toBeLessThanOrEqual(box.x + box.width);
  expect(pageY).toBeGreaterThanOrEqual(box.y);
  expect(pageY).toBeLessThanOrEqual(box.y + box.height);

  await page.mouse.click(pageX, pageY);
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
 * Select a tool by clicking its toolbar button.
 * Auto-expands the toolbar if the tool is hidden (simplified mode).
 */
export async function selectTool(page: Page, tool: string): Promise<void> {
  const btn = page.locator(`[data-testid="tool-${tool}"]`);
  if (!await btn.isVisible({ timeout: 500 }).catch(() => false)) {
    // Tool is hidden — click ⋯ to expand
    const moreBtn = page.locator('[data-testid="toolbar"] button[aria-label="Plus d\'outils"]');
    if (await moreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(200);
    }
  }
  await btn.click();
  await page.waitForTimeout(100);
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
