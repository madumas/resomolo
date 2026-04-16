import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import QRCode from 'qrcode';
import type { Piece, Highlight } from '../model/types';
import { generateId } from '../model/id';

// === Minified piece format for URL encoding ===

interface MinPiece {
  /** Original ID — sérialisé pour permettre le remap des relations (parentId, attachedTo, fromId, toId). */
  i?: string;
  T: string; x: number; y: number;
  c?: string; sm?: number; l?: string; v?: string;
  w?: number; h?: number; tx?: string; ex?: string;
  fi?: string; ti?: string; lk?: boolean;
  dv?: number; cp?: number[]; gi?: string; gl?: string;
  sf?: boolean; // showFraction
  cd?: string; // columnData
  at?: string; // attachedTo
  pi?: string; // parentId
  tpl?: string; // template (reponse)
  // DroiteNumerique
  mn?: number; mx?: number; st?: number; mk?: number[]; bd?: any[]; wd?: number;
  // Tableau
  rw?: number; cl?: number; clz?: string[][]; hr?: boolean;
  // Arbre
  lvl?: { n: string; o: string[] }[];
  // Schema
  gb?: string; tl?: string; tv?: number | null; brs?: any[];
  rfw?: number;
  // Charts (DiagrammeBandes / DiagrammeLigne)
  ttl?: string; cats?: any[]; pts?: any[]; yal?: string;
}

interface SharePayload {
  t: string;        // problem text
  p?: MinPiece[];   // pieces (optional)
}

function minifyPiece(p: Piece): MinPiece {
  // Conserver l'ID d'origine permet à expandPiece de remapper les relations (parentId, etc.)
  // vers les nouveaux IDs générés côté destinataire.
  const m: MinPiece = { i: p.id, T: p.type, x: p.x, y: p.y };
  if (p.locked) m.lk = true;
  switch (p.type) {
    case 'jeton':
      if (p.couleur !== 'bleu') m.c = p.couleur;
      if (p.parentId) m.pi = p.parentId;
      break;
    case 'barre':
      if (p.couleur !== 'bleu') m.c = p.couleur;
      if (p.sizeMultiplier !== 1) m.sm = p.sizeMultiplier;
      if (p.label) m.l = p.label;
      if (p.value) m.v = p.value;
      if (p.divisions) m.dv = p.divisions;
      if (p.coloredParts?.length) m.cp = p.coloredParts;
      if (p.showFraction) m.sf = true;
      if (p.groupId) m.gi = p.groupId;
      if (p.groupLabel) m.gl = p.groupLabel;
      break;
    case 'calcul':
      if (p.expression) m.ex = p.expression;
      if (p.columnData) m.cd = p.columnData;
      break;
    case 'reponse':
      if (p.text) m.tx = p.text;
      if (p.template) m.tpl = p.template;
      break;
    case 'boite':
      m.w = p.width; m.h = p.height;
      if (p.label) m.l = p.label;
      if (p.value) m.v = p.value;
      if (p.couleur !== 'bleu') m.c = p.couleur;
      break;
    case 'etiquette':
      if (p.text) m.tx = p.text;
      if (p.attachedTo) m.at = p.attachedTo;
      break;
    case 'fleche':
      m.fi = p.fromId; m.ti = p.toId;
      if (p.label) m.l = p.label;
      break;
    case 'droiteNumerique':
      m.mn = p.min; m.mx = p.max; m.st = p.step; m.wd = p.width;
      if (p.markers.length) m.mk = p.markers;
      // Bonds (sauts pédagogiques) — indispensable pour conserver le travail de l'enfant
      // au round-trip URL/QR. Sans ça, toute droite numérique partagée perd ses sauts.
      if (p.bonds?.length) m.bd = p.bonds;
      break;
    case 'tableau':
      m.rw = p.rows; m.cl = p.cols; m.clz = p.cells;
      if (!p.headerRow) m.hr = false;
      break;
    case 'arbre':
      m.lvl = (p as any).levels.map((l: any) => ({ n: l.name, o: l.options }));
      break;
    case 'schema':
      m.gb = (p as any).gabarit;
      if ((p as any).totalLabel) m.tl = (p as any).totalLabel;
      if ((p as any).totalValue != null) m.tv = (p as any).totalValue;
      m.brs = (p as any).bars;
      m.rfw = (p as any).referenceWidth;
      break;
    case 'inconnue':
      if (p.text !== '?') m.tx = p.text;
      if (p.attachedTo) m.at = p.attachedTo;
      break;
    case 'diagrammeBandes':
      if (p.title) m.ttl = p.title;
      m.cats = p.categories;
      m.w = p.width; m.h = p.height;
      if (p.yAxisLabel) m.yal = p.yAxisLabel;
      break;
    case 'diagrammeLigne':
      if (p.title) m.ttl = p.title;
      m.pts = p.points;
      m.w = p.width; m.h = p.height;
      if (p.yAxisLabel) m.yal = p.yAxisLabel;
      break;
  }
  return m;
}

