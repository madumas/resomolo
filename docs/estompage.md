# Matrice d'estompage progressif

> **Avertissement** : Ce document a été généré par IA. Les niveaux de progression proposés ne constituent pas un protocole d'intervention clinique. À valider avec un professionnel qualifié avant utilisation.

L'objectif de RésoMolo est de construire la compétence de modélisation mentale chez l'enfant. L'outil est un échafaudage temporaire — il doit être retiré progressivement.

## Les 7 niveaux

| Niveau | Description | Pièces disponibles | Échafaudage | Rôle de l'adulte |
|--------|------------|-------------------|-------------|-----------------|
| **1** | Schéma pré-construit | Restreintes (Calcul + Réponse) | Pièces verrouillées (barres, étiquettes, flèches) | L'adulte a construit le schéma. L'enfant complète le calcul et la réponse. |
| **2** | Schéma partiel | Essentiel (4 pièces) | Quelques pièces verrouillées (barres de départ) | L'adulte a amorcé la structure. L'enfant la complète et ajoute ses calculs. |
| **3** | Espace libre guidé | Essentiel (4 pièces) | Aucun | L'adulte guide par des questions : « Qu'est-ce que tu connais? Quelle pièce tu utiliserais? » |
| **4** | Espace libre autonome | Complet (7 pièces) | Aucun | L'adulte observe. Intervient seulement si l'enfant est bloqué > 45 sec. |
| **5** | Calcul + Réponse seulement | Calcul + Réponse uniquement | Aucun | L'enfant modélise mentalement, puis écrit directement le calcul et la réponse dans l'outil. |
| **6** | Papier-crayon | Aucune (pas d'outil) | Aucun | L'enfant dessine son schéma sur papier, fait le calcul, écrit la réponse. Vérifier que les schémas sont lisibles. |
| **7** | Modélisation mentale | Aucune (pas d'outil) | Aucun | L'enfant résout le problème de tête ou avec un calcul écrit minimal. La modélisation est intériorisée. |

## Principes de progression

### Quand passer au niveau suivant?

- L'enfant réussit **3 problèmes consécutifs** au niveau actuel avec **moins de 2 interventions adultes** par problème
- L'enfant **verbalise spontanément** sa stratégie (« je fais une barre pour Théo et une barre 3 fois plus grande pour Camille »)
- L'enfant **choisit ses pièces** sans hésitation

### Quand revenir au niveau précédent?

- L'enfant est bloqué > 2 minutes devant un espace vide
- L'enfant place des pièces aléatoirement sans lien avec le problème
- L'enfant exprime de la frustration ou de l'anxiété

### Le transfert est spécifique au type de problème

Un enfant au niveau 4 pour les problèmes additifs peut être au niveau 2 pour les problèmes multiplicatifs. La progression se fait **par type de problème**, pas globalement.

Types de problèmes (progression recommandée) :
1. Addition/soustraction directe
2. Comparaison additive (« de plus », « de moins »)
3. Multiplication/division simple
4. Comparaison multiplicative (« N fois plus »)
5. Problèmes multi-étapes
6. Fractions (barres subdivisées)
7. Travail à rebours

## Implémentation dans RésoMolo

| Niveau | Comment configurer |
|--------|-------------------|
| 1 | Fichier `.resomolo` avec pièces `locked: true` + `availablePieces: ["calcul", "reponse"]` |
| 2 | Fichier `.resomolo` avec quelques pièces `locked: true` + toolbarMode essentiel |
| 3 | toolbarMode essentiel, questions de relance activées |
| 4 | toolbarMode complet, questions de relance activées |
| 5 | `availablePieces: ["calcul", "reponse"]` |
| 6-7 | Pas d'outil — papier-crayon ou résolution mentale |

## Durée estimée par niveau

Variable selon l'enfant, le type de problème, et la fréquence de pratique. En pratique régulière (3-4 séances/semaine), prévoir :
- Niveaux 1-3 : 2-4 semaines chacun
- Niveaux 4-5 : 4-8 semaines chacun
- Niveau 5→6 : le passage le plus difficile (passage du numérique au papier)

**Important :** Ces durées sont indicatives. L'observation de l'enfant prime toujours sur un calendrier prédéfini.
