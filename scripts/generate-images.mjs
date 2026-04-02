/**
 * Génère les images statiques requises pour SEO / réseaux sociaux / PWA :
 *   - public/og-image.png        (1200×630, image Open Graph)
 *   - public/favicon-32.png      (32×32)
 *   - public/favicon-16.png      (16×16)
 *   - public/apple-touch-icon.png (180×180)
 *
 * Usage: node scripts/generate-images.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

async function render(html, width, height, outPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const buf = await page.screenshot({ type: 'png', omitBackground: false });
  writeFileSync(outPath, buf);
  await browser.close();
  console.log(`  ✓ ${outPath} (${width}×${height})`);
}

// ── OG Image 1200×630 ──────────────────────────────────────────────
const ogHtml = `<!DOCTYPE html>
<html><head><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width: 1200px; height: 630px;
    background: linear-gradient(135deg, #5b1cb8 0%, #863bff 50%, #a86bff 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: 'Avenir Next','Segoe UI',system-ui,sans-serif;
    color: white;
    overflow: hidden;
  }
  .logo {
    font-size: 96px; letter-spacing: -0.02em;
    margin-bottom: 24px;
  }
  .logo .reso { font-weight: 600; color: rgba(255,255,255,0.85); }
  .logo .molo { font-weight: 800; color: #fff; }
  .tagline {
    font-size: 32px; font-weight: 500;
    color: rgba(255,255,255,0.8);
    text-align: center; max-width: 900px;
    line-height: 1.4;
  }
  .badge {
    position: absolute; bottom: 32px; right: 40px;
    font-size: 18px; font-weight: 500;
    color: rgba(255,255,255,0.5);
  }
  .dots {
    position: absolute; top: 40px; left: 48px;
    display: flex; gap: 12px;
  }
  .dots span {
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(255,255,255,0.2);
  }
</style></head><body>
  <div class="dots"><span></span><span></span><span></span><span></span><span></span></div>
  <div class="logo"><span class="reso">Réso</span><span class="molo">Molo</span></div>
  <div class="tagline">Modélisation visuelle de problèmes mathématiques<br/>pour le primaire au Québec</div>
  <div class="badge">Accessible TDC</div>
</body></html>`;

// ── Favicon / App Icon (shared base) ────────────────────────────────
function iconHtml(size) {
  const fontSize = Math.round(size * 0.6);
  const radius = Math.round(size * 0.22);
  return `<!DOCTYPE html>
<html><head><style>
  * { margin:0; padding:0; }
  body {
    width: ${size}px; height: ${size}px;
    display: flex; align-items: center; justify-content: center;
    background: #7028e0;
    border-radius: ${radius}px;
    font-family: 'Avenir Next','Segoe UI',system-ui,sans-serif;
  }
  .letter {
    font-size: ${fontSize}px;
    font-weight: 800;
    color: white;
    line-height: 1;
  }
</style></head><body>
  <span class="letter">R</span>
</body></html>`;
}

console.log('Generating static images…');

await render(ogHtml, 1200, 630, join(PUBLIC, 'og-image.png'));
await render(iconHtml(180), 180, 180, join(PUBLIC, 'apple-touch-icon.png'));
await render(iconHtml(32), 32, 32, join(PUBLIC, 'favicon-32.png'));
await render(iconHtml(16), 16, 16, join(PUBLIC, 'favicon-16.png'));

console.log('Done.');
