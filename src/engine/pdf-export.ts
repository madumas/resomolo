import jsPDF from 'jspdf';

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

  // 3. Create PDF (landscape A4)
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageW = pdf.internal.pageSize.getWidth();   // 297mm
  const pageH = pdf.internal.pageSize.getHeight();  // 210mm
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
