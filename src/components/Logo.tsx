/** Logo typographique Molo — pur CSS, aucun SVG externe. */

type MoloBrand = 'reso' | 'geo';

const BRANDS: Record<MoloBrand, { prefix: string; label: string; prefixColor: string; moloColor: string }> = {
  reso: { prefix: 'Réso', label: 'RésoMolo', prefixColor: '#6b3fa0', moloColor: '#863bff' },
  geo:  { prefix: 'Géo',  label: 'GéoMolo',  prefixColor: '#0a7e7a', moloColor: '#0ea5a0' },
};

export function Logo({ height = 32, brand = 'reso' }: { height?: number; brand?: MoloBrand }) {
  const fontSize = height * 0.75;
  const b = BRANDS[brand];
  return (
    <span
      aria-label={b.label}
      role="img"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        height,
        fontFamily: "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
        fontSize,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontWeight: 600, color: b.prefixColor }}>{b.prefix}</span>
      <span style={{ fontWeight: 800, color: b.moloColor }}>Molo</span>
    </span>
  );
}
