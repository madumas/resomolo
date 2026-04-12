import type { ModelisationState } from '../model/types';

export type CategoryGroup = 'additif' | 'multiplicatif' | 'fractions' | 'stats-proba' | 'complexe';

export interface WorkedExample {
  id: string;
  title: string;
  categoryGroup: CategoryGroup;
  cycle: 2 | 3;
  explanation: string;
  pairedProblemIds: string[];
  state: ModelisationState;
}

// Helper: all fixture pieces are set to locked: true for read-only display.
export const WORKED_EXAMPLES: WorkedExample[] = [
  // ── Additif : Addition (jetons) ──
  {
    id: 'ex-addition',
    title: 'Addition avec jetons',
    categoryGroup: 'additif',
    cycle: 2,
    explanation: 'Regarde comment on utilise des jetons de deux couleurs pour montrer les pommes de Léa et celles de Marc.',
    pairedProblemIds: ['c2-add-1', 'c2-add-2'],
    state: {
      probleme: 'Léa a 12 pommes. Marc lui en donne 8. Combien Léa a-t-elle de pommes maintenant?',
      problemeReadOnly: true,
      // "Léa a 12 pommes. Marc lui en donne 8. Combien Léa a-t-elle de pommes maintenant?"
      problemeHighlights: [
        { start: 0, end: 3, color: 'vert' },       // "Léa"
        { start: 6, end: 8, color: 'bleu' },       // "12"
        { start: 9, end: 15, color: 'vert' },      // "pommes"
        { start: 17, end: 21, color: 'vert' },     // "Marc"
        { start: 35, end: 36, color: 'bleu' },     // "8"
        { start: 38, end: 80, color: 'orange' },   // "Combien Léa a-t-elle..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'b1', type: 'jeton', x: 30, y: 25, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b2', type: 'jeton', x: 44, y: 25, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b3', type: 'jeton', x: 58, y: 25, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b4', type: 'jeton', x: 72, y: 25, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b5', type: 'jeton', x: 86, y: 25, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b6', type: 'jeton', x: 100, y: 25, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b7', type: 'jeton', x: 30, y: 40, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b8', type: 'jeton', x: 44, y: 40, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b9', type: 'jeton', x: 58, y: 40, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b10', type: 'jeton', x: 72, y: 40, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b11', type: 'jeton', x: 86, y: 40, locked: true, couleur: 'bleu', parentId: null },
        { id: 'b12', type: 'jeton', x: 100, y: 40, locked: true, couleur: 'bleu', parentId: null },
        { id: 'r1', type: 'jeton', x: 130, y: 25, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r2', type: 'jeton', x: 144, y: 25, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r3', type: 'jeton', x: 158, y: 25, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r4', type: 'jeton', x: 172, y: 25, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r5', type: 'jeton', x: 130, y: 40, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r6', type: 'jeton', x: 144, y: 40, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r7', type: 'jeton', x: 158, y: 40, locked: true, couleur: 'rouge', parentId: null },
        { id: 'r8', type: 'jeton', x: 172, y: 40, locked: true, couleur: 'rouge', parentId: null },
        { id: 'e-lea', type: 'etiquette', x: 50, y: 12, locked: true, text: 'Léa (12)', attachedTo: null },
        { id: 'e-marc', type: 'etiquette', x: 135, y: 12, locked: true, text: 'Marc (8)', attachedTo: null },
        { id: 'calcul', type: 'calcul', x: 40, y: 65, locked: true, expression: '12 + 8 = 20' },
        { id: 'reponse', type: 'reponse', x: 40, y: 100, locked: true, text: 'Léa a 20 pommes maintenant.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Additif : Soustraction (schéma transformation) ──
  {
    id: 'ex-soustraction',
    title: 'Soustraction avec schéma',
    categoryGroup: 'additif',
    cycle: 2,
    explanation: 'Regarde comment le schéma de transformation montre le départ (15) et le changement (−6) pour trouver le résultat.',
    pairedProblemIds: ['c2-sous-1'],
    state: {
      probleme: 'Il y avait 15 oiseaux sur la clôture. 6 se sont envolés. Combien en reste-t-il?',
      problemeReadOnly: true,
      // "Il y avait 15 oiseaux sur la clôture. 6 se sont envolés. Combien en reste-t-il?"
      problemeHighlights: [
        { start: 11, end: 13, color: 'bleu' },     // "15"
        { start: 14, end: 21, color: 'vert' },     // "oiseaux"
        { start: 38, end: 39, color: 'bleu' },     // "6"
        { start: 57, end: 79, color: 'orange' },   // "Combien en reste-t-il?"
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'schema-1', type: 'schema', x: 40, y: 25, locked: true, gabarit: 'transformation', totalLabel: '?', totalValue: null, referenceWidth: 60, bars: [{ label: '', value: null, sizeMultiplier: 1.5, couleur: 'bleu', parts: [{ label: '15', value: 15, couleur: 'bleu' }, { label: '−6', value: 6, couleur: 'rouge' }] }] },
        { id: 'calcul', type: 'calcul', x: 40, y: 110, locked: true, expression: '15 − 6 = 9' },
        { id: 'reponse', type: 'reponse', x: 40, y: 145, locked: true, text: 'Il reste 9 oiseaux sur la clôture.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Multiplicatif : Multiplication (barres groupées) ──
  {
    id: 'ex-multiplication',
    title: 'Multiplication avec barres',
    categoryGroup: 'multiplicatif',
    cycle: 2,
    explanation: 'Regarde comment 4 barres identiques montrent les 4 rangées de 6 chaises.',
    pairedProblemIds: ['c2-mult-1', 'c2-mult-2'],
    state: {
      probleme: 'Il y a 4 rangées de 6 chaises dans la classe. Combien y a-t-il de chaises en tout?',
      problemeReadOnly: true,
      // "Il y a 4 rangées de 6 chaises dans la classe. Combien y a-t-il de chaises en tout?"
      problemeHighlights: [
        { start: 7, end: 8, color: 'bleu' },       // "4"
        { start: 20, end: 21, color: 'bleu' },     // "6"
        { start: 22, end: 29, color: 'vert' },     // "chaises"
        { start: 46, end: 82, color: 'orange' },   // "Combien y a-t-il..."
      ],
      referenceUnitMm: 40,
      pieces: [
        { id: 'barre-1', type: 'barre', x: 50, y: 10, locked: true, couleur: 'bleu', sizeMultiplier: 2, label: 'Rangée 1', value: '6', divisions: null, coloredParts: [], showFraction: false, groupId: 'grp-1', groupLabel: '4 rangées' },
        { id: 'barre-2', type: 'barre', x: 50, y: 30, locked: true, couleur: 'bleu', sizeMultiplier: 2, label: 'Rangée 2', value: '6', divisions: null, coloredParts: [], showFraction: false, groupId: 'grp-1', groupLabel: null },
        { id: 'barre-3', type: 'barre', x: 50, y: 50, locked: true, couleur: 'bleu', sizeMultiplier: 2, label: 'Rangée 3', value: '6', divisions: null, coloredParts: [], showFraction: false, groupId: 'grp-1', groupLabel: null },
        { id: 'barre-4', type: 'barre', x: 50, y: 70, locked: true, couleur: 'bleu', sizeMultiplier: 2, label: 'Rangée 4', value: '6', divisions: null, coloredParts: [], showFraction: false, groupId: 'grp-1', groupLabel: null },
        { id: 'calcul', type: 'calcul', x: 50, y: 110, locked: true, expression: '4 × 6 = 24' },
        { id: 'reponse', type: 'reponse', x: 50, y: 140, locked: true, text: 'Il y a 24 chaises en tout.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Multiplicatif : Division (algorithme) ──
  {
    id: 'ex-division',
    title: 'Division avec schéma',
    categoryGroup: 'multiplicatif',
    cycle: 3,
    explanation: 'Regarde comment le schéma de groupes égaux montre la répartition de 156 livres en 6 étagères.',
    pairedProblemIds: ['c3-div-1'],
    state: {
      probleme: 'Une bibliothèque a 156 livres à placer sur 6 étagères. Combien de livres par étagère?',
      problemeReadOnly: true,
      // "Une bibliothèque a 156 livres à placer sur 6 étagères. Combien de livres par étagère?"
      problemeHighlights: [
        { start: 19, end: 22, color: 'bleu' },     // "156"
        { start: 23, end: 29, color: 'vert' },     // "livres"
        { start: 43, end: 44, color: 'bleu' },     // "6"
        { start: 55, end: 85, color: 'orange' },   // "Combien de livres..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'schema-1', type: 'schema', x: 40, y: 10, locked: true, gabarit: 'groupes-egaux', totalLabel: '156', totalValue: 156, referenceWidth: 50, bars: [{ label: 'Étagère 1', value: 26, sizeMultiplier: 0.5, couleur: 'bleu', parts: [] }, { label: 'Étagère 2', value: 26, sizeMultiplier: 0.5, couleur: 'bleu', parts: [] }, { label: 'Étagère 3', value: 26, sizeMultiplier: 0.5, couleur: 'bleu', parts: [] }, { label: 'Étagère 4', value: 26, sizeMultiplier: 0.5, couleur: 'bleu', parts: [] }, { label: 'Étagère 5', value: 26, sizeMultiplier: 0.5, couleur: 'bleu', parts: [] }, { label: 'Étagère 6', value: 26, sizeMultiplier: 0.5, couleur: 'bleu', parts: [] }] },
        { id: 'calcul', type: 'calcul', x: 40, y: 120, locked: true, expression: '156 ÷ 6 = 26' },
        { id: 'reponse', type: 'reponse', x: 40, y: 155, locked: true, text: 'Il y a 26 livres par étagère.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Multiplicatif : Comparaison additive (barres) ──
  {
    id: 'ex-comparaison',
    title: 'Comparaison avec barres',
    categoryGroup: 'multiplicatif',
    cycle: 3,
    explanation: 'Regarde comment deux barres de longueurs différentes permettent de comparer les billes de Théo et Léa.',
    pairedProblemIds: ['c2-comp-2'],
    state: {
      probleme: 'Théo a 45 billes. Léa en a 28. Combien Théo a-t-il de billes de plus que Léa?',
      problemeReadOnly: true,
      // "Théo a 45 billes. Léa en a 28. Combien Théo a-t-il de billes de plus que Léa?"
      problemeHighlights: [
        { start: 7, end: 9, color: 'bleu' },       // "45"
        { start: 10, end: 16, color: 'vert' },     // "billes"
        { start: 27, end: 29, color: 'bleu' },     // "28"
        { start: 31, end: 77, color: 'orange' },   // "Combien Théo a-t-il..."
      ],
      referenceUnitMm: 40,
      pieces: [
        { id: 'barre-theo', type: 'barre', x: 50, y: 15, locked: true, couleur: 'bleu', sizeMultiplier: 4.5, label: 'Théo', value: '45', divisions: null, coloredParts: [], showFraction: false, groupId: null, groupLabel: null },
        { id: 'barre-lea', type: 'barre', x: 50, y: 45, locked: true, couleur: 'rouge', sizeMultiplier: 2.8, label: 'Léa', value: '28', divisions: null, coloredParts: [], showFraction: false, groupId: null, groupLabel: null },
        { id: 'inconnue-diff', type: 'inconnue', x: 160, y: 30, locked: true, text: '?', attachedTo: null },
        { id: 'calcul', type: 'calcul', x: 50, y: 80, locked: true, expression: '45 − 28 = 17' },
        { id: 'reponse', type: 'reponse', x: 50, y: 115, locked: true, text: 'Théo a 17 billes de plus que Léa.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Multiplicatif : Partage (schéma groupes égaux) ──
  {
    id: 'ex-partage',
    title: 'Partage avec schéma',
    categoryGroup: 'multiplicatif',
    cycle: 2,
    explanation: 'Regarde comment le schéma de groupes égaux montre le partage de 12 bonbons entre 3 amis.',
    pairedProblemIds: ['division', 'c2-div-3'],
    state: {
      probleme: 'Mia a 12 bonbons. Elle les partage également entre ses 3 amis. Combien chaque ami reçoit-il de bonbons?',
      problemeReadOnly: true,
      // "Mia a 12 bonbons. Elle les partage également entre ses 3 amis. Combien chaque ami reçoit-il de bonbons?"
      problemeHighlights: [
        { start: 6, end: 8, color: 'bleu' },       // "12"
        { start: 9, end: 16, color: 'vert' },      // "bonbons"
        { start: 55, end: 56, color: 'bleu' },     // "3"
        { start: 63, end: 103, color: 'orange' },  // "Combien chaque ami..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'schema-1', type: 'schema', x: 40, y: 25, locked: true, gabarit: 'groupes-egaux', totalLabel: '12', totalValue: 12, referenceWidth: 60, bars: [{ label: 'Ami 1', value: 4, sizeMultiplier: 0.4, couleur: 'bleu', parts: [] }, { label: 'Ami 2', value: 4, sizeMultiplier: 0.4, couleur: 'bleu', parts: [] }, { label: 'Ami 3', value: 4, sizeMultiplier: 0.4, couleur: 'bleu', parts: [] }] },
        { id: 'calcul', type: 'calcul', x: 40, y: 140, locked: true, expression: '12 ÷ 3 = 4' },
        { id: 'reponse', type: 'reponse', x: 40, y: 175, locked: true, text: 'Chaque ami reçoit 4 bonbons.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Complexe : Multi-étapes ──
  {
    id: 'ex-multi-etapes',
    title: 'Multi-étapes avec schéma',
    categoryGroup: 'complexe',
    cycle: 3,
    explanation: 'Regarde comment le schéma parties-tout décompose le coût total en transport et entrée, avec un calcul par étape.',
    pairedProblemIds: ['c3-multi-2', 'c3-multi-3'],
    state: {
      probleme: 'Une classe de 28 élèves va au musée. Le transport coûte 4 $ par élève. L\'entrée coûte 6 $ par élève. Combien coûte la sortie en tout?',
      problemeReadOnly: true,
      // "Une classe de 28 élèves va au musée. Le transport coûte 4 $ par élève. L'entrée coûte 6 $ par élève. Combien coûte la sortie en tout?"
      problemeHighlights: [
        { start: 14, end: 16, color: 'bleu' },     // "28"
        { start: 17, end: 23, color: 'vert' },     // "élèves"
        { start: 56, end: 57, color: 'bleu' },     // "4"
        { start: 86, end: 87, color: 'bleu' },     // "6"
        { start: 101, end: 133, color: 'orange' }, // "Combien coûte la sortie..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'schema-1', type: 'schema', x: 40, y: 15, locked: true, gabarit: 'parties-tout', totalLabel: '?', totalValue: null, referenceWidth: 60, bars: [{ label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [{ label: 'Transport', value: null, couleur: 'bleu' }, { label: 'Entrée', value: null, couleur: 'rouge' }] }] },
        { id: 'calcul-1', type: 'calcul', x: 40, y: 80, locked: true, expression: '28 × 4 = 112' },
        { id: 'calcul-2', type: 'calcul', x: 40, y: 105, locked: true, expression: '28 × 6 = 168' },
        { id: 'calcul-3', type: 'calcul', x: 40, y: 130, locked: true, expression: '112 + 168 = 280' },
        { id: 'reponse', type: 'reponse', x: 40, y: 165, locked: true, text: 'La sortie coûte 280 $ en tout.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Stats-proba : Statistique (diagramme à bandes + tableau) ──
  {
    id: 'ex-stats',
    title: 'Statistique avec diagramme',
    categoryGroup: 'stats-proba',
    cycle: 3,
    explanation: 'Regarde comment le diagramme à bandes et le tableau organisent les données de vente pour trouver le maximum.',
    pairedProblemIds: ['c3-stat-diag', 'c3-stat-constr-1'],
    state: {
      probleme: 'Lundi, on a vendu 12 jus. Mardi, 18. Mercredi, 9. Jeudi, 15. Quel jour a-t-on vendu le plus de jus?',
      problemeReadOnly: true,
      // "Lundi, on a vendu 12 jus. Mardi, 18. Mercredi, 9. Jeudi, 15. Quel jour a-t-on vendu le plus de jus?"
      problemeHighlights: [
        { start: 18, end: 20, color: 'bleu' },     // "12"
        { start: 33, end: 35, color: 'bleu' },     // "18"
        { start: 47, end: 48, color: 'bleu' },     // "9"
        { start: 57, end: 59, color: 'bleu' },     // "15"
        { start: 61, end: 99, color: 'orange' },   // "Quel jour a-t-on..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'diag-1', type: 'diagrammeBandes', x: 15, y: 10, locked: true, title: 'Vente de jus', yAxisLabel: 'Nombre', width: 120, height: 75, categories: [{ label: 'Lun', value: 12, couleur: 'bleu' }, { label: 'Mar', value: 18, couleur: 'rouge' }, { label: 'Mer', value: 9, couleur: 'vert' }, { label: 'Jeu', value: 15, couleur: 'jaune' }] },
        { id: 'tableau-1', type: 'tableau', x: 220, y: 10, locked: true, rows: 2, cols: 5, cells: [['Jour', 'Lun', 'Mar', 'Mer', 'Jeu'], ['Jus', '12', '18', '9', '15']], headerRow: true },
        { id: 'calcul', type: 'calcul', x: 40, y: 100, locked: true, expression: '18 > 15 > 12 > 9' },
        { id: 'reponse', type: 'reponse', x: 40, y: 130, locked: true, text: "C'est mardi qu'on a vendu le plus de jus (18).", template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Fractions : Barre fractionnée ──
  {
    id: 'ex-fraction',
    title: 'Fraction d\'un ensemble',
    categoryGroup: 'fractions',
    cycle: 2,
    explanation: 'Regarde comment la barre divisée en 3 parties montre le tiers de 24 billes.',
    pairedProblemIds: ['c2-frac-ens', 'c3-frac-mult'],
    state: {
      probleme: 'Il y a 24 billes dans un sac. Le tiers des billes sont rouges. Combien y a-t-il de billes rouges?',
      problemeReadOnly: true,
      // "Il y a 24 billes dans un sac. Le tiers des billes sont rouges. Combien y a-t-il de billes rouges?"
      problemeHighlights: [
        { start: 7, end: 9, color: 'bleu' },       // "24"
        { start: 10, end: 16, color: 'vert' },     // "billes"
        { start: 30, end: 38, color: 'bleu' },     // "Le tiers"
        { start: 63, end: 97, color: 'orange' },   // "Combien y a-t-il..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'barre-tout', type: 'barre', x: 40, y: 30, locked: true, couleur: 'bleu', sizeMultiplier: 3, label: '24 billes', value: '24', divisions: 3, coloredParts: [0], showFraction: true, groupId: null, groupLabel: null },
        { id: 'etiq-tiers', type: 'etiquette', x: 40, y: 70, locked: true, text: '1/3 = ?', attachedTo: null },
        { id: 'calcul', type: 'calcul', x: 40, y: 100, locked: true, expression: '24 ÷ 3 = 8' },
        { id: 'reponse', type: 'reponse', x: 40, y: 135, locked: true, text: 'Il y a 8 billes rouges.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
  // ── Stats-proba : Probabilité (arbre de dénombrement) ──
  {
    id: 'ex-probabilite',
    title: 'Dénombrement avec arbre',
    categoryGroup: 'stats-proba',
    cycle: 3,
    explanation: 'Regarde comment l\'arbre montre toutes les combinaisons sandwich-boisson possibles.',
    pairedProblemIds: ['c3-prob-denomb'],
    state: {
      probleme: 'À la cafétéria, il y a 3 choix de sandwich (jambon, poulet, végé) et 2 choix de boisson (jus, lait). Combien de combinaisons sandwich-boisson différentes sont possibles?',
      problemeReadOnly: true,
      // "À la cafétéria, il y a 3 choix de sandwich (...) et 2 choix de boisson (...). Combien...?"
      problemeHighlights: [
        { start: 23, end: 24, color: 'bleu' },     // "3"
        { start: 34, end: 42, color: 'vert' },     // "sandwich"
        { start: 69, end: 70, color: 'bleu' },     // "2"
        { start: 80, end: 87, color: 'vert' },     // "boisson"
        { start: 101, end: 169, color: 'orange' }, // "Combien de combinaisons..."
      ],
      referenceUnitMm: 60,
      pieces: [
        { id: 'arbre-1', type: 'arbre', x: 30, y: 20, locked: true, levels: [{ name: 'Sandwich', options: ['Jambon', 'Poulet', 'Végé'] }, { name: 'Boisson', options: ['Jus', 'Lait'] }] },
        { id: 'calcul', type: 'calcul', x: 40, y: 160, locked: true, expression: '3 × 2 = 6' },
        { id: 'reponse', type: 'reponse', x: 40, y: 195, locked: true, text: 'Il y a 6 combinaisons possibles.', template: null },
      ] as ModelisationState['pieces'],
      availablePieces: null,
    },
  },
];

/** Find a worked example by category group (returns the first match). */
export function findExampleForCategory(categoryGroup: CategoryGroup): WorkedExample | undefined {
  return WORKED_EXAMPLES.find(e => e.categoryGroup === categoryGroup);
}
