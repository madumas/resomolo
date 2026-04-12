/**
 * Review screenshots — RésoMolo
 *
 * Generates screenshots for internal review.
 *
 * Run:
 *   npx playwright test e2e/review-screenshots.spec.ts --project='Desktop Chrome'
 *
 * Output:
 *   .review-screenshots/*.png
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import {
  dismissOverlays,
  navigateAndReady,
  selectPieceAt,
} from './helpers/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', '.review-screenshots');
const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function img(name: string) {
  return path.join(IMG_DIR, name);
}

// Default settings matching src/model/types.ts DEFAULT_SETTINGS
const DEFAULT_SETTINGS = {
  toleranceProfile: 'normal',
  toolbarMode: 'essentiel',
  relanceDelayMs: 30000,
  cursorSmoothing: false,
  smoothingAlpha: 0.30,
  sessionTimerEnabled: false,
  sessionTimerAlertMinutes: 20,
  textScale: 1,
  highContrast: false,
  keyboardShortcutsEnabled: false,
  soundMode: 'reduced',
  soundGain: 0.5,
  dominantHand: 'right',
  problemAlwaysVisible: false,
  showSuggestedZones: false,
  showTokenCounter: true,
  fontFamily: 'system',
  letterSpacing: 0,
  ttsEnabled: true,
  ttsRate: 1.0,
  guidedReadingEnabled: false,
  activeProfile: 'custom',
};

/** Read a .resomolo fixture and wrap in UndoManager structure. */
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

/** Load a fixture into the app via test-restore event. */
async function loadWithFixture(page: Page, fixtureName: string): Promise<void> {
  const undoManager = await readFixture(fixtureName);
  await navigateAndReady(page);
  await page.evaluate((um) => {
    window.dispatchEvent(new CustomEvent('test-restore', { detail: um }));
  }, undoManager);
  await page.waitForTimeout(500);
}

/**
 * Write a value into the idb-keyval IndexedDB store directly.
 * idb-keyval uses database "keyval-store" with object store "keyval".
 */
async function setIdbKeyval(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(({ k, v }) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('keyval-store');
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put(v, k);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
      req.onerror = () => reject(req.error);
    });
  }, { k: key, v: value });
}

/** Inject settings into IDB, reload, dismiss overlays, then load fixture. */
async function loadWithSettingsAndFixture(
  page: Page,
  fixtureName: string,
  settingsOverride: Record<string, unknown>,
): Promise<void> {
  const undoManager = await readFixture(fixtureName);
  const settings = { ...DEFAULT_SETTINGS, ...settingsOverride };

  // Navigate first to have a page context for IDB access
  await page.goto('/');
  await page.waitForTimeout(200);

  // Write settings into IDB (same store as idb-keyval)
  await setIdbKeyval(page, 'resomolo_settings', JSON.stringify(settings));

  // Reload so the app boots with injected settings
  await page.reload();
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);
  await dismissOverlays(page);

  await page.evaluate((um) => {
    window.dispatchEvent(new CustomEvent('test-restore', { detail: um }));
  }, undoManager);
  await page.waitForTimeout(500);
}

/** Inject settings into IDB, reload, dismiss overlays (no fixture). */
async function loadWithSettings(
  page: Page,
  settingsOverride: Record<string, unknown>,
): Promise<void> {
  const settings = { ...DEFAULT_SETTINGS, ...settingsOverride };
  await page.goto('/');
  await page.waitForTimeout(200);
  await setIdbKeyval(page, 'resomolo_settings', JSON.stringify(settings));
  await page.reload();
  await page.waitForSelector('[data-testid="canvas-svg"]');
  await page.waitForTimeout(300);
  await dismissOverlays(page);
}

/** Screenshot the canvas content, cropped tightly around pieces. */
async function screenshotPieces(page: Page, filepath: string, padding = 12): Promise<void> {
  const canvas = page.locator('[data-testid="canvas-svg"]');
  await expect(canvas).toBeVisible({ timeout: 5000 });

  const cropBox = await page.evaluate((pad) => {
    const svg = document.querySelector('[data-testid="canvas-svg"]');
    if (!svg) return null;
    const elements = svg.querySelectorAll('g[data-piece-id], circle, rect:not([fill="none"]), text, line, path');
    if (elements.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.left < minX) minX = r.left;
      if (r.top < minY) minY = r.top;
      if (r.right > maxX) maxX = r.right;
      if (r.bottom > maxY) maxY = r.bottom;
    });
    if (minX === Infinity) return null;
    return {
      x: Math.max(0, minX - pad),
      y: Math.max(0, minY - pad),
      width: (maxX - minX) + pad * 2,
      height: (maxY - minY) + pad * 2,
    };
  }, padding);

  if (cropBox && cropBox.width > 20 && cropBox.height > 20) {
    const vp = page.viewportSize()!;
    cropBox.width = Math.min(cropBox.width, vp.width - cropBox.x);
    cropBox.height = Math.min(cropBox.height, vp.height - cropBox.y);
    await page.screenshot({ path: filepath, clip: cropBox });
  } else {
    const box = await canvas.boundingBox();
    if (box) await page.screenshot({ path: filepath, clip: box });
  }
}

