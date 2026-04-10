/**
 * Documentation screenshots — RésoMolo
 *
 * Generates the images referenced in:
 *   - public/docs/guide-enseignant.html
 *   - public/docs/aide-memoire-enfant.html
 *
 * Run:
 *   npx playwright test e2e/doc-screenshots.spec.ts --project='Desktop Chrome'
 *
 * Output:
 *   public/docs/images/guide-*.png
 *   public/docs/images/aide-memoire-*.png
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import {
  clickCanvas,
  selectTool,
  dismissOverlays,
  navigateAndReady,
  openProblemSelector,
  openSettings,
} from './helpers/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'public', 'docs', 'images');
const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function img(name: string) {
  return path.join(IMG_DIR, name);
}

/** Read a .resomolo fixture and return the UndoManager structure. */
async function readFixture(fixtureName: string) {
  const fixturePath = path.join(FIXTURE_DIR, fixtureName);
  const json = await fs.readFile(fixturePath, 'utf-8');
  const data = JSON.parse(json);
  return {
    past: [],
    current: {
      probleme: data.probleme || '',
      problemeReadOnly: data.problemeReadOnly ?? false,
      problemeHighlights: data.problemeHighlights || [],
      referenceUnitMm: data.referenceUnitMm || 60,
      pieces: data.pieces || [],
      availablePieces: data.availablePieces ?? null,
    },
    future: [],
  };
}

/**
 * Load a .resomolo fixture by dispatching a RESTORE action directly into
 * the React app via a custom event (same pattern as selectPieceById helper).
 */
async function loadWithFixture(page: Page, fixtureName: string): Promise<void> {
  const undoManager = await readFixture(fixtureName);

  // Navigate and get app ready
  await navigateAndReady(page);

  // Dispatch RESTORE via custom event to inject the fixture state
  await page.evaluate((um) => {
    window.dispatchEvent(new CustomEvent('test-restore', { detail: um }));
  }, undoManager);
  await page.waitForTimeout(500);
}

/**
 * Take a clipped screenshot around a locator with configurable padding.
 */
