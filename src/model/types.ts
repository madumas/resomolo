// === Piece types ===

export type PieceType = 'jeton' | 'barre' | 'calcul' | 'reponse' | 'boite' | 'etiquette' | 'fleche' | 'droiteNumerique' | 'tableau';

export type CouleurPiece = 'bleu' | 'rouge' | 'vert' | 'jaune';

export interface PieceBase {
  id: string;
  type: PieceType;
  x: number; // mm from top-left of canvas
  y: number;
  locked: boolean;
}

export interface Jeton extends PieceBase {
  type: 'jeton';
  couleur: CouleurPiece;
  parentId: string | null; // boite id, or null if free
}

export interface Barre extends PieceBase {
  type: 'barre';
  couleur: CouleurPiece;
  sizeMultiplier: number; // 1-10 (relative to referenceUnitMm)
  label: string; // e.g. "Théo" — displayed to the left of the bar
  value: string; // e.g. "45", "?" — displayed inside the bar
  divisions: number | null;       // number of subdivisions, null = none
  coloredParts: number[];         // indices of colored parts (for fractions)
  showFraction: boolean;          // show fraction label below bar
  groupId: string | null;         // group bracket id
  groupLabel: string | null;      // label displayed under group bracket
}

export interface Calcul extends PieceBase {
  type: 'calcul';
  expression: string; // e.g. "45 ÷ 3 = 15" — typed entirely by child
  columnData?: string; // JSON-encoded column calc state (op1, op2, operator, result, carry)
}

export interface Reponse extends PieceBase {
  type: 'reponse';
  text: string;
  template: string | null;  // e.g. "Il en reste ___ pommes." (null = free mode)
}

// v2 pieces (not in MVP test, but types defined for future)
export interface Boite extends PieceBase {
  type: 'boite';
  width: number;
  height: number;
  label: string;
  value: string;
  couleur: CouleurPiece;
}

export interface Etiquette extends PieceBase {
  type: 'etiquette';
  text: string;
  attachedTo: string | null;
}

export interface Fleche extends PieceBase {
  type: 'fleche';
  fromId: string;
  toId: string;
  label: string;
}

export interface DroiteNumerique extends PieceBase {
  type: 'droiteNumerique';
  min: number;           // start value (default 0)
  max: number;           // end value (default 10)
  step: number;          // tick interval (default 1)
  markers: number[];     // positions marked by child
  width: number;         // width in mm (default 200)
}

export interface Tableau extends PieceBase {
  type: 'tableau';
  rows: number;            // 2-4
  cols: number;            // 2-4
  cells: string[][];       // rows × cols
  headerRow: boolean;      // first row styled as header
}

export type Piece = Jeton | Barre | Calcul | Reponse | Boite | Etiquette | Fleche | DroiteNumerique | Tableau;

// Type guards
export function isJeton(p: Piece): p is Jeton { return p.type === 'jeton'; }
export function isBarre(p: Piece): p is Barre { return p.type === 'barre'; }
export function isBoite(p: Piece): p is Boite { return p.type === 'boite'; }
export function isFleche(p: Piece): p is Fleche { return p.type === 'fleche'; }
export function isDroiteNumerique(p: Piece): p is DroiteNumerique { return p.type === 'droiteNumerique'; }
export function isTableau(p: Piece): p is Tableau { return p.type === 'tableau'; }

// === Highlights ===

export type HighlightColor = 'bleu' | 'orange' | 'vert';

export interface Highlight {
  start: number; // character index in problem text
  end: number;
  color: HighlightColor;
}

// === Tool ===

export type ToolType = 'jeton' | 'barre' | 'droiteNumerique' | 'boite' | 'tableau' | 'etiquette' | 'calcul' | 'reponse' | 'fleche' | 'deplacer' | null;

// === State ===

export interface ModelisationState {
  probleme: string;
  problemeReadOnly: boolean;
  problemeHighlights: Highlight[];
  referenceUnitMm: number; // default 60
  pieces: Piece[];
  availablePieces: PieceType[] | null; // null = all pieces available
}

export interface UndoManager {
  past: ModelisationState[];
  current: ModelisationState;
  future: ModelisationState[];
}

// === Constants ===

