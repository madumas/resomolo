/** Affiche un nombre avec virgule québécoise (3.5 → "3,5"). */
export function fmtNum(v: number | string): string {
  return String(v).replace('.', ',');
}

/**
 * Parse une saisie d'utilisateur francophone (virgule ou point comme séparateur décimal).
 * Retourne `NaN` si la saisie n'est pas un nombre valide.
 */
export function parseNum(raw: string): number {
  if (raw == null) return NaN;
  const normalized = String(raw).trim().replace(/\s+/g, '').replace(',', '.');
  if (normalized === '' || normalized === '-' || normalized === '.') return NaN;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Parse une saisie FR-CA, retournant `fallback` si invalide. Évite la propagation de NaN/Infinity. */
export function parseNumOr(raw: string, fallback = 0): number {
  const n = parseNum(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Pattern HTML5 permissif pour inputs "decimal" FR-CA. */
export const DECIMAL_INPUT_PATTERN = '-?[0-9]*([.,][0-9]*)?';
