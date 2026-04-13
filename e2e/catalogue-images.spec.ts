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
          {id:'inc',type:'inconnue',x:155,y:61,locked:false,text:'?',attachedTo:null},
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
          {id:'t1',type:'tableau',x:20,y:15,locked:false,rows:3,cols:3,
           cells:[['Nom','Âge','Ville'],['Léa','8','Québec'],['Marc','9','Laval']],
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
        const boxLabels = ['sac 1', 'sac 2', 'sac 3', 'sac 4'];
        pieces.push({id: boxId, type: 'boite', x: bx, y: by, locked: false, width: 55, height: 45, label: boxLabels[b], value: '', couleur: colors[b]});
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

  // ═══════ PIÈCES STRUCTURÉES — avec labels pertinents ═══════

  test('catalogue-schema-parties (35 = 20 + 15)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 's1', type: 'schema', x: 40, y: 25, locked: false,
          gabarit: 'parties-tout', totalLabel: '35', totalValue: 35, referenceWidth: 60,
          bars: [{ label: '', value: null, sizeMultiplier: 1.5, couleur: 'bleu',
            parts: [
              { label: 'rouges', value: 20, couleur: 'rouge' },
              { label: 'bleus', value: 15, couleur: 'bleu' },
            ] }],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-schema-parties.png'));
  });

  test('catalogue-schema-comparaison (Léa 14 vs Marc 9)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 's1', type: 'schema', x: 40, y: 25, locked: false,
          gabarit: 'comparaison', totalLabel: '?', totalValue: null, referenceWidth: 60,
          bars: [
            { label: 'Léa', value: 14, sizeMultiplier: 1.5, couleur: 'bleu', parts: [] },
            { label: 'Marc', value: 9, sizeMultiplier: 0.96, couleur: 'rouge', parts: [] },
          ],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-schema-comparaison.png'));
  });

  test('catalogue-schema-groupes (4 × 6)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 's1', type: 'schema', x: 40, y: 15, locked: false,
          gabarit: 'groupes-egaux', totalLabel: '24', totalValue: 24, referenceWidth: 60,
          bars: [
            { label: 'sac 1', value: 6, sizeMultiplier: 1.5, couleur: 'bleu', parts: [] },
            { label: 'sac 2', value: 6, sizeMultiplier: 1.5, couleur: 'bleu', parts: [] },
            { label: 'sac 3', value: 6, sizeMultiplier: 1.5, couleur: 'bleu', parts: [] },
            { label: 'sac 4', value: 6, sizeMultiplier: 1.5, couleur: 'bleu', parts: [] },
          ],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-schema-groupes.png'));
  });

  test('catalogue-schema-transformation (départ 12 → résultat 19)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 's1', type: 'schema', x: 40, y: 25, locked: false,
          gabarit: 'transformation', totalLabel: '19', totalValue: 19, referenceWidth: 60,
          bars: [{ label: '', value: null, sizeMultiplier: 1.5, couleur: 'bleu',
            parts: [
              { label: 'avant', value: 12, couleur: 'bleu' },
              { label: 'ajout', value: 7, couleur: 'vert' },
            ] }],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-schema-transformation.png'));
  });

  test('exemple-schema (parties-tout 35 = 20 + 15)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 's1', type: 'schema', x: 40, y: 25, locked: false,
          gabarit: 'parties-tout', totalLabel: '35', totalValue: 35, referenceWidth: 60,
          bars: [{ label: '', value: null, sizeMultiplier: 1.5, couleur: 'bleu',
            parts: [
              { label: 'rouges', value: 20, couleur: 'rouge' },
              { label: 'bleus', value: 15, couleur: 'bleu' },
            ] }],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('exemple-schema.png'));
  });

  test('catalogue-droite (0 à 20, pas de 1)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 'd1', type: 'droiteNumerique', x: 30, y: 30, locked: false,
          min: 0, max: 20, step: 1, markers: [8, 15], width: 200,
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-droite.png'));
  });

  test('catalogue-arbre (Pile/Face × Rouge/Bleu)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 'a1', type: 'arbre', x: 60, y: 25, locked: false,
          levels: [
            { name: 'Pièce', options: ['Pile', 'Face'] },
            { name: 'Couleur', options: ['Rouge', 'Bleu'] },
          ],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-arbre.png'));
  });

  test('catalogue-diagramme-bandes (Fruits préférés)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 'db1', type: 'diagrammeBandes', x: 15, y: 15, locked: false,
          title: 'Fruits préférés', yAxisLabel: 'Votes',
          width: 120, height: 90,
          categories: [
            { label: 'Pommes', value: 12, couleur: 'bleu' },
            { label: 'Bananes', value: 8, couleur: 'jaune' },
            { label: 'Raisins', value: 5, couleur: 'rouge' },
          ],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-diagramme-bandes.png'));
  });

  test('catalogue-diagramme-ligne (Température)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 60, pieces: [{
          id: 'dl1', type: 'diagrammeLigne', x: 15, y: 15, locked: false,
          title: 'Température', yAxisLabel: '°C',
          width: 120, height: 90,
          points: [
            { label: 'Lun', value: 3 },
            { label: 'Mar', value: 7 },
            { label: 'Mer', value: 5 },
          ],
        }], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-diagramme-ligne.png'));
  });

  test('catalogue-inconnue (barre + marqueur ?)', async ({ page }) => {
    await navigateAndReady(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('test-restore', { detail: {
        past: [], future: [],
        current: { probleme: '', problemeReadOnly: false, problemeHighlights: [], referenceUnitMm: 40, pieces: [
          {id:'b1',type:'barre',x:40,y:30,locked:false,couleur:'bleu',sizeMultiplier:3,label:'Mia',value:'12',divisions:null,coloredParts:[],showFraction:false,groupId:null,groupLabel:null},
          {id:'inc',type:'inconnue',x:110,y:25,locked:false,text:'?',attachedTo:null},
        ], availablePieces: null },
      }}));
    });
    await page.waitForTimeout(600);
    await screenshotPieces(page, img('catalogue-inconnue.png'));
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