/** Remap un ID d'origine vers le nouvel ID généré (ou null s'il est absent/inconnu). */
function remapId(idMap: Map<string, string>, old: string | null | undefined): string | null {
  if (!old) return null;
  return idMap.get(old) ?? null;
}

function expandPiece(m: MinPiece, newId: string, idMap: Map<string, string>): Piece {
  const base = { id: newId, x: m.x, y: m.y, locked: m.lk ?? false };
  switch (m.T) {
    case 'jeton':
      return { ...base, type: 'jeton', couleur: (m.c as any) ?? 'bleu', parentId: remapId(idMap, m.pi) };
    case 'barre':
      return { ...base, type: 'barre', couleur: (m.c as any) ?? 'bleu', sizeMultiplier: m.sm ?? 1,
        label: m.l ?? '', value: m.v ?? '', divisions: m.dv ?? null, coloredParts: m.cp ?? [],
        showFraction: m.sf ?? false, groupId: m.gi ?? null, groupLabel: m.gl ?? null };
    case 'calcul':
      return { ...base, type: 'calcul', expression: m.ex ?? '', columnData: m.cd };
    case 'reponse':
      return { ...base, type: 'reponse', text: m.tx ?? '', template: m.tpl ?? null };
    case 'boite':
      return { ...base, type: 'boite', width: m.w ?? 60, height: m.h ?? 40, label: m.l ?? '', value: m.v ?? '', couleur: (m.c as any) ?? 'bleu' };
    case 'etiquette':
      return { ...base, type: 'etiquette', text: m.tx ?? '', attachedTo: remapId(idMap, m.at) };
    case 'fleche':
      return { ...base, type: 'fleche',
        fromId: remapId(idMap, m.fi) ?? '',
        toId: remapId(idMap, m.ti) ?? '',
        label: m.l ?? '' };
    case 'droiteNumerique':
      return { ...base, type: 'droiteNumerique', min: m.mn ?? 0, max: m.mx ?? 10, step: m.st ?? 1,
        markers: m.mk ?? [], bonds: m.bd ?? [], width: m.wd ?? 200 };
    case 'tableau':
      return { ...base, type: 'tableau', rows: m.rw ?? 2, cols: m.cl ?? 3,
        cells: m.clz ?? Array.from({ length: m.rw ?? 2 }, () => Array(m.cl ?? 3).fill('')),
        headerRow: m.hr ?? true };
    case 'arbre':
      return { ...base, type: 'arbre',
        levels: (m.lvl ?? [{ n: 'Niveau 1', o: ['A', 'B'] }, { n: 'Niveau 2', o: ['1', '2'] }])
          .map((l: any) => ({ name: l.n, options: l.o })) };
    case 'schema':
      return { ...base, type: 'schema',
        gabarit: (m.gb ?? 'libre') as any,
        totalLabel: m.tl ?? '',
        totalValue: m.tv ?? null,
        bars: m.brs ?? [{ label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] }],
        referenceWidth: m.rfw ?? 60 };
    case 'inconnue':
      return { ...base, type: 'inconnue', text: m.tx ?? '?', attachedTo: remapId(idMap, m.at) };
    case 'diagrammeBandes':
      return { ...base, type: 'diagrammeBandes',
        title: m.ttl ?? '', yAxisLabel: m.yal ?? '',
        categories: m.cats ?? [{ label: 'A', value: 0, couleur: 'bleu' }],
        width: m.w ?? 120, height: m.h ?? 90 };
    case 'diagrammeLigne':
      return { ...base, type: 'diagrammeLigne',
        title: m.ttl ?? '', yAxisLabel: m.yal ?? '',
        points: m.pts ?? [{ label: 'A', value: 0 }],
        width: m.w ?? 120, height: m.h ?? 90 };
    default:
      return { ...base, type: 'jeton', couleur: 'bleu', parentId: null };
  }
}

/**
 * Expand une liste de MinPiece en Piece[] avec remap complet des relations.
 * Deux passes : (1) générer nouveaux IDs et construire idMap ; (2) construire les Piece
 * en remplaçant parentId/attachedTo/fromId/toId via idMap.
 */
