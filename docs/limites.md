# Limites de RésoMolo

## Ce que l'outil fait

RésoMolo compense le **geste moteur** et l'**organisation spatiale** — il permet à l'enfant de construire un schéma propre et lisible sans crayon ni règle. L'outil ne résout rien, ne valide rien, ne calcule rien.

## Ce que l'outil ne fait PAS

### Pas d'aide au raisonnement

L'outil ne remplace pas :
- La compréhension du sens des opérations
- La connaissance des faits numériques (tables)
- La capacité de lire et comprendre un énoncé en français
- Le raisonnement logique lui-même

Si l'enfant ne comprend pas ce que signifie « 3 fois plus », le schéma en barre ne lui apparaîtra pas. L'outil rend la modélisation **possible** — l'adulte guide le **raisonnement**.

### Pas de validation

L'outil ne détecte jamais d'erreur. Un schéma incorrect n'est pas signalé. C'est un choix fondamental : l'outil est neutre comme une feuille de papier. Le feedback pédagogique vient de l'adulte accompagnateur.

### Pas de calcul

L'enfant tape l'opération ET le résultat. L'outil ne vérifie pas si `28 × 4 = 112` est correct. Si l'enfant écrit `28 × 4 = 102`, l'outil affiche `28 × 4 = 102` sans broncher.

## Situations où l'outil est insuffisant seul

### Grandes difficultés d'organisation spatiale

L'espace 2D libre peut rester ingérable même avec :
- Snap et alignement automatique
- Profil de tolérance « Très large »
- Bouton Ranger

**Mitigation :** Utiliser des fichiers `.resomolo` très structurés avec de nombreuses pièces verrouillées. L'enfant complète un schéma au lieu de le construire de zéro.

### Enfant ne pouvant pas lire l'énoncé

Si l'enfant ne lit pas encore (1er cycle, grandes difficultés en lecture), l'énoncé dans la zone problème n'est pas accessible. Le surlignage est impossible.

**Mitigation :** L'adulte lit le problème à voix haute. L'enfant travaille avec un cahier physique et la zone problème est laissée vide. L'outil reste utile pour la modélisation elle-même.

### Enfant sans aucune notion de correspondance nombre-quantité

Pour un enfant qui n'a pas encore la correspondance 1-à-1 (pré-numération), les jetons et les barres n'ont pas de sens. L'outil suppose un minimum de compréhension du nombre.

### Usage sans médiation adulte

L'outil seul ne produit pas le transfert vers la modélisation mentale. Sans médiation de l'adulte (verbalisation de la stratégie pendant la construction, questions de relance, estompage progressif), l'enfant risque de développer une dépendance à l'outil sans intérioriser les schémas.

## Limitations techniques

- **Pas de mode hors-ligne au premier lancement** — le Service Worker nécessite une première visite en ligne
- **Pas d'export PDF** au MVP — la modélisation est un artefact numérique
- **Pas de collaboration temps réel** — un seul utilisateur par appareil
- **Pas de banque de problèmes intégrée** — l'adulte fournit les problèmes
