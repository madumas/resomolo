import type { ToolType } from '../model/types';

export const TOOL_MESSAGES: Record<NonNullable<ToolType>, string> = {
  jeton: 'Jeton — Clique pour placer un jeton',
  barre: 'Barre — Clique pour placer une barre',
  boite: 'Boîte — Clique pour placer une boîte',
  etiquette: 'Étiquette — Clique pour placer du texte',
  calcul: 'Calcul — Clique pour placer un calcul',
  reponse: 'Réponse — Clique pour placer ta réponse',
  schema: 'Schéma — Clique pour placer un schéma de relation',
  droiteNumerique: 'Droite numérique — Clique pour placer une droite numérique',
  arbre: 'Diagramme en arbre — Clique pour le placer',
  tableau: 'Tableau — Clique pour placer un tableau',
  fleche: 'Flèche — Clique sur la pièce de départ',
  inconnue: 'Inconnue — Clique pour placer un point d\'interrogation',
  deplacer: 'Déplacer — Clique sur une pièce pour la prendre',
};

export const STATUS_DELETE_MODE = 'Supprimer — Clique sur un élément pour le supprimer';
export const STATUS_DELETE_CONFIRM = (label: string) =>
  `Supprimer — ${label}? Clique à nouveau pour confirmer.`;

export const AMORCAGE_WITH_PROBLEM = 'Commence par lire le problème. Clique sur les mots importants.';
export const AMORCAGE_POST_HIGHLIGHT = 'Tu peux essayer un jeton ou une barre.';
export const AMORCAGE_NO_PROBLEM = 'Tu peux commencer par placer un jeton ou une barre.';
export const RELANCE_QUESTIONS = [
  'Que sais-tu?',
  'Que cherches-tu?',
  "Qu'est-ce qui se passe dans l'histoire?",
];

export const RESPONSE_TEMPLATES = [
  { id: 'reste', label: 'Il en reste...', template: 'Il en reste ___ .' },
  { id: 'chacun', label: 'Chaque...reçoit...', template: 'Chaque ___ reçoit ___ .' },
  { id: 'plus', label: '...de plus que...', template: '___ a ___ de plus que ___ .' },
  { id: 'fois', label: '...fois plus que...', template: '___ a ___ fois plus que ___ .' },
  { id: 'total', label: 'En tout...', template: 'En tout, il y a ___ .' },
  { id: 'reponse', label: 'La réponse est...', template: 'La réponse est ___ .' },
];