function expandPieces(minified: MinPiece[]): Piece[] {
  // Pass 1 : nouveaux IDs + table old→new
  const idMap = new Map<string, string>();
  const newIds: string[] = minified.map(m => {
    const newId = generateId();
    if (m.i) idMap.set(m.i, newId);
    return newId;
  });
  // Pass 2 : construction effective
  return minified.map((m, idx) => expandPiece(m, newIds[idx], idMap));
}

// === URL generation & parsing ===

export function generateShareUrl(text: string, pieces: Piece[]): string {
  const url = new URL(window.location.origin + window.location.pathname);
  if (pieces.length === 0) {
    url.searchParams.set('probleme', text);
  } else {
    const payload: SharePayload = { t: text, p: pieces.map(minifyPiece) };
    const compressed = compressToEncodedURIComponent(JSON.stringify(payload));
    url.searchParams.set('s', compressed);
  }
  return url.toString();
}

export function parseShareParam(search: string): { text: string; pieces: Piece[] } | null {
  const params = new URLSearchParams(search);

  // Format simple: ?probleme=text
  const probleme = params.get('probleme');
  if (probleme !== null) {
    return { text: probleme, pieces: [] };
  }

  // Format riche: ?s=<lz-compressed>
  const s = params.get('s');
  if (s !== null) {
    try {
      const json = decompressFromEncodedURIComponent(s);
      if (!json) return null;
      const data: SharePayload = JSON.parse(json);
      if (!data.t) return null;
      return {
        text: data.t,
        pieces: Array.isArray(data.p) ? expandPieces(data.p) : [],
      };
    } catch {
      return null;
    }
  }

  return null;
}

// === QR code generation ===

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 320, // 160px at 2x for retina
    margin: 2,
    color: { dark: '#1E1A2E', light: '#FFFFFF' },
  });
}

// === Image export ===

const HIGHLIGHT_BG: Record<string, string> = {
  bleu: '#C5D9F0',
  orange: '#F5D5C0',
  vert: '#C5E8D5',
};

export function exportModelisationAsPng(
  problemText: string,
  highlights: Highlight[],
  svgElement: SVGSVGElement,
): void {
  const scale = 2;
  const svgRect = svgElement.getBoundingClientRect();
  const padding = 16;

  // Measure problem text height
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.font = '14px system-ui, sans-serif';
  const maxTextWidth = svgRect.width - padding * 2;
  const lines = wrapText(tempCtx, problemText, maxTextWidth);
  const headerHeight = problemText ? lines.length * 20 + 24 : 8;

  const canvas = document.createElement('canvas');
  canvas.width = svgRect.width * scale;
  canvas.height = (svgRect.height + headerHeight + 20) * scale; // +20 for watermark
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // 1. White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

  // 2. Problem text with highlights
  if (problemText) {
    ctx.font = '14px system-ui, sans-serif';
    drawProblemText(ctx, problemText, highlights, padding, 20, maxTextWidth);
  }

  // 3. SVG canvas
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  // Inline styles for export (SVG must be self-contained)
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, headerHeight, svgRect.width, svgRect.height);

    // 4. Watermark
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    const date = new Date().toISOString().slice(0, 10);
    ctx.fillText(`RésoMolo — ${date}`, padding, canvas.height / scale - 8);

    // 5. Download
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `modelisation-${date}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

function drawProblemText(
  ctx: CanvasRenderingContext2D,
  text: string,
  highlights: Highlight[],
  x: number,
  startY: number,
  maxWidth: number,
): void {
  // Simple word-by-word rendering with highlight backgrounds
  const words = text.split(/(\s+)/);
  let curX = x;
  let curY = startY;
  let charIndex = 0;

  for (const word of words) {
    if (!word) continue;
    const wordWidth = ctx.measureText(word).width;

    // Wrap
    if (curX + wordWidth > x + maxWidth && curX > x) {
      curX = x;
      curY += 20;
    }

    // Check if this word is highlighted
    const wordStart = charIndex;
    const wordEnd = charIndex + word.length;
    const hl = highlights.find(h => h.start <= wordStart && h.end >= wordEnd);

    if (hl && word.trim()) {
      const bg = HIGHLIGHT_BG[hl.color] ?? '#E8E5F0';
      ctx.fillStyle = bg;
      ctx.fillRect(curX - 2, curY - 14, wordWidth + 4, 20);
    }

    ctx.fillStyle = '#1E1A2E';
    ctx.fillText(word, curX, curY);
    curX += wordWidth;
    charIndex += word.length;
  }
}

// === Clipboard helpers ===

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copier ce lien :', text);
    return true;
  }
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    // Fallback: open in new tab
    window.open(dataUrl, '_blank');
    return false;
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
