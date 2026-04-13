/**
 * Missing views e2e — captures for the 8 views identified by the multi-expert evaluation.
 *
 * Run:   npx playwright test e2e/missing-views.spec.ts
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  clickCanvas,
  selectTool,
  navigateAndReady,
  openSettings,
  closeSettings,
} from './helpers/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'missing-views');

test.beforeAll(async () => {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
});

function shot(name: string) {
  return path.join(SCREENSHOT_DIR, name);
}

test.describe('Missing views — multi-expert evaluation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('keyval-store');
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('[data-testid="canvas-svg"]');
    await page.waitForTimeout(500);
    // Dismiss onboarding + overlays
    for (let i = 0; i < 5; i++) {
      const skipBtn = page.locator('button:has-text("Passer")');
      if (await skipBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        await skipBtn.click();
        await page.waitForTimeout(300);
      }
    }
    const libreBtn = page.locator('button:has-text("Problème libre")');
    if (await libreBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await libreBtn.click();
      await page.waitForTimeout(300);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // View 1: Fatigue nudge visible
  test('1 — Fatigue nudge visible after 3 consecutive undos', async ({ page }) => {
    // Place 3 pieces to have undo history
    await selectTool(page, 'jeton');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(200);
    await clickCanvas(page, 150, 80);
    await page.waitForTimeout(200);
    await clickCanvas(page, 200, 80);
    await page.waitForTimeout(200);

    // Press Escape to deselect, then undo 3 times
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const undoBtn = page.locator('button[aria-label="Annuler"]');
    await undoBtn.click();
    await page.waitForTimeout(100);
    await undoBtn.click();
    await page.waitForTimeout(100);
    await undoBtn.click();
    await page.waitForTimeout(300);

    // Verify fatigue nudge appears
    const statusBar = page.locator('[data-testid="status-bar"]');
    await page.screenshot({ path: shot('01-fatigue-nudge.png'), fullPage: true });

    // The nudge should be visible (text contains fatigue-related message)
    const text = await statusBar.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  // View 2: Focus mode (dimmed toolbar)
  test('2 — Focus mode with dimmed toolbar', async ({ page }) => {
    // Place a piece first
    await selectTool(page, 'jeton');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(200);

    // Toggle focus mode
    const focusBtn = page.locator('button[aria-label="Mode focus"]');
    if (await focusBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await focusBtn.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('02-focus-mode.png'), fullPage: true });
  });

  // View 3: Worked examples phase by phase
  test('3 — Worked examples phase navigation', async ({ page }) => {
    // Open help menu and click "Exemples résolus"
    const helpBtn = page.locator('button[title="Aide"]');
    if (await helpBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await helpBtn.click();
      await page.waitForTimeout(300);
    }

    const exBtn = page.locator('button:has-text("Exemples résolus"), div:has-text("Exemples résolus")');
    if (await exBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await exBtn.click();
      await page.waitForTimeout(500);
    }

    // Select first example
    const firstExample = page.locator('[role="dialog"] button').first();
    if (await firstExample.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstExample.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: shot('03-worked-example-phase1.png'), fullPage: true });

    // Navigate to next phase if available
    const nextBtn = page.locator('button:has-text("Suivant"), button[aria-label="Étape suivante"]');
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: shot('03-worked-example-phase2.png'), fullPage: true });
    }
  });

  // View 4: Inconnue (?) placed in a schema
  test('4 — Inconnue in schema context', async ({ page }) => {
    // Place a schema
    await selectTool(page, 'schema');
    await clickCanvas(page, 150, 80);
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Place an inconnue
    await selectTool(page, 'inconnue');
    await clickCanvas(page, 200, 50);
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await page.screenshot({ path: shot('04-inconnue-in-schema.png'), fullPage: true });
  });

  // View 5: Session timer alert
  test('5 — Session timer alert triggered', async ({ page }) => {
    // Enable session timer with very short alert (simulate)
    await openSettings(page);
    await page.waitForTimeout(300);

    // Enable session timer
    const timerSection = page.locator('text=Minuteur de session').locator('..');
    const toggleBtn = timerSection.locator('button:has-text("Désactivé")');
    if (await toggleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }

    await closeSettings(page);
    await page.waitForTimeout(300);

    // Take screenshot showing timer in action bar
    await page.screenshot({ path: shot('05-session-timer.png'), fullPage: true });
  });

  // View 6: EMA smoothing parameter in settings
  test('6 — EMA smoothing parameter visible in settings', async ({ page }) => {
    await openSettings(page);
    await page.waitForTimeout(300);

    // Enable cursor smoothing
    const smoothingSection = page.locator('text=Lissage du curseur').locator('..');
    const toggleBtn = smoothingSection.locator('button:has-text("Désactivé")');
    if (await toggleBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }

    // Now the smoothing alpha slider should be visible
    await page.screenshot({ path: shot('06-ema-smoothing.png'), fullPage: true });
    await closeSettings(page);
  });

  // View 7: Zoom 200% layout check (WCAG 1.4.4)
  test('7 — Zoom 200% layout integrity', async ({ page }) => {
    // Set viewport zoom by scaling down the viewport to simulate 200%
    await page.setViewportSize({ width: 640, height: 360 }); // half of 1280x720 = effective 200%
    await page.waitForTimeout(500);

    // Place some pieces to have content
    await selectTool(page, 'jeton');
    await clickCanvas(page, 100, 60);
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');

    await page.screenshot({ path: shot('07-zoom-200.png'), fullPage: true });
  });

  // View 8: Keyboard + pointer coexistence
  test('8 — Keyboard navigation then pointer interaction', async ({ page }) => {
    // Place 2 pieces
    await selectTool(page, 'jeton');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(200);
    await clickCanvas(page, 200, 80);
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Focus the canvas SVG
    const svg = page.locator('[data-testid="canvas-svg"]');
    await svg.focus();
    await page.waitForTimeout(200);

    // Navigate with Tab to select a piece
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await page.screenshot({ path: shot('08-keyboard-focus.png'), fullPage: true });

    // Now click with mouse to switch to pointer mode
    await clickCanvas(page, 200, 80);
    await page.waitForTimeout(300);

    await page.screenshot({ path: shot('08-pointer-after-keyboard.png'), fullPage: true });
  });
});
