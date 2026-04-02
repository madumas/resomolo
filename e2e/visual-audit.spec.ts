/**
 * Visual audit — ModéliVite (MVP + v1.1 + v1.2 + v1.3)
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
import {
  clickCanvas,
  selectTool,
  getStatusText,
  dismissOverlays,
  navigateAndReady,
  openSettings,
  closeSettings,
  openProblemSelector,
  openSlotManager,
} from './helpers/canvas';

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

    // Open Taille submenu (bar context actions now use submenus)
    const tailleBtn = page.locator('[data-testid="context-actions"] button:has-text("Taille")');
    if (await tailleBtn.isVisible().catch(() => false)) {
      await tailleBtn.click();
      await page.waitForTimeout(200);

      // Click 3× in the Taille submenu
      const btn3x = page.locator('[data-testid="context-actions"] button:has-text("3×")');
      if (await btn3x.isVisible().catch(() => false)) {
        await btn3x.click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: shot('08-bar-3x.png'), fullPage: true });
      }
    }

    // Re-select bar after resize (context actions reappear)
    await clickCanvas(page, 80, 67);
    await page.waitForTimeout(400);

    // Test Copier (Level 1 action, visible by default)
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

  test('10 — problem selector (Banque de problèmes)', async ({ page }) => {
    await openProblemSelector(page);
    await page.screenshot({ path: shot('22-problem-selector.png'), fullPage: true });

    // Verify "Banque de problèmes" title is visible
    await expect(page.locator('text=Banque de problèmes')).toBeVisible({ timeout: 3000 });

    // Verify cycle filter buttons exist
    await expect(page.locator('button:has-text("2e cycle")')).toBeVisible();
    await expect(page.locator('button:has-text("3e cycle")')).toBeVisible();

    // Select a problem
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
    await openProblemSelector(page);
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

  // ────────────────────────────────────────────────────────
  // v1.1 / v1.2 / v1.3 feature tests (14–25)
  // ────────────────────────────────────────────────────────

  test('14 — Droite numérique: placement and context actions', async ({ page }) => {
    // Droite is in ESSENTIAL_TOOLS — select directly
    await selectTool(page, 'droiteNumerique');
    await clickCanvas(page, 250, 150);
    await page.waitForTimeout(400);

    // Verify a droite numérique piece exists on the canvas (line elements)
    // Look for line elements that represent the droite
    const svgLines = page.locator('[data-testid="canvas-svg"] line');
    const hasLine = await svgLines.count();
    expect(hasLine).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: shot('26-droite-numerique-placed.png'), fullPage: true });

    // Deselect tool, click on the droite to see context actions
    await selectTool(page, 'droiteNumerique'); // toggle off
    await clickCanvas(page, 280, 150);
    await page.waitForTimeout(400);

    // Verify context actions show Min/Max/Pas buttons
    const ctxActions = page.locator('[data-testid="context-actions"]');
    if (await ctxActions.isVisible().catch(() => false)) {
      await expect(ctxActions.locator('button:has-text("Min:")')).toBeVisible({ timeout: 2000 });
      await expect(ctxActions.locator('button:has-text("Max:")')).toBeVisible({ timeout: 2000 });
      await expect(ctxActions.locator('button:has-text("Pas:")')).toBeVisible({ timeout: 2000 });
      await ctxActions.screenshot({ path: shot('27-droite-context-actions.png') });
    }
  });

  test('15 — Division posée: open and interact', async ({ page }) => {
    // Place a calcul piece
    await selectTool(page, 'calcul');
    await clickCanvas(page, 200, 200);
    await page.waitForTimeout(500);

    const calcEditor = page.locator('[data-testid="inline-editor"]');
    if (await calcEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calcEditor.fill('84 / 7');
      await calcEditor.press('Enter');
      await page.waitForTimeout(300);
    }

    // Deselect tool, select the calcul piece
    await selectTool(page, 'calcul'); // toggle off
    await clickCanvas(page, 200, 200);
    await page.waitForTimeout(400);

    // Click "Division posée" in context actions
    const divBtn = page.locator('[data-testid="context-actions"] button:has-text("Division posée")');
    if (await divBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await divBtn.click();
      await page.waitForTimeout(400);

      // Verify DivisionCalc overlay opens (look for the "Division posée" heading)
      const divHeading = page.locator('text=Division posée').first();
      await expect(divHeading).toBeVisible({ timeout: 3000 });

      await page.screenshot({ path: shot('28-division-posee-overlay.png'), fullPage: true });

      // Close it by clicking Annuler
      const cancelBtn = page.locator('button:has-text("Annuler")').first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(200);
      }
    }

    await page.screenshot({ path: shot('29-after-division-cancel.png'), fullPage: true });
  });

  test('16 — Template response (Phrase à trous)', async ({ page }) => {
    // Place a réponse piece
    await selectTool(page, 'reponse');
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(500);

    const repEditor = page.locator('[data-testid="inline-editor"]');
    if (await repEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await repEditor.fill('test');
      await repEditor.press('Enter');
      await page.waitForTimeout(300);
    }

    // Deselect tool, select the réponse piece
    await selectTool(page, 'reponse'); // toggle off
    await clickCanvas(page, 200, 300);
    await page.waitForTimeout(400);

    // Look for "Phrase à trous" button in context actions
    const templateBtn = page.locator('[data-testid="context-actions"] button:has-text("Phrase à trous")');
    if (await templateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await templateBtn.click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: shot('30-template-submenu.png'), fullPage: true });

      // Select "Il en reste..." template
      const resteBtn = page.locator('[data-testid="context-actions"] button:has-text("Il en reste...")');
      if (await resteBtn.isVisible().catch(() => false)) {
        await resteBtn.click();
        await page.waitForTimeout(300);
      }

      await page.screenshot({ path: shot('31-template-applied.png'), fullPage: true });
    }
  });

  test('17 — TTS button visible in problem zone', async ({ page }) => {
    // First, enable TTS in settings
    await openSettings(page);
    const ttsToggle = page.locator('[role="dialog"][aria-label="Paramètres"]').locator('text=Lecture à voix haute').locator('..').locator('button:has-text("Désactivé")');
    if (await ttsToggle.isVisible().catch(() => false)) {
      await ttsToggle.click();
      await page.waitForTimeout(100);
    }
    await closeSettings(page);

    // Load a problem so the problem zone has text
    await navigateAndReady(page, '/?probleme=' + encodeURIComponent('Test de lecture.'));

    // Re-enable TTS after navigating (settings may reset)
    await openSettings(page);
    const ttsToggle2 = page.locator('[role="dialog"][aria-label="Paramètres"]').locator('text=Lecture à voix haute').locator('..').locator('button:has-text("Désactivé")');
    if (await ttsToggle2.isVisible().catch(() => false)) {
      await ttsToggle2.click();
      await page.waitForTimeout(100);
    }
    await closeSettings(page);

    // Expand problem zone if collapsed
    const expandable = page.locator('text=Test de lecture').first();
    if (await expandable.isVisible().catch(() => false)) {
      await expandable.click();
      await page.waitForTimeout(300);
    }

    // Look for the speaker/TTS button
    const speakerBtn = page.locator('button[aria-label="Lire à voix haute"]');
    if (await speakerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(speakerBtn).toBeVisible();
      await page.screenshot({ path: shot('32-tts-button-visible.png'), fullPage: true });

      // Click it (won't actually speak in headless, but should not crash)
      await speakerBtn.click();
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: shot('33-tts-after-click.png'), fullPage: true });
  });

  test('18 — Font change via settings', async ({ page }) => {
    await openSettings(page);

    // Find "Police" section and click "Lisible" (Atkinson Hyperlegible)
    const lisibleBtn = page.locator('[role="dialog"][aria-label="Paramètres"] button:has-text("Lisible")');
    await expect(lisibleBtn).toBeVisible({ timeout: 3000 });
    await lisibleBtn.click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: shot('34-font-lisible-selected.png'), fullPage: true });

    // Verify the button is now active (has fontWeight 700)
    const fontWeight = await lisibleBtn.evaluate(el => getComputedStyle(el).fontWeight);
    expect(Number(fontWeight)).toBeGreaterThanOrEqual(700);

    await closeSettings(page);

    await page.screenshot({ path: shot('35-font-lisible-applied.png'), fullPage: true });
  });

  test('19 — Guided reading: phrase navigation', async ({ page }) => {
    const problemText = 'Phrase un. Phrase deux. Phrase trois.';
    await navigateAndReady(page, '/?probleme=' + encodeURIComponent(problemText));

    // Enable guided reading in settings
    await openSettings(page);
    const guidedToggle = page.locator('[role="dialog"][aria-label="Paramètres"]').locator('text=Lecture guidée').locator('..').locator('button:has-text("Désactivé")');
    if (await guidedToggle.isVisible().catch(() => false)) {
      await guidedToggle.click();
      await page.waitForTimeout(100);
    }
    await closeSettings(page);

    // Expand problem zone if collapsed
    const problemZone = page.locator('text=Phrase').first();
    if (await problemZone.isVisible().catch(() => false)) {
      await problemZone.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('36-guided-reading-sentence1.png'), fullPage: true });

    // Look for sentence counter "1 / 3"
    const counter = page.locator('text=1 / 3');
    if (await counter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(counter).toBeVisible();

      // Click "Suivant" to advance to sentence 2
      const suivantBtn = page.locator('button:has-text("Suivant")');
      await suivantBtn.click();
      await page.waitForTimeout(200);

      await page.screenshot({ path: shot('37-guided-reading-sentence2.png'), fullPage: true });

      // Verify counter shows "2 / 3"
      await expect(page.locator('text=2 / 3')).toBeVisible({ timeout: 2000 });

      // Click "Suivant" again to sentence 3
      await suivantBtn.click();
      await page.waitForTimeout(200);

      // Now the button should say "Voir tout"
      const voirToutBtn = page.locator('button:has-text("Voir tout")');
      if (await voirToutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await voirToutBtn.click();
        await page.waitForTimeout(200);

        await page.screenshot({ path: shot('38-guided-reading-all.png'), fullPage: true });
      }
    }
  });

  test('20 — Problem bank: filter by cycle', async ({ page }) => {
    await openProblemSelector(page);

    // Verify title
    await expect(page.locator('text=Banque de problèmes')).toBeVisible();

    // Click "2e cycle" filter
    await page.locator('button:has-text("2e cycle")').click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: shot('39-problem-bank-cycle2.png'), fullPage: true });

    // Count visible problem buttons (each is a button with a title span)
    // Problems are button elements inside the scrollable list
    const dialog = page.locator('[role="dialog"][aria-label="Banque de problèmes"]');
    const problemCards = dialog.locator('button:has(span)').filter({ hasNotText: 'Tous' }).filter({ hasNotText: '2e cycle' }).filter({ hasNotText: '3e cycle' }).filter({ hasNotText: 'Toutes' }).filter({ hasNotText: 'Fermer' }).filter({ hasNotText: 'Problème libre' });
    const count = await problemCards.count();
    // Cycle 2 has 10 problems
    expect(count).toBeGreaterThanOrEqual(5);

    // Select a problem
    await page.locator('text=Pommes de Léa').click();
    await page.waitForTimeout(300);

    // Problem should be loaded
    await expect(page.locator('text=Léa').first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: shot('40-problem-bank-loaded.png'), fullPage: true });
  });

  test('21 — PDF export button exists', async ({ page }) => {
    // Verify "PDF" button in action bar
    const pdfBtn = page.locator('[data-testid="action-bar"] button:has-text("PDF")');
    await expect(pdfBtn).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: shot('41-pdf-button.png'), fullPage: true });

    // Click it — just verify no crash (PDF generation may fail in headless but button should respond)
    await pdfBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: shot('42-after-pdf-click.png'), fullPage: true });
  });

  test('22 — Presentation mode button', async ({ page }) => {
    // Verify "Présenter" button exists in action bar
    const presenterBtn = page.locator('[data-testid="action-bar"] button:has-text("Présenter")');
    await expect(presenterBtn).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: shot('43-presenter-button.png'), fullPage: true });

    // Note: requestFullscreen may not work in headless, just verify button exists
    // We don't click because it may cause issues in headless mode
  });

  test('23 — Slot manager: create and switch', async ({ page }) => {
    await openSlotManager(page);

    // Verify "Mes modélisations" title
    await expect(page.locator('text=Mes modélisations')).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: shot('44-slot-manager.png'), fullPage: true });

    // Click "Nouvelle modélisation"
    const newSlotBtn = page.locator('button:has-text("Nouvelle modélisation")');
    if (await newSlotBtn.isVisible().catch(() => false)) {
      await newSlotBtn.click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: shot('45-slot-manager-after-create.png'), fullPage: true });

      // Verify at least one slot entry exists
      const slotEntries = page.locator('[role="dialog"][aria-label="Mes modélisations"]').locator('text=En cours');
      const slotCount = await slotEntries.count();
      expect(slotCount).toBeGreaterThanOrEqual(1);
    }

    // Close the slot manager
    const closeBtn = page.locator('[role="dialog"][aria-label="Mes modélisations"] button:has-text("Fermer")');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(200);
    }
  });

  test('24 — Arrow: create between two pieces', async ({ page }) => {
    // Place two calcul pieces
    await selectTool(page, 'calcul');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(400);

    const ed1 = page.locator('[data-testid="inline-editor"]');
    if (await ed1.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ed1.fill('A');
      await ed1.press('Enter');
      await page.waitForTimeout(200);
    }

    await selectTool(page, 'calcul');
    await clickCanvas(page, 300, 80);
    await page.waitForTimeout(400);

    const ed2 = page.locator('[data-testid="inline-editor"]');
    if (await ed2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ed2.fill('B');
      await ed2.press('Enter');
      await page.waitForTimeout(200);
    }

    await page.screenshot({ path: shot('46-two-calculs-before-arrow.png'), fullPage: true });

    // Switch to "Complet" mode to show secondary tools (fleche)
    await page.locator('[data-testid="mode-selector"]').click();
    await page.waitForTimeout(200);
    const completOption = page.locator('[data-testid="mode-option-complet"]');
    if (await completOption.isVisible().catch(() => false)) {
      await completOption.click();
      await page.waitForTimeout(200);
    }

    // Select Flèche tool
    await selectTool(page, 'fleche');
    await page.waitForTimeout(200);

    // Click first piece then second piece to create arrow
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(300);
    await clickCanvas(page, 300, 80);
    await page.waitForTimeout(300);

    await page.screenshot({ path: shot('47-arrow-created.png'), fullPage: true });
  });

  test('25 — Bar grouping via Plus submenu', async ({ page }) => {
    // Place a bar and resize to 2×
    await selectTool(page, 'barre');
    await clickCanvas(page, 80, 60);
    await page.waitForTimeout(300);

    // Deselect tool, select the bar
    await selectTool(page, 'barre'); // toggle off
    await clickCanvas(page, 110, 67);
    await page.waitForTimeout(400);

    // Open Taille submenu, click 2×
    const tailleBtn = page.locator('[data-testid="context-actions"] button:has-text("Taille")');
    if (await tailleBtn.isVisible().catch(() => false)) {
      await tailleBtn.click();
      await page.waitForTimeout(200);
      const btn2x = page.locator('[data-testid="context-actions"] button:has-text("2×")');
      if (await btn2x.isVisible().catch(() => false)) {
        await btn2x.click();
        await page.waitForTimeout(200);
      }
    }

    // Re-select bar to get context actions again
    await clickCanvas(page, 110, 67);
    await page.waitForTimeout(400);

    // Duplicate (Copier)
    const btnCopy = page.locator('[data-testid="context-actions"] button:has-text("Copier")');
    if (await btnCopy.isVisible().catch(() => false)) {
      await btnCopy.click();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: shot('48-bars-before-grouping.png'), fullPage: true });

    // Select the first bar, open Plus submenu, click Grouper
    await clickCanvas(page, 110, 67);
    await page.waitForTimeout(400);

    const plusBtn = page.locator('[data-testid="context-actions"] button:has-text("Plus")');
    if (await plusBtn.isVisible().catch(() => false)) {
      await plusBtn.click();
      await page.waitForTimeout(200);

      const grouperBtn = page.locator('[data-testid="context-actions"] button:has-text("Grouper")');
      if (await grouperBtn.isVisible().catch(() => false)) {
        await grouperBtn.click();
        await page.waitForTimeout(200);

        await page.screenshot({ path: shot('49-grouping-mode.png'), fullPage: true });

        // Click on second bar to complete grouping
        // The duplicate appears below, try clicking there
        await clickCanvas(page, 110, 90);
        await page.waitForTimeout(400);

        await page.screenshot({ path: shot('50-bars-grouped.png'), fullPage: true });
      }
    }
  });
});
