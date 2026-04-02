# ModéliVite — Contexte et vision

## En une phrase

Un espace de travail numérique où l'enfant du primaire modélise visuellement un problème mathématique avant de le résoudre — accessible aux enfants ayant des difficultés motrices, utile à tous.

## Le problème

L'enfant reçoit un problème mathématique. Il a une feuille blanche. Il doit :

1. Comprendre la situation
2. Se la représenter mentalement
3. Organiser sa démarche
4. Calculer
5. Vérifier

La majorité des enfants bloquent à l'étape 2. Ils sautent directement au calcul, cherchent les nombres dans l'énoncé, devinent l'opération ("il y a 'de plus' donc j'additionne"), et obtiennent une réponse qui n'a pas de sens.

Pour l'enfant qui a de la difficulté avec la motricité fine, c'est pire : même quand il comprend la situation, il ne peut pas dessiner le schéma qui l'aiderait à organiser sa pensée. La feuille blanche est un double obstacle — cognitif (par où commencer?) et moteur (comment dessiner?).

## La solution

**ModéliVite** donne à l'enfant des **pièces sémantiques** — des éléments visuels qu'il place par clics pour construire une représentation du problème. Pas un tutoriel. Pas un exerciseur. Un espace de travail libre avec des outils adaptés.

L'analogie : TraceVite remplace la règle et le compas. ModéliVite remplace le crayon et la feuille blanche pour la modélisation de problèmes.

## Principes fondamentaux

1. **L'enfant raisonne, l'outil dessine.** ModéliVite ne résout rien. Il donne des pièces — l'enfant construit son raisonnement.

2. **Espace libre, pas séquence imposée.** Aucune étape obligatoire. L'enfant utilise les pièces qu'il veut, dans l'ordre qu'il veut. L'outil ne juge pas la méthode.

3. **La modélisation EST la trace de raisonnement.** L'enseignant voit la pensée de l'enfant dans sa construction, pas juste la réponse finale.

4. **Accessible à tous.** Mêmes principes que TraceVite : clic (pas drag), snap, grandes cibles, pas de geste de précision. Tout enfant qui bloque devant un problème en bénéficie.

5. **Aligné PFEQ.** Vocabulaire, types de problèmes, progression par cycles — tout correspond au programme québécois.

## Les pièces sémantiques

Dix pièces couvrant les 3 cycles du primaire :

| Pièce | Rôle | Cycles |
|---|---|---|
| **Jeton** | Unité de n'importe quoi (rond coloré, placé par clic, raccourci numérique pour en placer plusieurs) | 1-2-3 |
| **Boîte** | Contenant / groupe (rectangle qui regroupe des jetons ou d'autres éléments) | 1-2-3 |
| **Étiquette** | Texte libre ou nombre (nommer, quantifier, annoter) | 1-2-3 |
| **Flèche** | Relation ou transformation entre deux éléments (donner, recevoir, ×3, etc.) | 1-2-3 |
| **Barre** | Quantité proportionnelle (schéma en barre pour partie-tout et comparaisons) | 2-3 |
| **Droite numérique** | Séquence ordonnée avec bonds (addition, soustraction, suites) | 1-2-3 |
| **Grille de calcul** | Opération en colonnes avec cases alignées automatiquement | 1-2-3 |
| **Tableau** | Données en lignes/colonnes (dénombrement, probabilités, statistiques) | 1-2-3 |
| **Calcul** | Zone d'opération évaluée (6 + 3 = 9), plaçable n'importe où | 1-2-3 |
| **Réponse** | Encadré pour la réponse finale en phrase | 1-2-3 |

## Liens avec TraceVite

- Même philosophie : l'outil compense la motricité, le raisonnement reste celui de l'enfant
- Même stack technique potentielle : React/TS, SVG, PWA, IndexedDB
- Code partageable : moteur snap, système de sélection, persistance, export PDF
- Même public cible (enfants ayant des difficultés motrices), même public élargi (tous les élèves)

## Public

- **Principal :** Enfants du primaire (6-12 ans), particulièrement ceux ayant des difficultés motrices
- **Élargi :** Tous les enfants du primaire en résolution de problèmes
- **Utilisateurs secondaires :** Parents (accompagnement aux devoirs), enseignants (voir le raisonnement)

## Estimation de taille

Projet comparable à TraceVite en complexité. Plus simple côté moteur géométrique (pas de calculs d'intersection, pas de détection de figures), plus complexe côté variété de pièces et interactions entre elles.
