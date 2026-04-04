/**
 * Tests e2e — Bouton Ranger + Modification du problème
 *
 * Run:   npx playwright test e2e/ranger-and-edit-problem.spec.ts
 */
import { test, expect } from '@playwright/test';
import {
  clickCanvas,
  selectTool,
  dismissOverlays,
  openProblemSelector,
} from './helpers/canvas';

test.describe('Bouton Ranger', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('keyval-store');
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('[data-testid="canvas-svg"]');
    await page.waitForTimeout(500);
    await dismissOverlays(page);
    await page.waitForTimeout(500);
    await dismissOverlays(page);
    await page.waitForSelector('[data-testid="toolbar"]', { state: 'visible', timeout: 5000 });
  });

  test('bouton Ranger absent quand le canvas est vide', async ({ page }) => {
    const ranger = page.locator('button[aria-label="Ranger les pièces"]');
    await expect(ranger).not.toBeVisible();
  });

  test('bouton Ranger visible et lisible après placement de pièces', async ({ page }) => {
    await selectTool(page, 'jeton');
    await clickCanvas(page, 100, 80);
    await page.waitForTimeout(300);

    const ranger = page.locator('button[aria-label="Ranger les pièces"]');
    await expect(ranger).toBeVisible({ timeout: 3000 });

    // Vérifier que le texte "Ranger" est visible dans le bouton
    await expect(ranger).toContainText('Ranger');

    // Vérifier la taille minimale du bouton (48px hauteur minimum pour TDC)
    const box = await ranger.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    expect(box!.width).toBeGreaterThanOrEqual(56);
  });
});

test.describe('Modification du problème', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('keyval-store');
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('[data-testid="canvas-svg"]');
    await page.waitForTimeout(500);
    await dismissOverlays(page);
    await page.waitForTimeout(500);
    await dismissOverlays(page);
    await page.waitForSelector('[data-testid="toolbar"]', { state: 'visible', timeout: 5000 });
  });

  test('bouton Modifier visible en mode expanded sur un problème prédéfini', async ({ page }) => {
    // Ouvrir la banque de problèmes et sélectionner un problème prédéfini
    await openProblemSelector(page);
    const preset = page.locator('[role="dialog"][aria-label="Banque de problèmes"] button:has-text("Pommes de Léa")');
    await expect(preset).toBeVisible({ timeout: 3000 });
    await preset.click();
    await page.waitForTimeout(500);

    // Le problème devrait être affiché en compact — cliquer pour ouvrir en expanded
    const problemZone = page.locator('[data-testid="problem-zone"]');
    await expect(problemZone).toBeVisible({ timeout: 3000 });
    await problemZone.click();
    await page.waitForTimeout(300);

    // Vérifier que le bouton Modifier est visible en mode expanded
    const editBtn = page.locator('button[aria-label="Modifier le problème"]');
    await expect(editBtn).toBeVisible({ timeout: 3000 });
  });

  test('cliquer Modifier ouvre le textarea et permet de changer le texte', async ({ page }) => {
    // Sélectionner un problème prédéfini
    await openProblemSelector(page);
    const preset = page.locator('[role="dialog"][aria-label="Banque de problèmes"] button:has-text("Pommes de Léa")');
    await preset.click();
    await page.waitForTimeout(500);

    // Ouvrir en mode expanded
    const problemZone = page.locator('[data-testid="problem-zone"]');
    await expect(problemZone).toBeVisible({ timeout: 3000 });
    await problemZone.click();
    await page.waitForTimeout(300);

    // Cliquer le bouton Modifier
    const editBtn = page.locator('button[aria-label="Modifier le problème"]');
    await expect(editBtn).toBeVisible({ timeout: 3000 });
    await editBtn.click();
    await page.waitForTimeout(300);

    // Le textarea devrait apparaître
    const textarea = page.locator('[data-testid="problem-zone"] textarea');
    await expect(textarea).toBeVisible({ timeout: 3000 });

    // Modifier le texte
    await textarea.fill('Camille a 20 billes.');
    await textarea.press('Enter');
    await page.waitForTimeout(300);

    // Vérifier que le texte a été mis à jour
    await expect(problemZone).toContainText('Camille a 20 billes.');
  });
});
