/** Affiche un nombre avec virgule québécoise (3.5 → "3,5") */
export function fmtNum(v: number | string): string {
  return String(v).replace('.', ',');
}
