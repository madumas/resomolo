/**
 * Regenerate catalogue piece images with better framing.
 *
 * Run:
 *   npx playwright test e2e/catalogue-images.spec.ts --project='Desktop Chrome'
 *
 * Output:
 *   public/docs/images/catalogue-*.png  (overwritten)
 *   public/docs/images/exemple-jeton.png (overwritten)
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page, type Locator } from '@playwright/test';
import { dismissOverlays, navigateAndReady } from './helpers/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'public', 'docs', 'images');
const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function img(name: string) { return path.join(IMG_DIR, name); }

async function readFixture(name: string) {
  const json = await fs.readFile(path.join(FIXTURE_DIR, name), 'utf-8');
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

async function loadFixture(page: Page, fixtureName: string): Promise<void> {
  const um = await readFixture(fixtureName);
  await navigateAndReady(page);
  await page.evaluate((u) => {
    window.dispatchEvent(new CustomEvent('test-restore', { detail: u }));
  }, um);
  await page.waitForTimeout(600);
}

/**
 * Screenshot the SVG canvas cropped tightly around visible piece content.
 * Uses the bounding box of all SVG children to determine the crop area.
 */
async function screenshotPieces(page: Page, filepath: string, padding = 12): Promise<void> {
  const canvas = page.locator('[data-testid="canvas-svg"]');
  await expect(canvas).toBeVisible({ timeout: 5000 });

  // Get bounding box of all piece elements within the SVG
  const cropBox = await page.evaluate((pad) => {
    const svg = document.querySelector('[data-testid="canvas-svg"]');
    if (!svg) return null;
    const svgRect = svg.getBoundingClientRect();

    // Find all piece groups (they have data-piece-id or similar)
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
    // Constrain to viewport
    const vp = page.viewportSize()!;
    cropBox.width = Math.min(cropBox.width, vp.width - cropBox.x);
    cropBox.height = Math.min(cropBox.height, vp.height - cropBox.y);
    await page.screenshot({ path: filepath, clip: cropBox });
  } else {
    // Fallback: screenshot whole canvas
    const box = await canvas.boundingBox();
    if (box) {
      await page.screenshot({ path: filepath, clip: box });
    }
  }
}

// ─────────────────────────────────────────────────────────

test.describe('Catalogue image generation', () => {
  test.describe.configure({ mode: 'serial' });

  test('catalogue-jeton', async ({ page }) => {
    await loadFixture(page, 'catalogue-jeton.resomolo');
    await screenshotPieces(page, img('catalogue-jeton.png'));
  });

  test('exemple-jeton (8 bleus + 5 rouges + calcul + réponse)', async ({ page }) => {
    await loadFixture(page, 'catalogue-jeton.resomolo');
    // Add calcul and réponse for the example
    await page.evaluate(() => {
      const um = {
        past: [],
        current: {
          probleme: '',
          problemeReadOnly: false,
          problemeHighlights: [],
          referenceUnitMm: 60,
          pieces: [
            // 8 blue tokens in 2 rows of 4, spacing 15mm
            {id:'b1',type:'jeton',x:20,y:20,locked:false,couleur:'bleu',parentId:null},
            {id:'b2',type:'jeton',x:35,y:20,locked:false,couleur:'bleu',parentId:null},
            {id:'b3',type:'jeton',x:50,y:20,locked:false,couleur:'bleu',parentId:null},
            {id:'b4',type:'jeton',x:65,y:20,locked:false,couleur:'bleu',parentId:null},
            {id:'b5',type:'jeton',x:20,y:35,locked:false,couleur:'bleu',parentId:null},
            {id:'b6',type:'jeton',x:35,y:35,locked:false,couleur:'bleu',parentId:null},
            {id:'b7',type:'jeton',x:50,y:35,locked:false,couleur:'bleu',parentId:null},
            {id:'b8',type:'jeton',x:65,y:35,locked:false,couleur:'bleu',parentId:null},
            // 5 red tokens in 1 row, spacing 15mm
            {id:'r1',type:'jeton',x:100,y:20,locked:false,couleur:'rouge',parentId:null},
            {id:'r2',type:'jeton',x:115,y:20,locked:false,couleur:'rouge',parentId:null},
            {id:'r3',type:'jeton',x:130,y:20,locked:false,couleur:'rouge',parentId:null},
            {id:'r4',type:'jeton',x:145,y:20,locked:false,couleur:'rouge',parentId:null},
            {id:'r5',type:'jeton',x:160,y:20,locked:false,couleur:'rouge',parentId:null},
            // Calcul
            {id:'c1',type:'calcul',x:30,y:55,locked:false,expression:'8 + 5 = 13'},
            // Réponse
            {id:'rep',type:'reponse',x:130,y:55,locked:false,text:'Léo a 13 billes en tout.',template:null},
          ],
          availablePieces: null,
        },
        future: [],
      };
      window.dispatchEvent(new CustomEvent('test-restore', { detail: um }));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-jeton.png'));
  });

  test('catalogue-barre', async ({ page }) => {
    await loadFixture(page, 'catalogue-barre.resomolo');
    await screenshotPieces(page, img('catalogue-barre.png'));
  });

  test('catalogue-boite', async ({ page }) => {
    await loadFixture(page, 'catalogue-boite.resomolo');
    await screenshotPieces(page, img('catalogue-boite.png'));
  });

  test('catalogue-fleche', async ({ page }) => {
    await loadFixture(page, 'catalogue-fleche.resomolo');
    await screenshotPieces(page, img('catalogue-fleche.png'));
  });

  test('exemple-barre', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 40, pieces: [
          {id:'b1',type:'barre',x:40,y:20,locked:false,couleur:'bleu',sizeMultiplier:3.5,label:'Léa',value:'14',divisions:null,coloredParts:[],showFraction:false,groupId:null,groupLabel:null},
          {id:'b2',type:'barre',x:40,y:55,locked:false,couleur:'rouge',sizeMultiplier:2.25,label:'Maxime',value:'9',divisions:null,coloredParts:[],showFraction:false,groupId:null,groupLabel:null},
          {id:'c1',type:'calcul',x:40,y:100,locked:false,expression:'14 − 9 = 5'},
          {id:'rep',type:'reponse',x:140,y:100,locked:false,text:'Léa a 5 billes de plus.',template:null},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-barre.png'));
  });

  test('exemple-calcul', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'c1',type:'calcul',x:20,y:20,locked:false,expression:'28 × 4 = 112'},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-calcul.png'));
  });

  test('catalogue-reponse', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'rep',type:'reponse',x:20,y:20,locked:false,text:'Mia a 5 autocollants de plus que Noah.',template:null},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-reponse.png'));
  });

  test('exemple-reponse', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'rep',type:'reponse',x:20,y:20,locked:false,text:'En tout, il y a 24 bonbons.',template:null},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-reponse.png'));
  });

  test('exemple-etiquette', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'box1',type:'boite',x:20,y:25,locked:false,width:50,height:40,label:'',value:'',couleur:'bleu'},
          {id:'box2',type:'boite',x:100,y:25,locked:false,width:50,height:40,label:'',value:'',couleur:'rouge'},
          {id:'e1',type:'etiquette',x:25,y:12,locked:false,text:'Léo',attachedTo:null},
          {id:'e2',type:'etiquette',x:105,y:12,locked:false,text:'Grand-mère',attachedTo:null},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-etiquette.png'));
  });

  test('exemple-inconnue', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 40, pieces: [
          {id:'b1',type:'barre',x:40,y:20,locked:false,couleur:'bleu',sizeMultiplier:3.5,label:'Léa',value:'14',divisions:null,coloredParts:[],showFraction:false,groupId:null,groupLabel:null},
          {id:'b2',type:'barre',x:40,y:55,locked:false,couleur:'rouge',sizeMultiplier:2.25,label:'Maxime',value:'9',divisions:null,coloredParts:[],showFraction:false,groupId:null,groupLabel:null},
          {id:'inc',type:'inconnue',x:115,y:42,locked:false,text:'?',attachedTo:null},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-inconnue.png'));
  });

  test('exemple-fleche', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'j1',type:'jeton',x:25,y:35,locked:false,couleur:'bleu',parentId:null},
          {id:'j2',type:'jeton',x:135,y:35,locked:false,couleur:'rouge',parentId:null},
          {id:'e1',type:'etiquette',x:15,y:18,locked:false,text:'Léo',attachedTo:null},
          {id:'e2',type:'etiquette',x:125,y:18,locked:false,text:'Mia',attachedTo:null},
          {id:'f1',type:'fleche',x:0,y:0,locked:false,fromId:'j1',toId:'j2',label:'donne 5'},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-fleche.png'));
  });

  test('exemple-tableau', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'t1',type:'tableau',x:20,y:15,locked:false,rows:4,cols:2,
           cells:[['Jour','Nb'],['Lun','12'],['Mar','8'],['Mer','5']],
           headerRow:true},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-tableau.png'));
  });

  test('catalogue-tableau', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [
          {id:'t1',type:'tableau',x:20,y:15,locked:false,rows:2,cols:3,
           cells:[['—','—','—'],['','','']],
           headerRow:true},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-tableau.png'));
  });

  test('exemple-boite (4 sacs × 6 bonbons + calcul + réponse)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      // 4 boîtes de 6 jetons chacune, bien espacées
      const pieces: any[] = [];
      const colors = ['bleu', 'rouge', 'rouge', 'rouge'] as const;
      for (let b = 0; b < 4; b++) {
        const bx = 20 + b * 65;
        const by = 15;
        const boxId = `box-${b}`;
        pieces.push({id: boxId, type: 'boite', x: bx, y: by, locked: false, width: 55, height: 45, label: b === 0 ? 'sac 1' : '', value: '', couleur: colors[b]});
        // 6 jetons in 2 rows of 3, spacing 17mm
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            pieces.push({id: `j-${b}-${r}-${c}`, type: 'jeton', x: bx + 10 + c * 17, y: by + 10 + r * 17, locked: false, couleur: 'bleu', parentId: boxId});
          }
        }
      }
      pieces.push({id: 'c1', type: 'calcul', x: 30, y: 80, locked: false, expression: '4 × 6 = 24'});
      pieces.push({id: 'rep', type: 'reponse', x: 130, y: 80, locked: false, text: 'En tout, il y a 24 bonbons.', template: null});

      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces, availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-boite.png'));
  });

  test('exemple-schema-comparaison-ex (Léa vs Marc avec écart ?)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: {
          probleme: 'Léa a 14 billes, Marc en a 9. Combien de plus?',
          problemeReadOnly: false, problemeHighlights: [],
          referenceUnitMm: 60,
          pieces: [{
            id: 'schema-comp', type: 'schema', x: 40, y: 25, locked: false,
            gabarit: 'comparaison',
            totalLabel: '?', totalValue: null, referenceWidth: 60,
            bars: [
              { label: 'Léa', value: 14, sizeMultiplier: 1.4, couleur: 'bleu', parts: [] },
              { label: 'Marc', value: 9, sizeMultiplier: 0.9, couleur: 'rouge', parts: [] },
            ],
          }],
          availablePieces: null,
        },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-schema-comparaison-ex.png'));
  });
});
