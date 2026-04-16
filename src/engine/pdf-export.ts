import jsPDF from 'jspdf';

/**
 * Cache du blob TTF Atkinson Hyperlegible (Google Fonts) — chargé à la demande
 * pour injecter une police Unicode dans jsPDF. Sans ça, les em-dash (—), apostrophes
 * typographiques et certains accents français tombent en caractère manquant.
 */
const ATKINSON_URL = 'https://fonts.gstatic.com/s/atkinsonhyperlegible/v11/9Bt23C1KxNDXMspQ1lPyU89-1h6ONRlW45GE.woff2';
let atkinsonBase64Promise: Promise<string | null> | null = null;

async function loadAtkinsonBase64(): Promise<string | null> {
  if (atkinsonBase64Promise) return atkinsonBase64Promise;
  atkinsonBase64Promise = (async () => {
    try {
      const res = await fetch(ATKINSON_URL);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      // Convert to base64 chunk-by-chunk to éviter "Maximum call stack" sur gros blobs
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    } catch {
      return null;
    }
  })();
  return atkinsonBase64Promise;
}

async function ensurePdfFont(pdf: jsPDF): Promise<void> {
  const base64 = await loadAtkinsonBase64();
  if (!base64) return; // fallback silencieux vers helvetica Latin1
  try {
    pdf.addFileToVFS('Atkinson.ttf', base64);
    pdf.addFont('Atkinson.ttf', 'Atkinson', 'normal');
    pdf.setFont('Atkinson');
  } catch {
    // addFont échoue si la police est déjà enregistrée, ou si jsPDF ne parse pas le woff2.
  }
}

export async function exportModelisationAsPdf(
  problemText: string,
  svgElement: SVGSVGElement,
  name = 'modelisation',
): Promise<void> {
  // 1. Clone SVG and render to canvas (same technique as PNG export)
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  // 2. Draw to canvas at high resolution for print quality (300 DPI on Letter landscape ≈ 3300×2550)
  const targetWidth = 3300; // 279mm (11") at 300dpi
  const scale = Math.max(4, Math.ceil(targetWidth / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * scale;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FAFCFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  // 3. Create PDF (landscape Letter)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  await ensurePdfFont(pdf);
  const pageW = pdf.internal.pageSize.getWidth();   // 279mm (Letter)
  const pageH = pdf.internal.pageSize.getHeight();  // 216mm
  const margin = 10;

  // 4. Problem text at top
  pdf.setFontSize(12);
  pdf.setTextColor(26, 36, 51); // #1A2433
  if (problemText) {
    const lines = pdf.splitTextToSize(problemText, pageW - 2 * margin);
    pdf.text(lines, margin, margin + 5);
  }

  // 5. Canvas image
  const textHeight = problemText ? Math.min(30, pdf.splitTextToSize(problemText, pageW - 2 * margin).length * 6) : 0;
  const imgY = margin + textHeight + 5;
  const imgMaxW = pageW - 2 * margin;
  const imgMaxH = pageH - imgY - margin - 8; // leave room for footer
  const imgRatio = canvas.width / canvas.height;
  let imgW = imgMaxW;
  let imgH = imgW / imgRatio;
  if (imgH > imgMaxH) { imgH = imgMaxH; imgW = imgH * imgRatio; }

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', margin, imgY, imgW, imgH);

  // 6. Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  const date = new Date().toLocaleDateString('fr-CA');
  pdf.text(`RésoMolo — ${date}`, margin, pageH - margin);

  // 7. Download
  pdf.save(`${name}.pdf`);
}
