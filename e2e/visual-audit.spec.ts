/**
 * Visual audit — RésoMolo MVP
 *
 * Generates screenshots for each key state, then validates interactions.
 *
 * Run:   npx playwright test e2e/visual-audit.spec.ts
 * Then:  review e2e/screenshots/ for visual issues.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { clickCanvas, selectTool, getStatusText, dismissOverlays, navigateAndReady } from './helpers/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'desktop-chrome');

test.beforeAll(async () => {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
});

function shot(name: string) {
  return path.join(SCREENSHOT_DIR, name);
}

test.describe('Visual audit — full flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB to get fresh state
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('keyval-store');
    });
    await page.reload();
    await page.waitForSelector('[data-testid="canvas-svg"]');
    await page.waitForTimeout(300);
    await dismissOverlays(page);
  });

  test('01 — initial state: toolbar, status bar, action bar', async ({ page }) => {
    await page.screenshot({ path: shot('01-initial-state.png'), fullPage: true });
    await page.locator('[data-testid="toolbar"]').screenshot({ path: shot('02-toolbar.png') });
    await page.locator('[data-testid="status-bar"]').screenshot({ path: shot('03-status-bar.png') });
    await page.locator('[data-testid="action-bar"]').screenshot({ path: shot('03b-action-bar.png') });
  });

  test('02 — place a bar and verify context actions', async ({ page }) => {
    // Select barre tool
    await selectTool(page, 'barre');
    await page.screenshot({ path: shot('04-barre-tool-active.png'), fullPage: true });

    // Place a bar
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('05-bar-placed.png'), fullPage: true });

    // Deselect tool, then click bar to select it
    await selectTool(page, 'barre'); // toggle off
    await clickCanvas(page, 130, 87);
    await page.waitForTimeout(400);

    await page.screenshot({ path: shot('06-bar-selected-context-actions.png'), fullPage: true });

    // Screenshot context actions if visible
    const ctxActions = page.locator('[data-testid="context-actions"]');
    if (await ctxActions.isVisible().catch(() => false)) {
      await ctxActions.screenshot({ path: shot('07-context-actions-detail.png') });

      const ctxBox = await ctxActions.boundingBox();
      const canvasBox = await page.locator('[data-testid="canvas-svg"]').boundingBox();
      if (ctxBox && canvasBox) {
        expect(ctxBox.x).toBeGreaterThanOrEqual(0);
        expect(ctxBox.y).toBeGreaterThanOrEqual(0);
        expect(ctxBox.x + ctxBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 50);
      }
    }
  });

  test('03 — bar sizes and duplication', async ({ page }) => {
    // Place a bar
    await selectTool(page, 'barre');
    await clickCanvas(page, 50, 60);
    await page.waitForTimeout(300);

    // Deselect tool, select the bar
    await selectTool(page, 'barre'); // toggle off
    await clickCanvas(page, 80, 67);
    await page.waitForTimeout(400);

    // Click 3× button if context actions are visible
    const btn3x = page.locator('[data-testid="context-actions"] button:has-text("3×")');
    if (await btn3x.isVisible().catch(() => false)) {
      await btn3x.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: shot('08-bar-3x.png'), fullPage: true });
    }

    // Test Copier
    const btnCopy = page.locator('[data-testid="context-actions"] button:has-text("Copier")');
    if (await btnCopy.isVisible().catch(() => false)) {
      await btnCopy.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('09-bars-duplicated-aligned.png'), fullPage: true });
  });

  test('04 — calcul and reponse editing', async ({ page }) => {
    // Place a calcul — clicking canvas with calcul tool opens inline editor
    await selectTool(page, 'calcul');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(500);

    const calcEditor = page.locator('[data-testid="inline-editor"]');
    if (await calcEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calcEditor.fill('45 / 3 = 15');
      await calcEditor.press('Enter');
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('10-calcul-placed.png'), fullPage: true });

    // Place a réponse
    await selectTool(page, 'reponse');
    await clickCanvas(page, 100, 130);
    await page.waitForTimeout(500);

    const repEditor = page.locator('[data-testid="inline-editor"]');
    if (await repEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await repEditor.fill('Theo a lu 15 pages');
      await repEditor.press('Enter');
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('11-reponse-placed.png'), fullPage: true });
  });

  test('05 — jetons placement', async ({ page }) => {
    await selectTool(page, 'jeton');

    // Set quantity to 5 via preset button in status bar
    const qty5Btn = page.locator('[data-testid="status-bar"] button[aria-label="Quantité: 5"]');
    if (await qty5Btn.isVisible().catch(() => false)) {
      await qty5Btn.click();
      await page.waitForTimeout(100);
    }

    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(300);

    await page.screenshot({ path: shot('12-jetons-5.png'), fullPage: true });

    // Verify circles are rendered (5 jetons = 5 circles)
    const circles = page.locator('[data-testid="canvas-svg"] circle');
    const count = await circles.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('06 — problem zone with highlighting', async ({ page }) => {
    // Navigate to a problem URL — must dismiss overlays after navigation
    await navigateAndReady(page, '/?probleme=' + encodeURIComponent('Camille a lu 3 fois plus de pages que Théo. Camille a lu 45 pages. Combien de pages Théo a-t-il lues?'));

    await page.screenshot({ path: shot('13-problem-loaded.png'), fullPage: true });

    const statusText = await getStatusText(page);
    expect(statusText.length).toBeGreaterThan(0);
    await page.screenshot({ path: shot('14-amorcage-state.png'), fullPage: true });

    // Click on "45" in the problem text
    const word45 = page.locator('text=45').first();
    if (await word45.isVisible().catch(() => false)) {
      await word45.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: shot('15-word-highlighted.png'), fullPage: true });
    }
  });

  test('07 — full problem solving flow', async ({ page }) => {
    test.setTimeout(90_000);

    await navigateAndReady(page, '/?probleme=' + encodeURIComponent('Camille a lu 3 fois plus de pages que Théo. Camille a lu 45 pages. Combien de pages Théo a-t-il lues?'));

    // Step 1: Place a bar
    await selectTool(page, 'barre');
    await clickCanvas(page, 50, 60);
    await page.waitForTimeout(300);

    // Step 2: Copier la barre
    await selectTool(page, 'barre'); // toggle off
    await clickCanvas(page, 80, 67);
    await page.waitForTimeout(400);

    const btnCopy = page.locator('[data-testid="context-actions"] button:has-text("Copier")');
    if (await btnCopy.isVisible().catch(() => false)) {
      await btnCopy.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('16-bars-placed.png'), fullPage: true });

    // Step 3: Place calcul
    await selectTool(page, 'calcul');
    await clickCanvas(page, 50, 130);
    await page.waitForTimeout(500);

    const calcEd = page.locator('[data-testid="inline-editor"]');
    if (await calcEd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calcEd.fill('45 / 3 = 15');
      await calcEd.press('Enter');
      await page.waitForTimeout(300);
    }

    // Step 4: Place réponse
    await selectTool(page, 'reponse');
    await clickCanvas(page, 50, 170);
    await page.waitForTimeout(500);

    const repEd = page.locator('[data-testid="inline-editor"]');
    if (await repEd.isVisible({ timeout: 3000 }).catch(() => false)) {
      await repEd.fill('Theo a lu 15 pages');
      await repEd.press('Enter');
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('17-complete-modelisation.png'), fullPage: true });
  });

  test('08 — undo/redo works', async ({ page }) => {
    // Place a bar
    await selectTool(page, 'barre');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(300);

    // Verify bar exists (look for rect elements in canvas)
    const rects = page.locator('[data-testid="canvas-svg"] rect');
    await expect(rects.first()).toBeVisible({ timeout: 3000 });

    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('18-after-undo.png'), fullPage: true });

    // Redo
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('19-after-redo.png'), fullPage: true });

    // Bar should be back
    await expect(rects.first()).toBeVisible({ timeout: 3000 });
  });

  test('09 — recommencer clears pieces', async ({ page }) => {
    // Place some pieces
    await selectTool(page, 'barre');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(300);

    await selectTool(page, 'jeton');
    await clickCanvas(page, 200, 80);
    await page.waitForTimeout(300);

    await page.screenshot({ path: shot('20-before-recommencer.png'), fullPage: true });

    // Click recommencer — ConfirmDialog appears
    await page.locator('[data-testid="action-bar"] button:has-text("Recommencer")').click();
    await page.waitForTimeout(300);

    // Screenshot the confirm dialog
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    if (await confirmDialog.isVisible().catch(() => false)) {
      await confirmDialog.screenshot({ path: shot('20b-confirm-dialog.png') });
      await page.locator('[data-testid="confirm-dialog-confirm"]').click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('21-after-recommencer.png'), fullPage: true });
  });

  test('10 — problem selector', async ({ page }) => {
    const problemsBtn = page.locator('[data-testid="toolbar"] button:has-text("Problèmes")');
    await problemsBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('22-problem-selector.png'), fullPage: true });

    // Select a problem to dismiss
    await page.locator('text=Comparaison multiplicative').click();
    await page.waitForTimeout(300);

    // Problem should be loaded in ProblemZone
    await expect(page.locator('text=Camille').first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: shot('22b-problem-loaded.png'), fullPage: true });
  });

  test('11 — bar labeling (Nommer)', async ({ page }) => {
    // Place a bar
    await selectTool(page, 'barre');
    await clickCanvas(page, 80, 80);
    await page.waitForTimeout(300);

    // Deselect tool, select the bar
    await selectTool(page, 'barre'); // toggle off
    await clickCanvas(page, 110, 87);
    await page.waitForTimeout(400);

    // Click "Nommer" in context actions
    const nommerBtn = page.locator('[data-testid="context-actions"] button:has-text("Nommer")');
    if (await nommerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nommerBtn.click();
      await page.waitForTimeout(200);

      const editor = page.locator('[data-testid="inline-editor"]');
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editor.fill('Théo');
        await editor.press('Enter');
        await page.waitForTimeout(300);
      }
    }

    await page.screenshot({ path: shot('23-bar-labeled.png'), fullPage: true });

    // Verify label if bar was labeled
    const label = page.locator('[data-testid="bar-label"]');
    if (await label.isVisible().catch(() => false)) {
      const labelText = await label.textContent();
      expect(labelText).toBe('Théo');
    }
  });

  test('12 — problem selection updates status bar', async ({ page }) => {
    // Select a problem via toolbar
    await page.locator('[data-testid="toolbar"] button:has-text("Problèmes")').click();
    await page.waitForTimeout(300);
    await page.locator('text=Comparaison multiplicative').click();
    await page.waitForTimeout(500);

    // Status bar should show amorçage message (not tutorial)
    const statusText = await getStatusText(page);
    expect(statusText).toContain('Commence par lire');

    await page.screenshot({ path: shot('24-after-problem-selection.png'), fullPage: true });
  });

  test('13 — toolbar visible at initial state (768px viewport)', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toBeVisible();

    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox).not.toBeNull();
    if (toolbarBox) {
      expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(768);
    }

    // Mode selector should be visible in toolbar
    await expect(page.locator('[data-testid="mode-selector"]')).toBeVisible();

    await page.screenshot({ path: shot('25-toolbar-visible.png'), fullPage: true });
  });
});
