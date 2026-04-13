import type { ToolType } from '../model/types';

/** Génère les messages d'outils adaptés au contexte (tactile vs souris). */
export function getToolMessages(touch: boolean): Record<NonNullable<ToolType>, string> {
  const v = touch ? 'Touche' : 'Clique';
  const vSur = touch ? 'Touche' : 'Clique sur';
  return {
    jeton: `Jeton — ${v} pour placer un jeton`,
    barre: `Barre — ${v} pour placer une barre`,
    boite: `Boîte — ${v} pour placer une boîte`,
    etiquette: `Étiquette — ${v} pour placer du texte`,
    calcul: `Calcul — ${v} pour placer un calcul`,
    reponse: `Réponse — ${v} pour placer ta réponse`,
    schema: `Schéma — ${v} pour placer un schéma de relation`,
    droiteNumerique: `Droite numérique — ${v} pour placer une droite numérique`,
    arbre: `Diagramme en arbre — ${v} pour le placer`,
    tableau: `Tableau — ${v} pour placer un tableau`,
    fleche: `Flèche — ${vSur} la pièce de départ`,
    diagrammeBandes: `Diagramme à bandes — ${v} pour placer un diagramme à bandes`,
    diagrammeLigne: `Diagramme à ligne brisée — ${v} pour placer un diagramme`,
    inconnue: `Inconnue — ${v} pour placer un point d'interrogation`,
    deplacer: `Déplacer — ${vSur} une pièce pour la prendre`,
  };
}

/** Messages d'outils par défaut (souris). */
export const TOOL_MESSAGES = getToolMessages(false);

export const STATUS_DELETE_MODE = 'Supprimer — Clique sur un élément pour le supprimer';
export const STATUS_DELETE_CONFIRM = (label: string) =>
  `Supprimer — ${label}? Clique à nouveau pour confirmer.`;

export const AMORCAGE_WITH_PROBLEM = 'Commence par lire le problème. Clique sur les nombres et les mots clés.';
export const AMORCAGE_POST_HIGHLIGHT = 'Tu peux essayer un jeton ou une barre.';
export const AMORCAGE_NO_PROBLEM = 'Tu peux commencer par placer un jeton ou une barre.';
/** Relances métacognitives différenciées par niveau (directif → autonome).
 * Niveau 1 (aide maximale) : questions concrètes, directives
 * Niveau 2 (aide modérée) : questions orientées objectif
 * Niveau 3 (autonome) : questions ouvertes narratives
 */
export const RELANCE_LEVELS = [
  // Niveau 1 — directif (aide maximale)
  [
    'Regarde les pièces que tu as placées. Que manque-t-il?',
    'Quels nombres as-tu trouvés dans le problème?',
    'Essaie de placer une première pièce pour commencer.',
  ],
  // Niveau 2 — guidé (aide modérée)
  [
    'Que sais-tu?',
    'Que cherches-tu?',
    'Quel outil pourrait t\'aider?',
  ],
  // Niveau 3 — autonome
  [
    "Qu'est-ce qui se passe dans l'histoire?",
    'Peux-tu vérifier ta réponse?',
    'As-tu utilisé toutes les informations utiles?',
  ],
];

// Legacy flat list (for backward compat)
export const RELANCE_QUESTIONS = RELANCE_LEVELS[1];

export const RESPONSE_TEMPLATES = [
  { id: 'reste', label: 'Il en reste...', template: 'Il en reste ___ .' },
  { id: 'chacun', label: 'Chaque...reçoit...', template: 'Chaque ___ reçoit ___ .' },
  { id: 'plus', label: '...de plus que...', template: '___ a ___ de plus que ___ .' },
  { id: 'fois', label: '...fois plus que...', template: '___ a ___ fois plus que ___ .' },
  { id: 'fois-moins', label: '...fois plus petit que...', template: '___ est ___ fois plus petit que ___ .' },
  { id: 'total', label: 'En tout...', template: 'En tout, il y a ___ .' },
  { id: 'reponse', label: 'La réponse est...', template: 'La réponse est ___ .' },
  { id: 'partage-reste', label: '...groupes et il reste...', template: '___ groupes de ___ et il en reste ___ .' },
  { id: 'fraction', label: '...représente...de...', template: '___ représente ___/___ de ___ .' },
  { id: 'probabilite', label: 'La probabilité est...', template: 'La probabilité de ___ est de ___/___ .' },
];

