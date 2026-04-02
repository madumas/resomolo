export const COLORS = {
  // Canvas
  canvasBg: '#FAFAFE',

  // Pieces
  pieceBorder: '#9898A8',
  pieceFill: 'rgba(150, 150, 170, 0.10)',

  // Piece colors
  bleu: '#185FA5',
  rouge: '#C24B22',
  vert: '#0B7285',
  jaune: '#B8860B',

  // Piece fill variants (semi-transparent)
  bleuFill: 'rgba(24, 95, 165, 0.15)',
  rougeFill: 'rgba(194, 75, 34, 0.15)',
  vertFill: 'rgba(11, 114, 133, 0.15)',
  jauneFill: 'rgba(184, 134, 11, 0.15)',

  // UI
  text: '#1E1A2E',
  textLight: '#55506A',
  uiBg: '#F6F4FA',
  border: '#D5D0E0',
  borderLight: '#E8E5F0',
  destructive: '#C82828',
  primary: '#7028e0',

  // Highlights
  highlightBleu: '#C5D9F0',
  highlightOrange: '#F5D5C0',
  highlightVert: '#C5E8D5',

  // Locked
  locked: '#9CA3AF',
  lockedFill: 'rgba(156, 163, 175, 0.15)',

  // Calcul
  calculBg: '#FFFFFF',
  calculBorder: '#D5D0E0',

  // Reponse
  reponseBorder: '#9898A8',
} as const;

// Layout — aligné TracéVite
export const TOOLBAR_HEIGHT = 64;
export const STATUS_BAR_HEIGHT = 44;
export const STATUS_BAR_BG = '#EDE5F5';
export const ACTION_BAR_HEIGHT = 56;

// UI colors — exports nommés (alignés TracéVite)
export const UI_BG = '#F6F4FA';
export const UI_SURFACE = '#FFFFFF';
export const UI_PRIMARY = '#7028e0';
export const UI_DESTRUCTIVE = '#C82828';
export const UI_BORDER = '#D5D0E0';
export const UI_TEXT_PRIMARY = '#1E1A2E';
export const UI_TEXT_SECONDARY = '#55506A';
export const UI_DISABLED_BG = '#ECEAF0';
export const UI_DISABLED_TEXT = '#9E9AAF';

// High contrast overrides
export const HIGH_CONTRAST = {
  strokeWidthMultiplier: 1.5,
  bleu: '#0D4A8A',
  rouge: '#A33C1A',
  vert: '#075E6E',
  jaune: '#8B6914',
  text: '#000000',
  border: '#666666',
} as const;

export function getPieceColor(couleur: string, highContrast = false): string {
  if (highContrast) {
    const hcKey = couleur as keyof typeof HIGH_CONTRAST;
    if (hcKey in HIGH_CONTRAST && typeof HIGH_CONTRAST[hcKey] === 'string') return HIGH_CONTRAST[hcKey] as string;
  }
  return COLORS[couleur as keyof typeof COLORS] || COLORS.bleu;
}

export function getPieceFillColor(couleur: string): string {
  const key = `${couleur}Fill` as keyof typeof COLORS;
  return COLORS[key] || COLORS.bleuFill;
}
