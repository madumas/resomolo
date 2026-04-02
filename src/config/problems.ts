export interface ProblemPreset {
  id: string;
  title: string;
  text: string;
  cycle?: 2 | 3;
}

export const PROBLEM_PRESETS: ProblemPreset[] = [
  {
    id: 'division',
    title: 'Division partage',
    text: '3 amis se partagent également 15 cartes. Combien chaque ami reçoit-il de cartes?',
    cycle: 2,
  },
  {
    id: 'multiplicatif',
    title: 'Comparaison multiplicative',
    text: 'Camille a lu 3 fois plus de pages que Théo. Camille a lu 45 pages. Combien de pages Théo a-t-il lues?',
    cycle: 2,
  },
  {
    id: 'multi-etapes',
    title: 'Multi-étapes',
    text: "Une classe de 28 élèves va au musée. Le transport coûte 4 $ par élève. L'entrée coûte 6 $ par élève. L'école paie 100 $. Les parents doivent payer le reste. Combien les parents doivent-ils payer en tout?",
    cycle: 3,
  },
  {
    id: 'libre',
    title: 'Problème libre',
    text: '',
  },
];
