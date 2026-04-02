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
 */
export async function selectTool(page: Page, tool: string): Promise<void> {
  await page.locator(`[data-testid="tool-${tool}"]`).click();
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
  // 1. Adult guide
  const guide = page.locator('[role="dialog"][aria-label="Guide accompagnateur"]');
  if (await guide.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Compris — commencer' }).click({ timeout: 3000 });
    await page.waitForTimeout(400);
  }

  // 2. Tutorial skip
  const skipBtn = page.locator('[data-testid="status-bar"] button:has-text("Passer")');
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(400);
  }

  // 3. Problem selector — pick "Problème libre" (blank canvas) or press Escape
  const problemSelector = page.locator('text=Problème libre');
  if (await problemSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
    await problemSelector.click();
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
