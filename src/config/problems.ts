export interface ProblemPreset {
  id: string;
  title: string;
  text: string;
  cycle: 2 | 3;
  category: 'addition' | 'soustraction' | 'multiplication' | 'division' | 'multi-etapes' | 'comparaison' | 'partage' | 'fraction' | 'statistique' | 'probabilite';
  difficulty: 1 | 2 | 3;
}

export const PROBLEM_PRESETS: ProblemPreset[] = [
  // ── Cycle 2, Difficulty 1 (facile) ──
  {
    id: 'c2-add-1',
    title: 'Pommes de Léa',
    text: 'Léa a 12 pommes. Marc lui en donne 8. Combien Léa a-t-elle de pommes maintenant?',
    cycle: 2,
    category: 'addition',
    difficulty: 1,
  },
  {
    id: 'c2-sous-1',
    title: 'Oiseaux sur la clôture',
    text: 'Il y avait 15 oiseaux sur la clôture. 6 se sont envolés. Combien en reste-t-il?',
    cycle: 2,
    category: 'soustraction',
    difficulty: 1,
  },
  {
    id: 'c2-mult-1',
    title: 'Chaises en rangées',
    text: 'Il y a 4 rangées de 5 chaises dans la classe. Combien y a-t-il de chaises en tout?',
    cycle: 2,
    category: 'multiplication',
    difficulty: 1,
  },
  {
    id: 'c2-div-1',
    title: 'Bonbons de Mia',
    text: 'Mia a 12 bonbons. Elle les partage également entre ses 3 amis. Combien chaque ami reçoit-il de bonbons?',
    cycle: 2,
    category: 'division',
    difficulty: 1,
  },

  // ── Cycle 2, Difficulty 2 (moyen) ──
  {
    id: 'division',
    title: 'Division partage',
    text: '3 amis se partagent également 15 cartes. Combien chaque ami reçoit-il de cartes?',
    cycle: 2,
    category: 'partage',
    difficulty: 2,
  },
  {
    id: 'c2-comp-2',
    title: 'Billes de Marc',
    text: 'Léa a 15 billes. Marc a 8 billes de plus que Léa. Combien Marc a-t-il de billes?',
    cycle: 2,
    category: 'comparaison',
    difficulty: 2,
  },
  {
    id: 'c2-sous-2',
    title: 'Achats de Théo',
    text: 'Théo a 20 $. Il achète un livre à 8 $ et un cahier à 5 $. Combien lui reste-t-il?',
    cycle: 2,
    category: 'multi-etapes',
    difficulty: 2,
  },
  {
    id: 'c2-mult-2',
    title: 'Crayons en boîtes',
    text: "Chaque boîte contient 6 crayons. L'enseignante a 5 boîtes. Combien de crayons a-t-elle en tout?",
    cycle: 2,
    category: 'multiplication',
    difficulty: 2,
  },
  {
    id: 'c2-add-2',
    title: 'Autocollants de Samia',
    text: "Samia a 23 autocollants. Elle en reçoit 15 le matin et 9 l'après-midi. Combien en a-t-elle à la fin de la journée?",
    cycle: 2,
    category: 'addition',
    difficulty: 2,
  },

  // ── Cycle 2, Difficulty 3 ──
  {
    id: 'c2-div-3',
    title: 'Équipes d\'élèves',
    text: "42 élèves se répartissent en équipes de 6. Combien d'équipes complètes y a-t-il? Combien d'élèves restent sans équipe?",
    cycle: 2,
    category: 'partage',
    difficulty: 3,
  },

  // ── Cycle 3, Difficulty 1 ──
  {
    id: 'c3-mult-1',
    title: 'Paniers d\'oeufs',
    text: "Un fermier a 8 paniers de 12 œufs. Combien d'œufs a-t-il en tout?",
    cycle: 3,
    category: 'multiplication',
    difficulty: 1,
  },
  {
    id: 'c3-div-1',
    title: 'Livres à la bibliothèque',
    text: 'Une bibliothèque a 156 livres à placer sur 6 étagères. Combien de livres par étagère?',
    cycle: 3,
    category: 'division',
    difficulty: 1,
  },

  // ── Cycle 3, Difficulty 2 ──
  {
    id: 'multiplicatif',
    title: 'Comparaison multiplicative',
    text: 'Camille a lu 3 fois plus de pages que Théo. Camille a lu 45 pages. Combien de pages Théo a-t-il lues?',
    cycle: 3,
    category: 'comparaison',
    difficulty: 2,
  },
  {
    id: 'c3-prop-2',
    title: 'Prix des cahiers',
    text: 'Si 3 cahiers coûtent 12 $, combien coûtent 7 cahiers?',
    cycle: 3,
    category: 'multiplication',
    difficulty: 2,
  },
  {
    id: 'c3-multi-2',
    title: 'Biscuits de Nadia',
    text: 'Un magasin vend des paquets de 8 biscuits à 4 $. Nadia achète 3 paquets et paie avec un billet de 20 $. Combien reçoit-elle de monnaie?',
    cycle: 3,
    category: 'multi-etapes',
    difficulty: 2,
  },
  {
    id: 'c3-frac-2',
    title: 'Pizza en pointes',
    text: 'Marie mange le quart d\'une pizza coupée en 8 pointes. Combien de pointes mange-t-elle?',
    cycle: 3,
    category: 'fraction',
    difficulty: 2,
  },

  // ── Cycle 3, Difficulty 3 ──
  {
    id: 'multi-etapes',
    title: 'Sortie au musée',
    text: "Une classe de 28 élèves va au musée. Le transport coûte 4 $ par élève. L'entrée coûte 6 $ par élève. L'école paie 100 $. Les parents doivent payer le reste. Combien les parents doivent-ils payer en tout?",
    cycle: 3,
    category: 'multi-etapes',
    difficulty: 3,
  },
  {
    id: 'c3-pct-3',
    title: 'Chandail en solde',
    text: 'Un chandail coûte 40 $. Il est en solde à 25 % de rabais. Quel est le prix en solde?',
    cycle: 3,
    category: 'fraction',
    difficulty: 3,
  },
  {
    id: 'c3-multi-3',
    title: 'Autobus scolaire',
    text: "Un autobus scolaire fait 3 arrêts. Au premier arrêt, 12 élèves montent. Au deuxième, 8 montent et 3 descendent. Au troisième, 5 descendent. Combien d'élèves sont dans l'autobus?",
    cycle: 3,
    category: 'multi-etapes',
    difficulty: 3,
  },

  // ── Cycle 2, Décimaux (difficulty 2) ──
  {
    id: 'c2-dec-1',
    title: 'Monnaie et soustraction',
    text: 'Léa a 3,50 $. Elle achète un jus à 1,75 $. Combien lui reste-t-il?',
    cycle: 2,
    category: 'soustraction',
    difficulty: 2,
  },
  {
    id: 'c2-dec-2',
    title: 'Mesures et différence',
    text: 'Marc mesure 1,35 m. Sara mesure 1,48 m. Combien Sara mesure-t-elle de plus que Marc?',
    cycle: 2,
    category: 'soustraction',
    difficulty: 2,
  },

  // ── Cycle 3, Décimaux (difficulty 2) ──
  {
    id: 'c3-dec-1',
    title: 'Multiplication décimale',
    text: 'Un paquet de farine pèse 2,5 kg. Combien pèsent 4 paquets?',
    cycle: 3,
    category: 'multiplication',
    difficulty: 2,
  },
  {
    id: 'c3-dec-2',
    title: 'Partage décimal',
    text: 'Trois amis se partagent également 12,60 $. Combien chacun reçoit-il?',
    cycle: 3,
    category: 'division',
    difficulty: 2,
  },

  // ── Cycle 3, Fractions ──
  {
    id: 'c3-frac-add',
    title: 'Addition de fractions',
    text: 'Marie mange 2/8 d\'une pizza. Léo mange 3/8 de la même pizza. Quelle fraction de la pizza ont-ils mangée ensemble?',
    cycle: 3,
    category: 'fraction',
    difficulty: 2,
  },
  {
    id: 'c3-frac-mult',
    title: 'Fraction d\'un tout',
    text: 'Un réservoir plein contient 12 litres d\'eau. Il est rempli aux 3/4. Combien de litres contient-il?',
    cycle: 3,
    category: 'fraction',
    difficulty: 2,
  },
  {
    id: 'c2-frac-comp',
    title: 'Comparaison de fractions',
    text: 'Marie a mangé 2/3 de sa tablette de chocolat. Léo a mangé 3/4 de la sienne. Les deux tablettes sont identiques. Qui a mangé le plus de chocolat?',
    cycle: 2,
    category: 'fraction',
    difficulty: 2,
  },
  {
    id: 'c2-frac-ens',
    title: 'Fraction d\'un ensemble',
    text: 'Il y a 24 billes dans un sac. Le tiers des billes sont rouges. Combien y a-t-il de billes rouges?',
    cycle: 2,
    category: 'fraction',
    difficulty: 1,
  },
  {
    id: 'c3-frac-diff',
    title: 'Différence de fractions',
    text: 'Samuel a bu 3/4 de son verre de jus. Émilie a bu 1/4 du sien. Les deux verres sont identiques. Quelle fraction de plus Samuel a-t-il bu?',
    cycle: 3,
    category: 'fraction',
    difficulty: 2,
  },
  // ── Cycle 3, Statistique ──
  {
    id: 'c3-stat-tableau',
    title: 'Températures de la semaine',
    text: 'Voici les températures de lundi à vendredi : 12°C, 15°C, 9°C, 14°C, 10°C. Quel est l\'écart entre la journée la plus chaude et la plus froide?',
    cycle: 3,
    category: 'statistique',
    difficulty: 1,
  },
  {
    id: 'c3-stat-moyenne',
    title: 'Moyenne des notes',
    text: 'Les notes de Léa en mathématiques sont : 78, 85 et 92. Quelle est la moyenne de ses notes?',
    cycle: 3,
    category: 'statistique',
    difficulty: 2,
  },
  {
    id: 'c3-stat-diag',
    title: 'Vente de jus',
    text: 'Lundi, on a vendu 12 jus. Mardi, 18. Mercredi, 9. Jeudi, 15. Vendredi, 21. Combien de jus ont été vendus en tout? Quel jour a-t-on vendu le plus?',
    cycle: 3,
    category: 'statistique',
    difficulty: 2,
  },
  // ── Cycle 3, Probabilité ──
  {
    id: 'c3-prob-simple',
    title: 'Billes dans le sac',
    text: 'Un sac contient 3 billes rouges et 5 billes bleues. Tu piges une bille sans regarder. Est-il plus probable de piger une bille rouge ou bleue? Explique.',
    cycle: 3,
    category: 'probabilite',
    difficulty: 1,
  },
  {
    id: 'c3-prob-denomb',
    title: 'Choix de collation',
    text: 'À la cafétéria, il y a 3 choix de sandwich (jambon, poulet, végé) et 2 choix de boisson (jus, lait). Combien de combinaisons sandwich-boisson différentes sont possibles?',
    cycle: 3,
    category: 'probabilite',
    difficulty: 2,
  },
];