// ─────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────

test.describe('Review screenshots', () => {
  test.describe.configure({ mode: 'serial' });

  // ═══════ A. ACCOMMODEMENTS MANQUANTS ═══════

  test('A1 — Police Atkinson Hyperlegible avec contenu', async ({ page }) => {
    await loadWithSettingsAndFixture(page, 'review-canvas-dense.resomolo', {
      fontFamily: 'atkinson',
    });
    await page.screenshot({ path: img('A1-atkinson-hyperlegible.png'), fullPage: true });
  });

  test('A2 — Zones de positionnement suggérées', async ({ page }) => {
    await loadWithSettings(page, {
      showSuggestedZones: true,
    });
    await page.screenshot({ path: img('A2-zones-suggerees.png'), fullPage: true });
  });

  test('A3 — Mode concentré (estompage)', async ({ page }) => {
    await loadWithFixture(page, 'review-canvas-dense.resomolo');

    // Select one bar to highlight it
    await selectPieceAt(page, 100, 35);
    await page.waitForTimeout(300);

    // Toggle focus mode via the action bar button
    const focusBtn = page.locator('button[title*="concentré"], button[title*="estompe"]');
    if (await focusBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await focusBtn.click();
      await page.waitForTimeout(400);
    }

    // Click empty canvas area to deselect piece and hide context actions,
    // so the estompage effect on other pieces is clearly visible
    await page.mouse.click(450, 500);
    await page.waitForTimeout(300);

    // Re-select the bar (without context actions blocking the view)
    await selectPieceAt(page, 100, 35);
    await page.waitForTimeout(200);

    // Close context actions by pressing Escape — keeps selection but hides popup
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await page.screenshot({ path: img('A3-mode-concentre-estompage.png'), fullPage: true });
  });

  test('A4 — Main dominante gauche', async ({ page }) => {
    await loadWithSettingsAndFixture(page, 'review-canvas-dense.resomolo', {
      dominantHand: 'left',
    });
    await page.screenshot({ path: img('A4-main-gauche.png'), fullPage: true });
  });

  test('A5 — Minuteur de session visible', async ({ page }) => {
    await loadWithSettingsAndFixture(page, 'review-canvas-dense.resomolo', {
      sessionTimerEnabled: true,
      sessionTimerAlertMinutes: 0.05,
    });
    // Wait for the timer to tick and potentially alert (3s at 0.05 min)
    await page.waitForTimeout(4000);
    await page.screenshot({ path: img('A5-minuteur-session.png'), fullPage: true });
  });

  test('A6 — Profil Aide + Attention (zones suggérées)', async ({ page }) => {
    await loadWithSettingsAndFixture(page, 'review-canvas-dense.resomolo', {
      toleranceProfile: 'large',
      cursorSmoothing: false,
      relanceDelayMs: 30000,
      soundMode: 'reduced',
      textScale: 1,
      problemAlwaysVisible: true,
      showSuggestedZones: true,
      activeProfile: 'motricite-attention',
    });
    await page.screenshot({ path: img('A6-profil-aide-attention.png'), fullPage: true });
  });

  test('A7 — Profil Aide + Lecture (texte 1.5×)', async ({ page }) => {
    await loadWithSettingsAndFixture(page, 'review-canvas-dense.resomolo', {
      toleranceProfile: 'normal',
      cursorSmoothing: false,
      relanceDelayMs: 30000,
      soundMode: 'full',
      textScale: 1.5,
      problemAlwaysVisible: true,
      activeProfile: 'motricite-lecture',
    });
    await page.screenshot({ path: img('A7-profil-aide-lecture.png'), fullPage: true });
  });

  test('A8 — Problème toujours visible', async ({ page }) => {
    await loadWithSettingsAndFixture(page, 'review-canvas-dense.resomolo', {
      problemAlwaysVisible: true,
    });
    await page.screenshot({ path: img('A8-probleme-toujours-visible.png'), fullPage: true });
  });

  // ═══════ B. SCHÉMAS MANQUANTS ═══════

  test('B1 — Schéma groupes-égaux', async ({ page }) => {
    await loadWithFixture(page, 'review-schema-groupes.resomolo');
    await page.screenshot({ path: img('B1-schema-groupes-egaux.png'), fullPage: true });
  });

  test('B2 — Schéma transformation', async ({ page }) => {
    await loadWithFixture(page, 'review-schema-transformation.resomolo');
    await page.screenshot({ path: img('B2-schema-transformation.png'), fullPage: true });
  });

  test('B3 — Schéma libre', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: {
          probleme: 'Crée ton propre schéma pour résoudre le problème.',
          problemeReadOnly: false,
          problemeHighlights: [],
          referenceUnitMm: 60,
          pieces: [
            {
              id: 'schema-libre',
              type: 'schema',
              x: 40, y: 25, locked: false,
              gabarit: 'libre',
              totalLabel: '',
              totalValue: null,
              referenceWidth: 60,
              bars: [
                { label: 'Léa', value: null, sizeMultiplier: 1.0, couleur: 'bleu',
                  parts: [{ label: '8', value: 8, couleur: 'bleu' }, { label: '4', value: 4, couleur: 'vert' }] },
                { label: 'Marc', value: null, sizeMultiplier: 0.6, couleur: 'rouge',
                  parts: [{ label: '6', value: 6, couleur: 'rouge' }] },
                { label: 'Total', value: null, sizeMultiplier: 1.2, couleur: 'jaune', parts: [] },
              ],
            },
          ],
          availablePieces: null,
        },
      }}));
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: img('B3-schema-libre.png'), fullPage: true });
  });

  // ═══════ C. CALCUL DÉTAILLÉ ═══════

  test('C1 — Soustraction en colonnes avec emprunts', async ({ page }) => {
    await loadWithFixture(page, 'review-comparaison.resomolo');

    // Click near the calcul piece to select it, then find context actions
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await selectPieceAt(page, 80, 120);

    const colBtn = page.locator('[data-testid="context-actions"] button:has-text("En colonnes")');
    if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await colBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: img('C1-soustraction-emprunts.png'), fullPage: true });
  });

  test('C2 — Multiplication en colonnes avec intermédiaires', async ({ page }) => {
    // Create an inline fixture with a multi-digit multiplication (23 × 14)
    // so the column overlay shows intermediate lines
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: {
          probleme: '', problemeReadOnly: false, problemeHighlights: [],
          referenceUnitMm: 60,
          pieces: [{
            id: 'calcul', type: 'calcul', x: 60, y: 40, locked: false,
            expression: '23 × 14 = 322',
            columnData: JSON.stringify({
              op1: ['', '', '', '', '2', '3'],
              op2: ['', '', '', '', '1', '4'],
              result: ['', '', '', '3', '2', '2'],
              carry: ['', '', '', '', '1', ''],
              intermediates: [['', '', '', '', '9', '2'], ['', '', '', '2', '3', '0']],
              operator: '×',
              decimalPosition: null,
              borrow: [false, false, false, false, false, false],
              carryBorrow: [false, false, false, false, false, false],
              addCarry: ['', '', '', '', '', ''],
            }),
          }],
          availablePieces: null,
        },
      }}));
    });
    await page.waitForTimeout(500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await selectPieceAt(page, 80, 50);

    const colBtn = page.locator('[data-testid="context-actions"] button:has-text("En colonnes")');
    if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await colBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: img('C2-multiplication-intermediaires.png'), fullPage: true });
  });

  // ═══════ D. SCÉNARIOS PÉDAGOGIQUES COMPLETS ═══════

  test('D1 — Addition avec jetons', async ({ page }) => {
    await loadWithFixture(page, 'review-addition.resomolo');
    await page.screenshot({ path: img('D1-scenario-addition-jetons.png'), fullPage: true });
  });

  test('D2 — Comparaison avec barres', async ({ page }) => {
    await loadWithFixture(page, 'review-comparaison.resomolo');
    await page.screenshot({ path: img('D2-scenario-comparaison-barres.png'), fullPage: true });
  });

  test('D3 — Multiplication avec groupement', async ({ page }) => {
    await loadWithFixture(page, 'review-multiplication.resomolo');
    await page.screenshot({ path: img('D3-scenario-multiplication-groupes.png'), fullPage: true });
  });

  test('D4 — Division posée', async ({ page }) => {
    await loadWithFixture(page, 'review-division.resomolo');
    await page.screenshot({ path: img('D4-scenario-division.png'), fullPage: true });
  });

  test('D5 — Multi-étapes', async ({ page }) => {
    await loadWithFixture(page, 'review-multi-etapes.resomolo');
    await page.screenshot({ path: img('D5-scenario-multi-etapes.png'), fullPage: true });
  });

  test('D6 — Statistiques', async ({ page }) => {
    await loadWithFixture(page, 'review-stats.resomolo');
    await page.screenshot({ path: img('D6-scenario-statistiques.png'), fullPage: true });
  });

});