async function screenshotElement(
  page: Page,
  locator: ReturnType<Page['locator']>,
  filepath: string,
  padding = { top: 4, right: 4, bottom: 4, left: 4 },
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Element not found for screenshot: ${filepath}`);
  const vp = page.viewportSize()!;
  const clip = {
    x: Math.max(0, box.x - padding.left),
    y: Math.max(0, box.y - padding.top),
    width: Math.min(vp.width - Math.max(0, box.x - padding.left), box.width + padding.left + padding.right),
    height: Math.min(vp.height - Math.max(0, box.y - padding.top), box.height + padding.top + padding.bottom),
  };
  await page.screenshot({ path: filepath, clip });
}

// ─────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────

test.describe('Documentation screenshots', () => {

  test.describe.configure({ mode: 'serial' });

  // ═══════ GUIDE ENSEIGNANT: vue d'ensemble (with pieces) ═══════

  test('guide: vue d\'ensemble de l\'interface', async ({ page }) => {
    await loadWithFixture(page, 'doc-modelisation.resomolo');
    await page.screenshot({ path: img('guide-vue-ensemble.png') });
  });

  // ═══════ GUIDE ENSEIGNANT: sélecteur de mode ═══════

  test('guide: sélecteur de mode', async ({ page }) => {
    await navigateAndReady(page);

    // Open the mode selector dropdown
    const modeSelector = page.locator('[data-testid="mode-selector"]');
    await expect(modeSelector).toBeVisible({ timeout: 5000 });
    await modeSelector.click();
    await page.waitForTimeout(300);

    // Screenshot the dropdown area
    await screenshotElement(page, modeSelector, img('guide-mode-selector.png'), { top: 4, right: 8, bottom: 60, left: 8 });
  });

  // ═══════ GUIDE ENSEIGNANT: barre de statut ═══════

  test('guide: barre de statut', async ({ page }) => {
    await navigateAndReady(page);

    const statusBar = page.locator('[data-testid="status-bar"]');
    await expect(statusBar).toBeVisible({ timeout: 5000 });
    await screenshotElement(page, statusBar, img('guide-barre-statut.png'), { top: 4, right: 8, bottom: 4, left: 8 });
  });

  // ═══════ GUIDE ENSEIGNANT: panneau Lien & QR code ═══════

  test('guide: panneau Lien & QR code', async ({ page }) => {
    await loadWithFixture(page, 'doc-modelisation.resomolo');

    // Open Partager menu then click "Lien & QR code"
    const partagerBtn = page.locator('button[aria-label="Partager"]');
    await partagerBtn.click();
    await page.waitForTimeout(300);
    const lienBtn = page.locator('button:has-text("Lien & QR code")');
    await lienBtn.click();
    await page.waitForTimeout(500);

    // Replace localhost URL with production URL for cleaner screenshot
    await page.evaluate(() => {
      document.querySelectorAll('input[readonly]').forEach(input => {
        const el = input as HTMLInputElement;
        if (el.value.includes('localhost')) {
          el.value = el.value.replace(/http:\/\/localhost:\d+/, 'https://resomolo.ca');
        }
      });
    });
    await page.waitForTimeout(100);

    // Screenshot the share panel dialog (in the fixed overlay)
    const vp = page.viewportSize()!;
    await page.screenshot({
      path: img('guide-share-panel.png'),
      clip: { x: vp.width / 2 - 240, y: vp.height / 2 - 200, width: 480, height: 400 },
    });
  });

  // ═══════ GUIDE ENSEIGNANT: menu Partager ouvert ═══════

  test('guide: menu Partager', async ({ page }) => {
    await loadWithFixture(page, 'doc-modelisation.resomolo');

    // Click "Partager" button to open the share menu
    const partagerBtn = page.locator('button[aria-label="Partager"]');
    await expect(partagerBtn).toBeVisible({ timeout: 5000 });
    await partagerBtn.click();
    await page.waitForTimeout(300);

    // Screenshot the bottom-right area showing the share menu
    const actionBar = page.locator('[data-testid="action-bar"]');
    await screenshotElement(page, actionBar, img('guide-partager-menu.png'), { top: 60, right: 8, bottom: 8, left: 8 });
  });

  // ═══════ GUIDE ENSEIGNANT: banque de problèmes ═══════

  test('guide: banque de problèmes', async ({ page }) => {
    await navigateAndReady(page);

    await openProblemSelector(page);
    const dialog = page.locator('[role="dialog"][aria-label="Banque de problèmes"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await screenshotElement(page, dialog, img('guide-banque-problemes.png'), { top: 8, right: 8, bottom: 8, left: 8 });
  });

  // ═══════ GUIDE ENSEIGNANT: paramètres / profils ═══════

  test('guide: paramètres et profils', async ({ page }) => {
    await navigateAndReady(page);

    await openSettings(page);
    const dialog = page.locator('[role="dialog"][aria-label="Paramètres"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await screenshotElement(page, dialog, img('guide-profils-rapides.png'), { top: 8, right: 8, bottom: 8, left: 8 });
  });

  // ═══════ AIDE-MÉMOIRE — Carte 1: zone problème surlignée ═══════

  test('aide-mémoire: zone problème surlignée', async ({ page }) => {
    await loadWithFixture(page, 'doc-modelisation.resomolo');

    // Try specific testid for problem zone, fallback to top clip
    const problemZone = page.locator('[data-testid="problem-zone"]');
    if (await problemZone.isVisible({ timeout: 2000 }).catch(() => false)) {
      await screenshotElement(page, problemZone, img('aide-memoire-surlignage.png'), { top: 8, right: 8, bottom: 8, left: 8 });
    } else {
      // Clip top portion of viewport where problem zone + status bar sit
      const vp = page.viewportSize()!;
      await page.screenshot({
        path: img('aide-memoire-surlignage.png'),
        clip: { x: 0, y: 0, width: vp.width, height: 140 },
      });
    }
  });

  // ═══════ AIDE-MÉMOIRE — Carte 2: barre d'outils ═══════

  test('aide-mémoire: barre d\'outils', async ({ page }) => {
    await navigateAndReady(page);

    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
    await screenshotElement(page, toolbar, img('aide-memoire-toolbar.png'), { top: 4, right: 8, bottom: 4, left: 8 });
  });

  // ═══════ AIDE-MÉMOIRE — Carte 3: modélisation en cours ═══════

  test('aide-mémoire: modélisation en cours', async ({ page }) => {
    await loadWithFixture(page, 'doc-modelisation.resomolo');

    const canvas = page.locator('[data-testid="canvas-svg"]');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    await screenshotElement(page, canvas, img('aide-memoire-modelisation.png'), { top: 8, right: 8, bottom: 8, left: 8 });
  });

});