export const REFERENCE_UNIT_MM = 60;
export const CANVAS_WIDTH_MM = 500;
export const SNAP_GRID_MM = 5;
export const BAR_HEIGHT_MM = 15;
export const BAR_VERTICAL_GAP_MM = 5;
export const BAR_ALIGN_SNAP_MM = 15;
export const JETON_DIAMETER_MM = 8;
export const JETON_SPACING_MM = 10;
export const DRAG_THRESHOLD_MM = 1.5;
export const CLICK_DEBOUNCE_MS = 150;
export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const MAX_UNDO_LEVELS = 100;

// === Settings ===

export type ToleranceProfile = 'normal' | 'large' | 'tres-large';
export type ToolbarMode = 'essentiel' | 'complet';
export type SoundMode = 'off' | 'reduced' | 'full';
export type TextScale = 1 | 1.25 | 1.5;
export type DominantHand = 'left' | 'right';
export type FontFamily = 'system' | 'atkinson' | 'opendyslexic';
export type LetterSpacing = 0 | 0.05 | 0.1;
export type TTSRate = 0.7 | 1.0 | 1.3;

export interface Settings {
  toleranceProfile: ToleranceProfile;
  toolbarMode: ToolbarMode;
  relanceDelayMs: number;         // 0 = désactivé
  cursorSmoothing: boolean;
  smoothingAlpha: number;         // 0.15-0.40
  sessionTimerEnabled: boolean;
  sessionTimerAlertMinutes: number;
  textScale: TextScale;
  highContrast: boolean;
  keyboardShortcutsEnabled: boolean;
  soundMode: SoundMode;
  soundGain: number;              // 0-1
  dominantHand: DominantHand;
  problemAlwaysVisible: boolean;
  showSuggestedZones: boolean;    // 3.2: semi-transparent zone markers to guide placement
  showTokenCounter: boolean;      // 9.3: jeton count by color in canvas bottom-left
  fontFamily: FontFamily;         // system, atkinson, opendyslexic
  letterSpacing: LetterSpacing;   // 0, 0.05, 0.1 (em)
  ttsEnabled: boolean;            // show/hide TTS button in ProblemZone
  ttsRate: TTSRate;               // 0.7 (slow), 1.0 (normal), 1.3 (fast)
  guidedReadingEnabled: boolean;  // phrase-by-phrase mode in ProblemZone
  activeProfile: SettingsProfile; // explicitly chosen profile
}

export const DEFAULT_SETTINGS: Settings = {
  toleranceProfile: 'normal',
  toolbarMode: 'essentiel',
  relanceDelayMs: 45000,
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
  activeProfile: 'custom' as SettingsProfile,
};

export function getToleranceMultiplier(profile: ToleranceProfile): number {
  switch (profile) {
    case 'normal': return 1.0;
    case 'large': return 1.5;
    case 'tres-large': return 2.0;
  }
}

// === Settings Profiles ===

export type SettingsProfile = 'custom' | 'motricite-legere' | 'motricite-importante' | 'motricite-attention' | 'motricite-lecture';

export const SETTINGS_PROFILES: Record<Exclude<SettingsProfile, 'custom'>, Partial<Settings>> = {
  'motricite-legere': {
    toleranceProfile: 'normal',
    cursorSmoothing: false,
    relanceDelayMs: 45000,
    soundMode: 'reduced',
    textScale: 1,
    problemAlwaysVisible: false,
  },
  'motricite-importante': {
    toleranceProfile: 'tres-large',
    cursorSmoothing: true,
    smoothingAlpha: 0.20,
    relanceDelayMs: 30000,
    soundMode: 'full',
    textScale: 1.25,
    problemAlwaysVisible: true,
  },
  'motricite-attention': {
    toleranceProfile: 'large',
    cursorSmoothing: false,
    relanceDelayMs: 30000,
    soundMode: 'reduced',
    textScale: 1,
    problemAlwaysVisible: true,
    showSuggestedZones: true,
  },
  'motricite-lecture': {
    toleranceProfile: 'normal',
    cursorSmoothing: false,
    relanceDelayMs: 45000,
    soundMode: 'full',
    textScale: 1.5,
    problemAlwaysVisible: true,
  },
};
