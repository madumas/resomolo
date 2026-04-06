import type React from 'react';

/**
 * SVG icons for toolbar tools — inline, 28×28 rendered (viewBox 20×20), stroke-based.
 * Shared pattern with GéoMolo for visual consistency in RésoMolo.
 */

const S = {
  width: 32,
  height: 32,
  viewBox: '0 0 20 20',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { flexShrink: 0 } as React.CSSProperties,
} as const;
const stroke = 'currentColor';

/** ActionBar icons — 18×18 rendered */
const SA = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { flexShrink: 0 } as React.CSSProperties,
} as const;

// --- Toolbar icons ---

/** Jeton: filled circle */
export function JetonIcon() {
  return (
    <svg {...S}>
      <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

/** Barre: horizontal bar */
export function BarreIcon() {
  return (
    <svg {...S}>
      <rect x="2" y="7" width="16" height="6" rx="1.5" stroke={stroke} strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

/** Calcul: equals sign */
export function CalculIcon() {
  return (
    <svg {...S}>
      <path d="M5 8h10M5 12h10" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Réponse: checkmark in a box */
export function ReponseIcon() {
  return (
    <svg {...S}>
      <rect x="3" y="3" width="14" height="14" rx="2" stroke={stroke} strokeWidth="2" fill="none" />
      <path d="M6 10l3 3 5-6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Boîte: dashed square */
export function BoiteIcon() {
  return (
    <svg {...S}>
      <rect x="3" y="3" width="14" height="14" rx="2" stroke={stroke} strokeWidth="2" strokeDasharray="3 2" fill="none" />
    </svg>
  );
}

/** Tableau: 3×3 grid */
export function TableauIcon() {
  return (
    <svg {...S}>
      <rect x="3" y="3" width="14" height="14" rx="1" stroke={stroke} strokeWidth="2" fill="none" />
      <line x1="3" y1="8" x2="17" y2="8" stroke={stroke} strokeWidth="1.5" />
      <line x1="3" y1="12" x2="17" y2="12" stroke={stroke} strokeWidth="1" />
      <line x1="8" y1="3" x2="8" y2="17" stroke={stroke} strokeWidth="1" />
      <line x1="13" y1="3" x2="13" y2="17" stroke={stroke} strokeWidth="1" />
    </svg>
  );
}

/** Étiquette: letter A */
export function EtiquetteIcon() {
  return (
    <svg {...S}>
      <path d="M7 16l3-12 3 12M8 12h4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Flèche: right arrow (→) linking two pieces */
export function FlecheIcon() {
  return (
    <svg {...S}>
      <path d="M4 10h12M12 6l4 4-4 4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Droite numérique: horizontal line with tick marks */
export function DroiteNumeriqueIcon() {
  return (
    <svg {...S}>
      <line x1="2" y1="10" x2="18" y2="10" stroke={stroke} strokeWidth="2" />
      <line x1="4" y1="7" x2="4" y2="13" stroke={stroke} strokeWidth="2" />
      <line x1="10" y1="7" x2="10" y2="13" stroke={stroke} strokeWidth="2" />
      <line x1="16" y1="7" x2="16" y2="13" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

/** Schéma: two stacked bars with bracket — distinct from BarreIcon */
export function SchemaIcon() {
  return (
    <svg {...S}>
      <rect x="2" y="5" width="12" height="4" rx="1" stroke={stroke} strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <rect x="2" y="11" width="8" height="4" rx="1" stroke={stroke} strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M16 5c2 0 2 0 2 5s0 5-2 5" stroke={stroke} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Arbre: root node with 2 branches and 2 children */
export function ArbreIcon() {
  return (
    <svg {...S}>
      <circle cx="10" cy="4" r="2.5" stroke={stroke} strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <line x1="10" y1="6.5" x2="5" y2="12" stroke={stroke} strokeWidth="1.5" />
      <line x1="10" y1="6.5" x2="15" y2="12" stroke={stroke} strokeWidth="1.5" />
      <circle cx="5" cy="14" r="2.5" stroke={stroke} strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
      <circle cx="15" cy="14" r="2.5" stroke={stroke} strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

/** Inconnue: circle with "?" — unknown value marker */
export function InconnueIcon() {
  return (
    <svg {...S}>
      <circle cx="10" cy="10" r="7" stroke={stroke} strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
      <text x="10" y="11" textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="700" fill="currentColor">?</text>
    </svg>
  );
}

/** Déplacer: four-direction arrow cross — identical to GéoMolo MoveIcon */
export function DeplacerIcon() {
  return (
    <svg {...S}>
      <path
        d="M10 3v14M3 10h14M10 3l-3 3M10 3l3 3M10 17l-3-3M10 17l3-3M3 10l3-3M3 10l3 3M17 10l-3-3M17 10l-3 3"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- ActionBar icons ---

/** Undo: curved arrow left — identical to GéoMolo */
export function UndoIcon() {
  return (
    <svg {...SA}>
      <path d="M5 8h8a4 4 0 0 1 0 8H9" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M8 5L5 8l3 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Redo: curved arrow right — identical to GéoMolo */
export function RedoIcon() {
  return (
    <svg {...SA}>
      <path d="M15 8H7a4 4 0 0 0 0 8h4" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 5l3 3-3 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Delete: simplified trash can — identical to GéoMolo */
export function DeleteIcon() {
  return (
    <svg {...SA}>
      <path d="M4 6h12M8 6V4h4v2M6 6v10h8V6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Settings: 6-tooth gear — identical to GéoMolo */
export function SettingsIcon() {
  const cx = 10, cy = 10, ro = 9, ri = 6.5, teeth = 6, hw = 15;
  const step = 360 / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [deg, r] of [
      [a - hw, ro], [a + hw, ro], [a + hw, ri], [a + step - hw, ri], [a + step - hw, ro],
    ] as [number, number][]) {
      const rad = (deg * Math.PI) / 180;
      pts.push(`${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`);
    }
  }
  return (
    <svg {...SA}>
      <polygon points={pts.join(' ')} stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <circle cx="10" cy="10" r="2.5" stroke={stroke} strokeWidth="2" fill="none" />
    </svg>
  );
}

/** Help: question mark — for Guide button */
export function HelpIcon() {
  return (
    <svg {...SA}>
      <circle cx="10" cy="10" r="8" stroke={stroke} strokeWidth="2" fill="none" />
      <path d="M8 7.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2.5 2-2.5 3.5" stroke={stroke} strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="10" cy="15" r="0.75" fill={stroke} />
    </svg>
  );
}

/** Share: link/chain icon — for Partager button */
export function ShareIcon() {
  return (
    <svg {...SA}>
      <path d="M10 13V4M10 4L7 7M10 4l3 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11v5a2 2 0 002 2h8a2 2 0 002-2v-5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Camera: simplified camera — for Photo/export button */
export function CameraIcon() {
  return (
    <svg {...SA}>
      <path d="M3 7h2l1.5-2h7L15 7h2v9H3V7z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <circle cx="10" cy="11" r="2.5" stroke={stroke} strokeWidth="2" fill="none" />
    </svg>
  );
}

/** Speaker: volume icon — for TTS read-aloud button */
export function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h2l4-4v12l-4-4H3V7z" />
      <path d="M12 6.5c1 1 1 4 0 5" strokeLinecap="round" />
      <path d="M14 4.5c2 2 2 7 0 9" strokeLinecap="round" />
    </svg>
  );
}

/** StopCircle: stop icon — for TTS stop button */
export function StopCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="9" r="7" />
      <rect x="6" y="6" width="6" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}
