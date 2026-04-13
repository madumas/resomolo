import { useRef, useState } from 'react';
import { UI_PRIMARY, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY, UI_BORDER } from '../config/theme';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { JetonIcon, BarreIcon, SchemaIcon, DroiteNumeriqueIcon, ArbreIcon, BoiteIcon, DiagrammeBandesIcon } from './ToolIcons';
import type { ToolbarMode } from '../model/types';

interface AideMemoireProps {
  cycle: 1 | 2 | 3;
  toolbarMode: ToolbarMode;
  onClose: () => void;
}

interface AideMemoireEntry {
  question: string;
  piece: string;
  Icon: React.ComponentType;
  example: string;
  color: string;
  cycles: (1 | 2 | 3)[];
  /** Available in essentiel mode? (false = complet only) */
  essentiel: boolean;
  /** If set, clicking this entry opens the schema sub-level */
  opensSchemaLevel?: boolean;
}

// ── Niveau 1 : Quelle pièce choisir? ──

const PIECE_ENTRIES: AideMemoireEntry[] = [
  {
    question: 'Tu veux montrer des objets un par un\u00a0?',
    piece: 'Jeton',
    Icon: JetonIcon,
    example: '8 billes bleues et 5 billes rouges',
    color: '#E8F0FE',
    cycles: [1, 2, 3],
    essentiel: true,
  },
  {
    question: 'Tu veux regrouper des objets ensemble\u00a0?',
    piece: 'Boîte',
    Icon: BoiteIcon,
    example: '3 sacs de 6 bonbons',
    color: '#FEF9E7',
    cycles: [2, 3],
    essentiel: true,
  },
  {
    question: 'Tu veux comparer des longueurs ou des quantités\u00a0?',
    piece: 'Barre',
    Icon: BarreIcon,
    example: 'Théo a lu 15 pages, Camille a lu 45 pages',
    color: '#FEEADD',
    cycles: [1, 2, 3],
    essentiel: true,
  },
  {
    question: 'Tu veux compter par bonds ou par sauts\u00a0?',
    piece: 'Droite numérique',
    Icon: DroiteNumeriqueIcon,
    example: '23 + 8, en faisant des sauts de 1',
    color: '#E0F5E0',
    cycles: [1, 2, 3],
    essentiel: true,
  },
  {
    question: 'Tu veux montrer une relation entre des quantités\u00a0?',
    piece: 'Schéma',
    Icon: SchemaIcon,
    example: '12 pommes + 8 pommes = ? pommes en tout',
    color: '#F0E6FF',
    cycles: [1, 2, 3],
    essentiel: true,
    opensSchemaLevel: true,
  },
  {
    question: 'Tu veux trouver toutes les combinaisons\u00a0?',
    piece: 'Arbre',
    Icon: ArbreIcon,
    example: '3 entrées × 2 desserts = ? repas possibles',
    color: '#FFF0F0',
    cycles: [3],
    essentiel: false,  // mode Complet seulement
  },
  {
    question: 'Tu organises des données\u00a0?',
    piece: 'Diagramme à bandes ou tableau',
    Icon: DiagrammeBandesIcon,
    example: 'Fruits préférés de la classe',
    color: '#E0F0FF',
    cycles: [2, 3],
    essentiel: true,
  },
];

// ── Niveau 2 : Quel type de schéma? ──

interface SchemaEntry {
  question: string;
  schema: string;
  example: string;
  color: string;
  cycles: (1 | 2 | 3)[];
}

const SCHEMA_ENTRIES: SchemaEntry[] = [
  {
    question: 'Tu connais les parties et tu cherches le tout\u00a0? (ou l\'inverse)',
    schema: 'Tout et parties',
    example: '12 pommes + 8 pommes = ?',
    color: '#E8F0FE',
    cycles: [1, 2, 3],
  },
  {
    question: 'Il y a un avant et un après\u00a0? (quelque chose change)',
    schema: 'Transformation',
    example: '15 oiseaux, 6 s\'envolent → ?',
    color: '#FEF3C7',
    cycles: [1, 2, 3],
  },
  {
    question: 'Tu compares deux quantités\u00a0?',
    schema: 'Comparaison',
    example: 'Marc a 8 billes de plus que Léa',
    color: '#FEEADD',
    cycles: [2, 3],
  },
  {
    question: 'Tu as des groupes de même taille\u00a0?',
    schema: 'Groupes égaux',
    example: '4 rangées de 6 chaises',
    color: '#E0F5E0',
    cycles: [2, 3],
  },
  {
    question: 'Problème à plusieurs étapes\u00a0?',
    schema: 'Décompose, puis choisis pour chaque étape',
    example: 'Transport + entrée = coût total',
    color: '#F5F5F5',
    cycles: [3],
  },
  {
    question: 'Tu travailles avec des fractions\u00a0?',
    schema: 'Barre subdivisée ou ensemble',
    example: '1/3 de 24 billes',
    color: '#F0E6FF',
    cycles: [3],
  },
];

export function AideMemoire({ cycle, toolbarMode, onClose }: AideMemoireProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onClose);
  const [level, setLevel] = useState<1 | 2>(1);
  const isComplet = toolbarMode === 'complet';

  const filteredPieces = PIECE_ENTRIES.filter(e => e.cycles.includes(cycle) && (isComplet || e.essentiel));
  const filteredSchemas = SCHEMA_ENTRIES.filter(e => e.cycles.includes(cycle));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={level === 1 ? 'Aide-mémoire : quelle pièce choisir?' : 'Aide-mémoire : quel type de schéma?'}
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
        {/* Header */}
        {level === 2 && (
          <button
            onClick={() => setLevel(1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: UI_PRIMARY, fontWeight: 600, padding: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span> Toutes les pièces
          </button>
        )}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: UI_PRIMARY, marginBottom: 4 }}>
          {level === 1 ? 'Quelle pièce choisir?' : 'Quel type de schéma?'}
        </h2>
        <p style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginBottom: 16 }}>
          {level === 1
            ? 'Pose-toi la question pour trouver le bon outil.'
            : 'Pose-toi la question pour trouver le bon schéma.'}
        </p>

        {/* Level 1: Pieces */}
        {level === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredPieces.map((entry, i) => (
              <div
                key={i}
                onClick={entry.opensSchemaLevel ? () => setLevel(2) : undefined}
                style={{
                  background: entry.color,
                  border: `1px solid ${UI_BORDER}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: entry.opensSchemaLevel ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 4 }}>
                  {entry.question}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: UI_PRIMARY, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', flexShrink: 0 }}><entry.Icon /></span>
                  &rarr; {entry.piece}
                  {entry.opensSchemaLevel && (
                    <span style={{ fontSize: 11, color: UI_TEXT_SECONDARY, fontWeight: 400 }}>(voir les types &rarr;)</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginTop: 2, fontStyle: 'italic' }}>
                  Ex. : {entry.example}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Level 2: Schema types */}
        {level === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredSchemas.map((entry, i) => (
              <div
                key={i}
                style={{
                  background: entry.color,
                  border: `1px solid ${UI_BORDER}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: UI_TEXT_PRIMARY, marginBottom: 4 }}>
                  {entry.question}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: UI_PRIMARY }}>
                  &rarr; {entry.schema}
                </div>
                <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginTop: 2, fontStyle: 'italic' }}>
                  Ex. : {entry.example}
                </div>
              </div>
            ))}
          </div>
        )}

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
