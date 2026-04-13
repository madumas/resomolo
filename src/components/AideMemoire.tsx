import { useRef } from 'react';
import { UI_PRIMARY, UI_BG, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER } from '../config/theme';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface AideMemoireProps {
  cycle: 1 | 2 | 3;
  onClose: () => void;
}

interface SbiEntry {
  question: string;
  schema: string;
  example: string;
  cycles: (1 | 2 | 3)[];
}

const SBI_ENTRIES: SbiEntry[] = [
  {
    question: 'Tu connais les parties et tu cherches le tout\u00a0? (ou l\'inverse)',
    schema: 'Tout et parties',
    example: '12 pommes + 8 pommes = ?',
    cycles: [1, 2, 3],
  },
  {
    question: 'Il y a un avant et un après\u00a0? (quelque chose change)',
    schema: 'Transformation',
    example: '15 oiseaux, 6 s\'envolent → ?',
    cycles: [1, 2, 3],
  },
  {
    question: 'Tu compares deux quantités\u00a0?',
    schema: 'Comparaison',
    example: 'Marc a 8 billes de plus que Léa',
    cycles: [2, 3],
  },
  {
    question: 'Tu as des groupes de même taille\u00a0?',
    schema: 'Groupes égaux',
    example: '4 rangées de 6 chaises',
    cycles: [2, 3],
  },
  {
    question: 'Problème à plusieurs étapes\u00a0?',
    schema: 'Décompose, puis choisis pour chaque étape',
    example: 'Transport + entrée = coût total',
    cycles: [3],
  },
  {
    question: 'Tu travailles avec des fractions\u00a0?',
    schema: 'Barre subdivisée ou ensemble',
    example: '1/3 de 24 billes',
    cycles: [3],
  },
  {
    question: 'Tu organises des données\u00a0?',
    schema: 'Diagramme à bandes ou tableau',
    example: 'Fruits préférés de la classe',
    cycles: [2, 3],
  },
  {
    question: 'Tu comptes les possibilités\u00a0?',
    schema: 'Diagramme en arbre',
    example: '3 sandwiches × 2 boissons',
    cycles: [3],
  },
];

const SCHEMA_COLORS: Record<string, string> = {
  'Tout et parties': '#E8F0FE',
  'Transformation': '#FEF3C7',
  'Comparaison': '#FEEADD',
  'Groupes égaux': '#E0F5E0',
  'Barre subdivisée ou ensemble': '#F0E6FF',
  'Diagramme à bandes ou tableau': '#E0F0FF',
  'Diagramme en arbre': '#FFF0F0',
  'Décompose, puis choisis pour chaque étape': '#F5F5F5',
};

export function AideMemoire({ cycle, onClose }: AideMemoireProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onClose);

  const filtered = SBI_ENTRIES.filter(e => e.cycles.includes(cycle));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aide-mémoire : quel schéma choisir?"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 460,
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: UI_PRIMARY, marginBottom: 4 }}>
          Quel schéma choisir?
        </h2>
        <p style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>
          Pose-toi la question pour trouver le bon schéma.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((entry, i) => (
            <div
              key={i}
              style={{
                background: SCHEMA_COLORS[entry.schema] || UI_BG,
                border: `1px solid ${UI_BORDER}`,
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 4 }}>
                {entry.question}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: UI_PRIMARY }}>
                → {entry.schema}
              </div>
              <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginTop: 2, fontStyle: 'italic' }}>
                Ex. : {entry.example}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '12px',
            background: UI_PRIMARY,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
