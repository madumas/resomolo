# RésoMolo — Spécification

## 1. Vision

RésoMolo est un espace de travail numérique où l'enfant du primaire modélise visuellement un problème mathématique avant de le résoudre. L'enfant fait le raisonnement; l'outil lui permet de le rendre visible.

L'enfant ayant des difficultés motrices (Trouble Développemental de la Coordination) ne peut pas dessiner ses schémas sur papier. RésoMolo compense le geste moteur — pas le raisonnement. Comme GéoMolo pour la géométrie, mais pour la résolution de problèmes.

L'outil est utile à tout enfant en difficulté en résolution de problèmes. L'enfant ayant des difficultés motrices en bénéficie le plus, mais la modélisation visuelle est une stratégie universelle qui aide aussi les enfants ayant des difficultés en math (construction du sens du nombre), en lecture (traduction texte → schéma), en attention (ancrage visuel de chaque étape contre l'oubli), ou de l'anxiété de performance (point de départ concret au lieu de la page blanche).

## 2. Public

- **Principal :** Enfants du 2e cycle du primaire (3e-4e année, 8-10 ans), particulièrement ceux ayant des difficultés motrices
- **Aussi utile pour :** difficultés en lecture, en attention, anxiété de performance
- **Utilisateurs secondaires :** Parents (accompagnement aux devoirs), enseignants (lire le raisonnement)
- **Extensible :** 1er et 3e cycles dans des versions ultérieures

## 3. Principes fondamentaux

### 3.1 L'enfant raisonne, l'outil dessine

RésoMolo ne résout rien. Il ne valide rien. Il ne donne pas d'indices sur la solution. L'outil est un médiateur muet — comme une feuille de papier, mais qui compense le geste moteur et l'organisation spatiale.

La barre d'état fournit des **accusés de réception factuels** (« Barre placée », « Lien créé ») qui confirment que l'action a été exécutée. Ce ne sont pas des jugements — l'outil ne dit jamais si c'est bien ou mal.

### 3.2 Surlignage d'abord, modélisation ensuite

Quand un énoncé est présent et l'espace de travail est vide, l'outil propose le surlignage comme **premier geste par défaut**. La pastille bleue (données) est pré-sélectionnée et le canvas affiche un nudge doux : « Commence par lire le problème. Clique sur les nombres. » L'enfant clique sur les mots/nombres — chaque clic surligne et produit un feedback visible. Ce premier geste moteur trivial (cliquer sur un mot ne peut pas être « faux ») brise l'inertie d'initiation.

Quand l'enfant a surligné au moins un élément, le message du canvas change : « Place ta première pièce. » Les outils de la barre deviennent visuellement mis en évidence.

**Rien n'est bloquant.** L'enfant peut sauter le surlignage et cliquer directement sur un outil à tout moment. Mais le chemin proposé par défaut est : surligner d'abord, modéliser ensuite. L'outil ne juge pas la méthode.

Quand la zone problème est vide (cahier physique), le nudge est différent : « Tu peux commencer par placer un jeton ou une barre. » — nommer deux pièces concrètes au lieu de l'abstrait « ce que tu connais ».

### 3.3 Espace libre, pas séquence imposée

Après l'amorçage, aucune étape obligatoire. L'enfant utilise les pièces qu'il veut, dans l'ordre qu'il veut. Un enfant peut commencer par la réponse et remonter. Un autre commence par des jetons. L'outil ne juge pas la méthode.

### 3.4 La modélisation EST la trace de raisonnement

La construction de l'enfant est visible telle quelle — pas un rapport, pas une note. L'adulte (parent, enseignant) voit immédiatement où la pensée a fonctionné et où elle a déraillé.

### 3.5 Accessible à tous

Mêmes principes que GéoMolo : clic (pas drag obligatoire), snap et alignement automatique, grandes cibles (44×44px), pas de geste de précision, pas de right-click. L'accessibilité motrice est non négociable.

Le double-clic est implémenté silencieusement comme raccourci pour éditer, mais n'est jamais présenté ni enseigné. Le bouton contextuel « Éditer » est le seul chemin documenté.

### 3.6 Aligné PFEQ

Vocabulaire, types de problèmes, modes de représentation — tout correspond au Programme de formation de l'école québécoise, 2e cycle.

## 4. Tech Stack

- React 18+ avec TypeScript
- Vite comme outil de build
- SVG pour l'espace de travail interactif
- idb-keyval pour IndexedDB (persistance)
- vite-plugin-pwa pour Service Worker / offline
- Pas de backend — tout est client-side, pas de comptes, pas de cloud

Projet séparé de GéoMolo. Même stack, code indépendant.

## 5. Structure de l'interface

### 5.1 Disposition générale

```
┌─────────────────────────────────────────────────────────┐
│  RésoMolo  [Pièces...]  [Simplifié/Complet] [Problèmes] [⚙] │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │ Zone problème (toujours partiellement visible)    │  │
│  │ « Camille a lu 3 fois plus de pages que Théo... » │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │                                                   │  │
│  │              Espace de travail                    │  │
│  │                   (SVG)                           │  │
│  │                                                   │  │
│  │                                                   │  │
│  │                                                   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Barre d'action (⟲ Undo, ⟳ Redo, etc.)            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Barre d'état                                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Zone problème

Bandeau en haut de l'espace de travail. Affiche l'énoncé du problème.

- **Texte libre :** L'enfant peut taper ou coller un énoncé. Champ `contenteditable` ou `<textarea>`.
- **Fourni :** Via fichier `.modelivite`, URL query param (`?probleme=...`), ou vide (problème dans un cahier d'exercices physique).
- **Surlignage par mots :** L'enfant peut surligner le texte en 4 couleurs (bleu = données connues, orange = question, vert = contexte relationnel comme « de plus », « fois plus », « le reste », gris = superflu — données non pertinentes). Stratégie universelle en orthopédagogie pour la compréhension d'énoncés. La 4e couleur (gris, Superflu) soutient l'inhibition cognitive : l'enfant identifie explicitement les informations qu'il doit ignorer. **Interaction sans drag :** l'enfant choisit une pastille de couleur, puis clique sur les mots un par un. Un clic sur un mot adjacent à un mot déjà surligné de la même couleur étend la sélection. Un clic sur un mot non-adjacent crée un nouveau segment surligné. Un clic sur un mot déjà surligné le désélectionne. Zéro drag — compensation motrice complète. Chaque pastille de couleur affiche un label texte visible à l'intérieur (« Données », « Question », « Contexte », « Superflu ») plutôt que de reposer uniquement sur les tooltips. Amélioration d'accessibilité : les tooltips HTML ne fonctionnent pas sur tablette, et un enfant daltonien ne distingue pas les couleurs sans texte.
- **Mode compact :** Un clic replie la zone pour maximiser l'espace de travail. **Le mode replié n'est jamais vide** : il affiche toujours la première ligne du texte et les passages surlignés (données numériques) restent visibles dans un bandeau résumé. L'enfant n'a pas besoin de relire tout le texte pour retrouver « 100 $ ». Clic pour déplier et relire le texte complet.
- **Lecture seule quand fourni :** Si le problème vient d'un fichier ou URL, le texte est en lecture seule (le surlignage reste possible).
- **Sanitization :** `textContent` jamais `innerHTML` pour les params URL.
- **Vide par défaut :** L'enfant qui travaille avec un cahier physique laisse cette zone vide. L'outil fonctionne sans énoncé.
- **Redéploiement automatique :** Quand l'enfant place une pièce Réponse, la zone problème se déplie automatiquement si elle était compactée. Nudge subtil vers la vérification.

### 5.3 Espace de travail

Canvas SVG. Surface libre où l'enfant place ses pièces.

- **Fond :** Blanc ou légèrement teinté (#FAFCFF comme GéoMolo). Pas de grille visible par défaut (ce n'est pas un espace géométrique).
- **Système de coordonnées :** Un seul `<svg>` avec viewBox en millimètres (ex: `0 0 500 350`). Les coordonnées de toutes les pièces sont en mm. Le facteur d'échelle mm→px est implicite dans le ratio viewBox/taille DOM du SVG. Conversion clic→mm via `svgElement.getScreenCTM().inverse()`. Le seuil de drag (1,5mm physique) et les zones de snap sont convertis en mm du modèle à runtime via `physicalMm × viewBoxWidth / svgPhysicalWidthMm`.
- **Grille invisible de snap :** Les pièces s'alignent sur une grille invisible de 5mm dans le système de coordonnées du modèle. L'enfant ne voit pas la grille mais ses pièces s'alignent proprement.
- **Pas de pan ni de scroll.** Le canvas reste entièrement visible en tout temps. Justification accessibilité et UX-pédagogie : (1) un enfant ayant des difficultés motrices a besoin de voir l'ensemble de son modèle pour raisonner — un canvas navigable brise cette vue d'ensemble ; (2) la confusion entre « déplacer une pièce » et « déplacer le canvas » est un risque majeur pour cette population ; (3) les problèmes du primaire QC tiennent largement dans un viewport fixe bien organisé. Le bouton « Ranger » couvre le besoin de réorganisation spatiale. Si l'espace devient insuffisant, la solution est le dimensionnement responsive et l'auto-zoom adaptatif, pas le pan.
- **Ranger :** Bouton flottant en bas à droite du canvas, à côté de Voir tout (icône grille/alignement). Réorganise les pièces existantes pour maximiser la lisibilité. Algorithme simple : barres alignées à gauche en haut, jetons/boîtes au milieu, calculs en bas, réponse tout en bas ; espacement uniforme (15mm vertical, 10mm horizontal) ; ordre relatif préservé au sein de chaque groupe. Ne déplace PAS les pièces verrouillées. **Animation lente (400-500ms, ease-out)** — chaque pièce glisse vers sa nouvelle position. Pas de téléportation. L'animation est critique : avec animation, c'est rassurant ; sans, c'est désorientant. Pas de confirmation modale — l'undo suffit comme filet (un Ctrl+Z et tout revient). Les flèches ne sont pas réarrangées — elles suivent leurs pièces attachées. Barre d'état après : « Pièces réorganisées ». Cible 44×44px.
- **Zones sugérées :** Quand activé dans les paramètres, deux zones semi-transparentes ("Ton schéma" en haut, "Calcul et réponse" en bas) apparaissent comme guides visuels. Désactivées par défaut. Ne restreignent pas le placement des pièces.
- **Sélection :** Clic sur une pièce pour la sélectionner. Actions contextuelles (déplacer, éditer, supprimer) via barre d'actions comme GéoMolo.

### 5.4 Barre d'outils (pièces)

Une rangée de boutons, un par pièce. 44×44px minimum, 8px espacement. Icônes simples avec libellé texte dessous.

**Disclosure progressive :** Par défaut, 5 pièces visibles — **Jeton, Barre, Boîte, Calcul, Réponse** — les pièces les plus intuitives et suffisantes pour 80% des problèmes du 2e cycle (incluant les groupes égaux qui nécessitent la Boîte). Un bouton « Plus de pièces » donne accès à **Étiquette, Flèche, Déplacer**. Ce patron reprend le mode Simplifié de GéoMolo. L'adulte peut configurer la vue complète dans les paramètres.

```
Mode essentiel (défaut):
[Jeton] [Barre] [Boîte] [Calcul] [Réponse]  [Plus ▸]

Mode complet:
[Jeton] [Barre] [Boîte] [Calcul] [Réponse] [Étiquette] [Flèche] [Déplacer]
```

L'ordre en mode complet place les 5 pièces essentielles en premier, suivies des 3 pièces secondaires. L'enfant qui passe en mode complet retrouve ses repères.

La droite numérique et le tableau sont disponibles en mode Complet. La grille de calcul est reportée (v2 — cycles 1 et 3).

**Pièces configurables :** Le fichier `.modelivite` peut restreindre les pièces disponibles via un champ `availablePieces`. Le parent ou l'enseignant peut préparer un problème avec seulement Barre + Calcul + Réponse. Réduit la charge de choix et simplifie l'utilisation.

### 5.5 Barre d'état

Comme GéoMolo. Affiche l'outil actif et le geste attendu. Fournit des accusés de réception factuels au placement.

- « Jeton — Clique pour placer un jeton »
- « Barre — Clique pour placer une barre »
- « Flèche — Clique sur l'élément de départ »
- Après placement : « Barre placée » / « Lien créé » / « 3 jetons placés » (factuel, pas évaluatif)
- **Amorçage (énoncé présent, espace vide) :** « Commence par lire le problème. Clique sur les nombres. » — le surlignage est proposé comme premier geste.
- **Après surlignage (au moins un mot surligné, aucune pièce) :** « Place ta première pièce. »
- **Amorçage (pas d'énoncé, espace vide) :** « Tu peux commencer par placer un jeton ou une barre. » — nommer deux pièces concrètes réduit le champ de choix.
- **Amorçage (énoncé présent, pièces verrouillées pré-placées) :** « Des pièces sont déjà placées. Complète le schéma. » — l'enfant comprend qu'il doit ajouter, pas repartir de zéro.
- **Suggestions procédurales :** Les messages procéduraux (« Tu peux nommer tes barres... ») utilisent le style par défaut de la barre d'état.
- **Relances métacognitives :** Les relances PFEQ (questions « Que sais-tu? », etc.) utilisent un style visuel distinct (violet) pour les différencier des messages procéduraux.
- **Questions de relance :** Deux déclencheurs complémentaires :
  1. **Relance initiale :** Quand aucune pièce n'est placée depuis `relanceDelayMs` (défaut 30s, plancher 30s), indépendamment du surlignage. Affiche les trois questions PFEQ **une à la fois en séquence** : « Que sais-tu? » → (délai) → « Que cherches-tu? » → (délai) → « Qu'est-ce qui se passe dans l'histoire? ». Après la 3e, reste sur la dernière. Toute interaction réinitialise.
  2. **Relance d'inactivité :** Quand aucune *nouvelle action* (placement, édition, déplacement, surlignage) n'est détectée depuis `relanceDelayMs`, même si des pièces existent déjà. Un enfant qui a placé un jeton puis reste bloqué doit recevoir du soutien. Mêmes questions, même séquence.
  3. **Relance « Check » post-réponse (CO-OP) :** Quand l'enfant place sa pièce Réponse et écrit du texte, la barre d'état affiche après 5 secondes : « Relis le problème. Est-ce que ta réponse répond à la question? ». Cette relance métacognitive renforce la phase *Check* du modèle CO-OP (Polatajko & Mandich, 2004).
  - Désactivable dans les paramètres.

### 5.6 En-tête

L'en-tête contient : Logo RésoMolo, Toolbar (pièces), sélecteur Simplifié/Complet, bouton Problèmes. Undo/Redo sont dans la barre d'action en bas.

- **Logo/nom :** RésoMolo
- **Toolbar (pièces) :** Intégrée dans l'en-tête (voir §5.4)
- **Sélecteur Simplifié/Complet :** Bascule entre les modes de pièces
- **Bouton Problèmes :** Accès à la banque de problèmes. Le sélecteur de problèmes ne montre pas de niveaux de difficulté à l'élève. Le filtrage se fait par cycle et type de problème uniquement.
- **Recommencer :** Bouton qui vide les pièces mais garde l'énoncé du problème. Confirmation requise (« Effacer les pièces et recommencer? »). Distinct de « Nouvelle modélisation » qui crée un nouveau slot. Soutient la flexibilité cognitive : recommencer à zéro est parfois la meilleure stratégie.
- **Paramètres :** Bouton ⚙

## 6. Les pièces — MVP (2e cycle)

### 6.1 Jeton

**Quoi :** Un rond coloré représentant une unité de n'importe quoi.

**Placement :** Clic dans l'espace → un jeton apparaît. Raccourci : quand l'outil Jeton est actif, un champ compact apparaît dans la barre d'état : « Quantité : [1] ». L'enfant peut taper un nombre (max 50) pour placer plusieurs jetons d'un coup, alignés en rangée.

**Apparence :** Rond de 8mm de diamètre. Couleur au choix (4 couleurs : bleu, rouge, vert, jaune). Couleur par défaut : bleu. Changement de couleur via sélection + action contextuelle.

**Snap :** Les jetons se placent sur la grille invisible. Quand placés dans une Boîte, ils s'alignent automatiquement en rangées à l'intérieur.

**Interactions :**
- Clic : placer un jeton (ou N jetons)
- Sélection + Déplacer : pick-up / put-down (comme GéoMolo)
- Sélection + Supprimer : retirer le jeton

### 6.2 Boîte

**Quoi :** Un rectangle qui regroupe des éléments. Représente un ensemble, un groupe, un contenant.

**Placement :** Clic dans l'espace → une boîte apparaît avec une taille par défaut.

**Apparence :** Rectangle avec bordure pointillée, fond transparent légèrement teinté. Coin arrondi (4px). Étiquette optionnelle en haut (voir 6.3).

**Auto-dimensionnement :** La boîte s'agrandit automatiquement quand on y place des éléments. L'enfant n'a presque jamais besoin de la redimensionner manuellement. Si nécessaire, redimensionnement via poignée de coin (deux-clics : clic poignée → déplacer → clic pour fixer).

**Contenance :** Le `parentId` du jeton est la source de vérité. L'affectation est automatique par hit-test géométrique :
- **Entrée :** Quand un jeton est déposé et que son centre est à moins de 10mm du bord intérieur d'une boîte, `parentId` est mis à l'id de la boîte. Le jeton est repositionné sur la grille interne (auto-alignement en rangées). Son de snap + haptique pour confirmer l'entrée.
- **Sortie :** Quand un jeton avec `parentId` est déposé à plus de 10mm du bord intérieur de sa boîte parente, `parentId` est mis à null. Le jeton devient libre.
- **Déplacement de boîte :** Les jetons contenus se déplacent avec la boîte (offset relatif préservé).
- **Suppression de boîte :** Les jetons contenus deviennent libres, conservent leurs coordonnées absolues.

**Interactions :**
- Clic : placer une boîte
- Sélection + Déplacer : déplacer avec contenu
- Sélection + Supprimer : supprimer la boîte (micro-confirmation « Sûr? » si elle contient des éléments)

### 6.3 Étiquette

**Quoi :** Du texte libre. Sert à nommer, quantifier, annoter.

**Placement :** Clic dans l'espace → un champ de texte apparaît, curseur actif, l'enfant tape. Entrée ou clic ailleurs pour valider.

**Apparence :** Texte simple, fond légèrement grisé (#F0F2F5), coins arrondis, padding 4px 8px. Police 14px minimum. Pas de bordure visible sauf au survol/sélection.

**Attachement :** Une étiquette peut être attachée à une pièce (boîte, barre, jeton, flèche). Quand placée sur ou très près d'une pièce, elle s'y attache (snap). Quand la pièce est déplacée, l'étiquette suit. Une étiquette peut aussi être libre (pas attachée).

**Interactions :**
- Clic : placer et saisir le texte
- Sélection + bouton Éditer : modifier le texte (double-clic fonctionne mais n'est pas documenté)
- Sélection + Déplacer : repositionner
- Sélection + Supprimer : retirer

**Pas de limite de caractères arbitraire.** L'étiquette s'élargit avec le texte. Retour à la ligne automatique à ~200px de largeur.

### 6.4 Flèche

**Quoi :** Un lien directionnel entre deux éléments. Représente une relation ou une transformation.

**Placement :** Deux clics. Clic sur l'élément de départ → clic sur l'élément d'arrivée → la flèche apparaît entre les deux. Les deux extrémités doivent être des pièces existantes (pas de flèche libre au MVP).

**Apparence :** Ligne avec pointe de flèche. Couleur : gris foncé (#4A5568). Épaisseur : 2px. Ligne droite si les éléments sont alignés, courbe de Bézier simple sinon (point de contrôle au milieu). Pas de routage autour des obstacles au MVP (v2).

**Étiquette de flèche :** Après le placement de la flèche, un champ texte apparaît au milieu de la flèche. L'enfant peut taper une annotation (« donne », « ×3 », « +5 », « en tout ») ou laisser vide et appuyer Entrée. L'étiquette est optionnelle.

**Interactions :**
- Clic sur départ + clic sur arrivée : créer la flèche
- Sélection + Éditer étiquette
- Sélection + Supprimer : retirer la flèche
- Flèche attachée aux éléments : suit leur déplacement
- **Suppression en cascade :** Si un élément source ou cible est supprimé, la flèche attachée est supprimée aussi (pas de flèche orpheline). Même comportement pour les étiquettes attachées à un élément supprimé.

### 6.5 Barre

**Quoi :** Un rectangle horizontal représentant une quantité proportionnelle. La pièce centrale pour les schémas en barre (partie-tout, comparaison, multiplication). C'est la pièce qui transforme le raisonnement — elle rend visible les relations abstraites (multiplicatives, fractionnaires, partie-tout) que l'enfant ne peut pas dessiner à la main.

**Placement :** Clic dans l'espace → une barre apparaît avec une taille par défaut (unité de référence, ~60mm).

**Apparence :** Rectangle horizontal, fond coloré semi-transparent, bordure solide. Hauteur fixe (~15mm). Couleur au choix (4 couleurs).

**Unité de référence :** 1× = 60mm par défaut. **Auto-scaling :** si une barre dépasse la largeur utile du canvas (470mm), `referenceUnitMm` est automatiquement réduit (plancher : 10mm) pour que toutes les barres tiennent. Quand la barre la plus large est supprimée, l'unité remonte vers 60mm. L'enfant ne configure rien. Le rapport visuel entre les barres est toujours correct (une barre 3× est toujours visuellement 3 fois plus longue qu'une barre 1×). En pratique, au 2e cycle, les multiples dépassent rarement 5×, donc 60mm fonctionne presque toujours sans ajustement sur un Chromebook.

**Opérations sur les barres :**

- **Tailles prédéfinies :** Mode principal de dimensionnement. Actions contextuelles : « 1× » à « 10× ». Chaque bouton redimensionne la barre à N fois la taille de l'unité de référence. L'enfant clique « 3× » et obtient une barre 3 fois plus longue que la barre unitaire. Le multiplicateur va jusqu'à 10× pour couvrir les problèmes du 3e cycle (ex. : « 28 élèves × 4 $ »). Pas de redimensionnement libre par poignée — la taille par multiples entiers est plus intuitive et évite le geste moteur continu de redimensionnement.
- **Copier :** Action contextuelle « Copier [N] ». Un champ compact demande « Combien de copies? [1] ». L'enfant tape 2 et obtient 3 barres au total (originale + 2 copies), alignées verticalement, de même taille. Un seul geste au lieu de copier une par une. C'est ainsi que l'enfant construit « 3 fois plus ».
- **Égaliser :** Deux clics. Sélectionner une barre → action contextuelle « Même taille » → cliquer sur la barre cible. La cible prend la taille de la barre sélectionnée. Pas de multi-sélection nécessaire — cohérent avec le pattern deux-clics.
- **Subdiviser :** Action contextuelle « Diviser ». L'enfant choisit parmi des boutons prédéfinis (2, 3, 4, 6, 8, 10, 12) — pas de saisie texte libre (difficile pour les enfants). La barre affiche des divisions internes. Chaque part peut être colorée individuellement (clic pour colorer/décolorer). Pour les fractions.
- **Grouper :** Pattern deux-clics simple : sélectionner une barre → action « Grouper » → cliquer sur les barres à ajouter au groupe → Escape pour terminer. Pas de multi-sélection Shift+clic (geste trop complexe pour un enfant). Les barres partagent un `groupId`. Une accolade apparaît automatiquement en dessous avec un champ étiquette pour le total. L'accolade est un **élément visuel généré** (pas une pièce dans `pieces[]`) — son étiquette est stockée dans un champ `groupLabel` du groupe. L'accolade avec le total est le geste visuel central du schéma en barre — elle n'est pas optionnelle. « Dégrouper » (action contextuelle) sépare les barres et retire l'accolade en une seule opération atomique (un seul Ctrl+Z pour annuler).

**Alignement automatique :** Quand une barre est placée près d'une autre barre (verticalement, rayon 15mm), elle s'aligne à gauche automatiquement (snap). Critique pour les comparaisons — les barres doivent commencer au même point pour que la différence soit visible.

**Interactions :**
- Clic : placer une barre
- Sélection + 1×/2×/3×/4×/5× : taille prédéfinie
- Sélection + Copier [N] / Diviser / Même taille / Grouper
- Sélection + Couleur
- Sélection + Déplacer
- Sélection + Supprimer

**Message factuel post-réponse :** Quand l'enfant a placé des pièces de modélisation, un calcul et une réponse, la barre d'état affiche : « Tu as écrit ta réponse. Relis le problème pour vérifier. » -- message factuel, jamais évaluatif.

### 6.6 Calcul

**Quoi :** Un espace d'écriture d'opération mathématique. L'enfant tape l'expression ET le résultat — l'outil ne calcule rien. C'est de la compensation motrice (écriture propre et alignée), pas cognitive. L'enfant qui a besoin d'une calculatrice a sa calculatrice à côté. RésoMolo modélise, la calculatrice calcule — chaque outil a sa mission.

**Placement :** Clic dans l'espace → un champ apparaît avec curseur actif.

**Deux modes :**

#### Mode expression (défaut)

Pour les opérations simples ou le calcul mental. L'enfant tape tout sur une ligne :

- L'enfant tape `6 + 3 = 9` → l'outil affiche `6 + 3 = 9`
- L'enfant tape `28 * 4 = 112` → l'outil affiche `28 × 4 = 112`
- L'enfant tape `24 / 5 = 4 reste 4` → l'outil affiche `24 ÷ 5 = 4 reste 4`

L'outil formate (conversion `*` → `×`, `/` → `÷`, `.` → `,`, police monospace) mais **ne calcule pas le résultat**. L'enfant écrit le résultat lui-même.

#### Mode colonnes (action contextuelle « En colonnes »)

Pour les opérations multi-chiffres. Une grille où chaque chiffre a sa propre case. Compense le déficit d'alignement spatial — la difficulté motrice #1 en calcul écrit pour les enfants ayant des difficultés motrices (Mazeau & Pouhet, 2014).

```
┌──────────────┐
│      ³       │   ← espace retenue (optionnel, l'enfant tape)
│   [2] [8]    │   ← un chiffre par case, aligné par valeur de position
│ × [ ] [4]    │   ← opérateur pré-placé à gauche
│ ──────────   │   ← ligne automatique
│ [1] [1] [2]  │   ← l'enfant tape chaque chiffre du résultat
└──────────────┘
```

L'outil fournit :
- **Cases alignées par valeur de position** (unités sous unités, dizaines sous dizaines) — compensation motrice directe
- **Espace de retenue** en petit au-dessus — l'enfant le remplit s'il en a besoin
- **Ligne de séparation** automatique
- **Navigation par Tab :** Opérandes de gauche à droite (ordre de lecture). Résultat de **droite à gauche** (ordre du calcul écrit). Après chaque chiffre du résultat, Tab va à la case retenue de la colonne suivante, puis au chiffre résultat de cette colonne. L'enfant peut aussi cliquer directement dans n'importe quelle case.

L'outil ne fournit **rien d'autre**. Pas de calcul automatique, pas de vérification, pas de détection d'erreur. L'enfant fait toute l'arithmétique.

**Opérations supportées en mode colonnes :** Addition, soustraction, multiplication multi-chiffres (ex: 28×14 avec lignes intermédiaires automatiques), division (l'opérateur ÷ est disponible dans le sélecteur). Note : le layout spécifique à la division longue (diviseur à gauche, quotient en haut, format nord-américain québécois) est planifié en v1.1.

**Implémentation technique :** Les cases de saisie sont des `<input>` dans un `<foreignObject>` SVG unique englobant toute la grille. Pas de foreignObject par case (performance).

**Passage entre modes — deux flux :**

1. **Transition expression → colonnes :** L'enfant a déjà tapé « 28 × 4 » en mode expression. Il clique « En colonnes ». L'outil transfère les opérandes et l'opérateur dans la grille : les chiffres sont pré-placés dans les bonnes cases (unités sous unités, dizaines sous dizaines), l'opérateur est placé à gauche. La ligne de résultat et les retenues sont **vides** — l'enfant doit les remplir. C'est un reformatage de ce que l'enfant a déjà saisi, pas un calcul.

2. **Création directe en colonnes :** L'enfant clique Calcul puis « En colonnes » sans rien avoir écrit. L'outil affiche une grille minimale de 3 colonnes avec un sélecteur d'opérateur (+, −, ×, ÷) sur la deuxième ligne. L'enfant tape ses chiffres dans les cases. Si l'enfant a besoin de plus de colonnes (nombre à 4 chiffres), une colonne s'ajoute automatiquement quand il tape dans la case la plus à gauche. La grille grandit avec les besoins — même patron que la Boîte qui s'agrandit quand on y met des jetons.

Par défaut, mode expression (le plus simple).

**Opérateurs supportés :** `+`, `-`, `×` (ou `*` au clavier → affiché `×`), `÷` (ou `/` au clavier → affiché `÷`).

**Pas de parenthèses, pas de priorité d'opérations complexe.** Un calcul = une opération. Si l'enfant a besoin de chaîner, il place plusieurs calculs. Décision pédagogique : chaque étape de raisonnement est un calcul séparé et visible.

**Apparence :** Encadré léger, police monospace, fond blanc, bordure fine (#D1D5DB). Taille de texte 16px. En mode colonnes, cases de 10×12mm physiques (~38×46px CSS à 96dpi, ~54×64px à 135dpi Chromebook) avec bordure fine, espacement 2px. Suffisamment grandes pour un doigt ou un clic imprécis.

**`inputmode="decimal"`** sur les champs de saisie (clavier numérique sur tablette). Repositionner le champ en haut du canvas quand le clavier virtuel est détecté (comme GéoMolo).

**Format :** Virgule française pour les décimaux (l'enfant peut taper un point, il sera affiché comme virgule).

**Interactions :**
- Clic : placer et saisir
- Sélection + Éditer : modifier l'expression
- Sélection + En colonnes / En ligne : changer de mode
- Sélection + Déplacer : repositionner
- Sélection + Supprimer : retirer

### 6.7 Réponse

**Quoi :** Un encadré distinctif pour la réponse finale en phrase.

**Placement :** Clic dans l'espace → un champ texte apparaît dans un encadré mis en évidence.

**Apparence :** Encadré avec bordure plus épaisse (2px), couleur distinctive (bleu #185FA5), fond blanc, libellé « Réponse » en petit au-dessus. Police 14px.

**Contenu :** Texte libre. L'enfant écrit sa réponse en phrase (« Théo a lu 15 pages ») ou juste le nombre (« 15 pages »). Pas de validation.

**Gabarits de réponse :** L'enfant peut choisir parmi des amorces syntaxiques : « Il en reste ___ . », « Chaque ___ reçoit ___ . », « ___ a ___ de plus que ___ . », « ___ a ___ fois plus que ___ . », « En tout, il y a ___ . », « La réponse est ___ . ». Ils fournissent la structure de phrase sans contenu mathématique.

**Unicité :** Un seul encadré Réponse par espace de travail. Si l'enfant clique Réponse alors qu'il en existe déjà un, l'existant est sélectionné et le curseur y est placé.

**Interactions :**
- Clic : placer et saisir (ou sélectionner l'existant)
- Sélection + Éditer
- Sélection + Supprimer : retirer

## 7. Interactions — Principes d'accessibilité

### 7.1 Deux modes pour chaque action

Comme GéoMolo : chaque action qui pourrait nécessiter un drag a une alternative deux-clics.

- **Déplacer :** Sélectionner la pièce → bouton Déplacer → la pièce suit le curseur → clic pour déposer.
- **Redimensionner (boîte) :** Clic sur la poignée → la poignée suit le curseur → clic pour fixer. Alternative drag disponible.

### 7.2 Sélection et actions contextuelles

Clic sur une pièce = sélection. Une barre d'actions contextuelles apparaît près de la pièce sélectionnée (comme GéoMolo `ContextActions`).

Actions disponibles selon la pièce :

| Pièce | Actions |
|---|---|
| Jeton | Déplacer, Couleur, Supprimer (micro-confirmation « Sûr? ») |
| Boîte | Déplacer, Supprimer (micro-confirmation « Sûr? ») |
| Étiquette | Éditer, Déplacer, Supprimer (micro-confirmation « Sûr? ») |
| Flèche | Éditer étiquette, Supprimer (micro-confirmation « Sûr? ») |
| Barre | **Niveau 1 (L1) :** Nommer, Taille (sous-menu : 1×-5×), Copier [N], Supprimer (micro-confirmation « Sûr? ») — **Niveau 2 (L2 « Plus... ») :** Valeur, Fraction, Grouper/Dégrouper, Couleur |
| Calcul | Éditer, En colonnes / En ligne, Déplacer, Supprimer (micro-confirmation « Sûr? ») |
| Réponse | Éditer, Déplacer, Supprimer (micro-confirmation « Sûr? ») |

Le profil Aide maximale aplatit les deux niveaux (L1 + L2) en un seul niveau — toutes les actions sont visibles directement.

Boutons 44×44px, espacement 8px. Suppression avec micro-confirmation (comme GéoMolo) : le bouton passe en rouge et affiche « Sûr? » pendant 2s.

**Nombre de clics pour la barre :** Le flux « placer une barre, l'étiqueter, la dupliquer 2 fois, aligner » doit se faire en moins de 8 clics. Si c'est plus, l'interaction est trop lourde. Benchmark : sur papier, c'est 3 traits de crayon (mais imprécis). L'outil doit être plus lent que le papier mais produire un résultat infiniment plus propre.

### 7.3 Snap et alignement

- **Grille invisible :** Pas de grille visible, mais les pièces se placent sur une grille de 5mm.
- **Profils de tolérance :** Comme GéoMolo — Normal, Large (×1,5 pour 8-9 ans), Très large (×2,0 pour difficultés motrices importantes). Configurable dans les paramètres. Les profils appliquent un multiplicateur (Normal: 1.0, Large: 1.5, Très large: 2.0) aux distances de snap, seuil de drag et padding de hit-test. Le debounce de clic est mis à l'échelle par √m (racine carrée du multiplicateur) pour éviter des délais excessifs. La grille de snap (5mm) n'est pas mise à l'échelle.
- **Alignement entre pièces :** Quand une pièce approche de l'alignement horizontal ou vertical avec une autre pièce, elle snape. Guides visuels temporaires (ligne pointillée fine) apparaissent pour montrer l'alignement. Seuil de déclenchement généreux.
- **Barres : alignement gauche automatique.** Quand une barre est placée dans un rayon vertical de 15mm d'une autre barre, elle s'aligne à gauche sur celle-ci.
- **Jetons dans boîte : alignement en rangées.** Les jetons placés dans une boîte s'organisent automatiquement en rangées.
- **Snap d'attachement :** Étiquette → pièce, Flèche → pièce. Tolérance 7mm (profil Normal).

### 7.4 Escape = annulation

Même hiérarchie que GéoMolo :
1. Fermer un dialogue ouvert
2. Annuler l'action en cours (flèche à moitié créée, texte en édition, mode « Même taille » en attente)
3. Désélectionner la pastille de surlignage active
4. Désélectionner la pièce sélectionnée
5. Revenir à aucun outil actif

### 7.5 Undo/Redo

100 niveaux. Chaque placement, déplacement, édition, suppression est un pas d'undo. Persisté en IndexedDB.

### 7.6 Confirmation destructive

Les actions irréversibles (Recommencer, Reset) déclenchent un dialogue de confirmation modal avec deux boutons (Annuler / Confirmer). Pas de confirmation pour la suppression de pièce individuelle (le mécanisme « Sûr? » en 2 secondes sur le bouton Supprimer suffit).

### 7.7 Seuil de drag

1,5mm physique (~8px CSS à 135dpi). Mouvement < 1,5mm depuis pointerdown = clic, pas drag. Comme GéoMolo. Converti en CSS px à runtime via `devicePixelRatio`.

### 7.8 Debounce de clic

150ms entre deux clics consécutifs sur le canvas. Prévient le double-tap accidentel.

### 7.9 Pas de raccourcis clavier par défaut

Comme GéoMolo. Les raccourcis sont disponibles mais désactivés par défaut (activables dans les paramètres).

### 7.10 PointerEvent

Toutes les interactions canvas via PointerEvent (pas MouseEvent). Support stylus/touch natif.

### 7.11 Lissage du curseur

Filtre de lissage optionnel (comme GéoMolo `cursor smoothing filter`) pour lisser les mouvements tremblants pendant le déplacement de pièces. Filtre les micro-tremblements pour les enfants avec instabilité motrice. Utile pour les enfants ayant des difficultés motrices.

## 8. Persistance

### 8.1 Auto-save

Sauvegarde automatique en IndexedDB (via idb-keyval) après chaque action, vers le slot actif (`modelivite_slot_{id}`). Debounce 2s. Sur `beforeunload`, sauvegarde synchrone d'urgence en localStorage (`modelivite_emergency`). Au chargement, le flux de restauration compare la sauvegarde IndexedDB du slot et la sauvegarde d'urgence, et prend celle avec le plus de pièces (heuristique « plus récent »). La sauvegarde d'urgence est consommée (supprimée) après lecture.

### 8.2 Slots

Comme GéoMolo. « Mes modélisations » — plusieurs emplacements nommés. L'enfant peut nommer chaque modélisation (« Problème p.34 », « Examen mardi », etc.). Chaque slot affiche sa date de création et de dernière modification dans le sélecteur.

### 8.3 Format de fichier

`.modelivite` — fichier JSON exportable/importable.

Structure :
```json
{
  "version": 1,
  "name": "Problème p.34",
  "probleme": "Camille a lu 3 fois plus de pages que Théo...",
  "problemeReadOnly": true,
  "problemeHighlights": [
    { "start": 20, "end": 33, "color": "bleu" }
  ],
  "availablePieces": null,
  "referenceUnitMm": 60,
  "pieces": [
    { "type": "barre", "id": "b1", "x": 100, "y": 200, "sizeMultiplier": 1, "couleur": "bleu", "locked": false },
    { "type": "barre", "id": "b2", "x": 100, "y": 240, "sizeMultiplier": 3, "couleur": "bleu", "locked": false },
    { "type": "etiquette", "id": "e1", "x": 60, "y": 200, "text": "Théo", "attachedTo": "b1", "locked": false },
    { "type": "fleche", "id": "f1", "x": 0, "y": 0, "fromId": "b1", "toId": "b2", "label": "×3", "locked": false },
    { "type": "calcul", "id": "c1", "x": 100, "y": 320, "mode": "expression", "expression": "45 ÷ 3 = 15", "locked": false },
    { "type": "reponse", "id": "r1", "x": 100, "y": 380, "text": "Théo a lu 15 pages", "locked": false }
  ]
}
```

**`availablePieces`** : Si non-null, liste les types de pièces disponibles (ex: `["barre", "calcul", "reponse"]`). La barre d'outils n'affiche que ces pièces. Pour la différenciation pédagogique et l'estompage progressif.

**`locked`** : Les pièces avec `locked: true` ont leur **position verrouillée** (non déplaçables, non supprimables) mais certaines **propriétés restent éditables** : l'étiquette attachée peut être remplie, la couleur peut être changée. La taille d'une barre verrouillée est fixée par l'adulte préparateur — l'enfant ne la redimensionne pas. Le parent ou l'enseignant prépare un schéma partiellement complété (échafaudage) : par exemple, deux barres alignées de bonne taille avec des étiquettes vides « ? » que l'enfant doit remplir, puis il ajoute son Calcul et sa Réponse. Compense le déficit de planification : l'enfant démarre avec une structure au lieu d'un espace vide. Visuellement, les pièces verrouillées affichent une icône cadenas (#9CA3AF) au coin supérieur-droit (tous types de pièces) et une bordure grise (#9CA3AF) pour les barres.

### 8.4 Import d'un problème

- **URL :** `?probleme=Camille%20a%20lu...` — le texte peuple la zone problème en lecture seule.
- **Fichier `.modelivite` :** Si le fichier contient un champ `probleme` non vide, il est affiché. Si le fichier contient aussi des pièces, c'est un travail existant qui est restauré (ou un échafaudage avec pièces verrouillées).

### 8.5 Confirmation de fermeture

`beforeunload` quand l'espace contient des pièces. Comme GéoMolo.

## 9. Paramètres

### 9.1 Accessibilité

- **Taille de texte :** 1× / 1,25× / 1,5× (comme GéoMolo)
- **Raccourcis clavier :** Désactivés / Activés (défaut : désactivés)
- **Contraste élevé :** Mode haut contraste (bordures plus épaisses, couleurs plus saturées)
- **Tolérance de snap :** Normal / Large / Très large (défaut : Normal)
- **Lissage du curseur :** Désactivé / Activé (défaut : désactivé). Alpha EMA configurable (0.15 à 0.40, défaut 0.30) pour s'adapter aux profils de tremor variés.

### 9.2 Sons et feedback

Trois modes, comme GéoMolo (Web Audio API, 50ms synthétisé) :

- **Désactivés :** Silence total.
- **Réduit (défaut) :** Son au placement d'une pièce + son de snap (quand une barre s'aligne sur une autre, quand une étiquette s'attache). Ces deux sons sont les plus importants : ils confirment que l'action est « en place » sans vérification visuelle. Compensation proprioceptive directe.
- **Complet :** Tout ci-dessus + son d'attachement (étiquette → pièce, flèche → pièce), son de subdivision (barre divisée), son de validation (réponse écrite).

**Feedback haptique :** Vibration 30ms (via `navigator.vibrate`) au placement de pièce et au snap, sur les appareils supportés. Compensation proprioceptive pour les tablettes tactiles. Même approche que GéoMolo.

**Gain :** Curseur de volume (0-1).

### 9.3 Préférences

- **Main dominante :** Gauche / Droite — positionne la barre d'actions du côté opposé
- **Pièces visibles :** Essentiel (5 pièces) / Complet (8 pièces) (défaut : Essentiel)
- **Questions de relance :** Activées / Désactivées (défaut : activées). Les questions métacognitives dans la barre d'état. Plancher configurable : 30 secondes minimum (pas 5s — anxiogène pour les enfants lents mais actifs).
- **Problème toujours visible :** Activé / Désactivé (défaut : désactivé). Quand activé, la zone problème ne peut pas être réduite en mode compact. Recommandé pour les enfants avec faible mémoire de travail.
- **Zones sugérées :** Activées / Désactivées (défaut : désactivées). Affiche des zones guides semi-transparentes sur le canevas.
- **Compteur de jetons :** Activé / Désactivé (défaut : activé). Affiche un décompte par couleur en bas du canvas (« 5 bleus, 3 rouges »). Soutient le dénombrement pour les enfants dyscalculiques.

### 9.5 Profils prédéfinis

Raccourcis pour configurer plusieurs paramètres d'un coup. L'enseignant sélectionne un profil puis peut ajuster individuellement.

| Profil | Tolérance | Lissage | Relance | Sons | Texte | Problème visible |
|---|---|---|---|---|---|---|
| **Aide légère** | Normal | Désactivé | 45s | Réduit | 1× | Non |
| **Aide maximale** | Très large | Activé (0.20) | 30s | Complet | 1.25× | Oui |
| **Aide + Minuterie** | Large | Désactivé | 30s | Réduit | 1× | Oui |
| **Aide + Gros texte** | Normal | Désactivé | 45s | Complet | 1.5× | Oui |
| **Personnalisé** | (valeurs manuelles) | | | | | |

### 9.4 Minuteur de session

**Minuteur de session :** Activé / Désactivé (défaut : désactivé). Durée configurable (5-60 minutes, défaut 20 min). Alerte douce (visuelle, pas d'interruption forcée) quand le temps est écoulé. Destiné aux enfants ayant besoin d'un cadre de temps.

### 9.5 Stockage

- **Exporter :** Sauvegarder en fichier `.modelivite`
- **Importer :** Charger un fichier `.modelivite`
- **Nouvelle modélisation :** Bouton rouge, isolé, avec confirmation

## 10. Apparence

### 10.1 Palette

Même famille que GéoMolo, adaptée au contexte :

- **Fond canvas :** #FAFCFF
- **Pièces — bordures :** #185FA5 (bleu GéoMolo)
- **Pièces — remplissage :** Variantes légères du bleu, semi-transparentes
- **Étiquettes :** #1A2433 (texte foncé)
- **Flèches :** #4A5568 (gris foncé)
- **Calcul — résultat :** #185FA5 (bleu)
- **Réponse — bordure :** #185FA5 (bleu), 2px
- **Suppression :** #C82828 (rouge)
- **Fond UI :** #F5F7FA
- **Surlignage zone problème :** Bleu #C5D9F0, Orange #F5D5C0, Vert #C5E8D5, Gris #D5D5D5 (Superflu)

### 10.2 Couleurs des pièces

Quatre couleurs pour jetons et barres :
- Bleu : #185FA5 (défaut)
- Rouge : #C24B22
- Vert : #0B7285
- Jaune : #B8860B

Choix par action contextuelle sur la pièce sélectionnée.

### 10.3 Polices

- **UI :** System font stack (comme GéoMolo)
- **Canvas :** 14px minimum. Ajustable via paramètre de taille de texte.
- **Calcul :** Police monospace pour l'alignement des chiffres

### 10.4 Points de contact

Minimum 44×44px pour tous les éléments interactifs. Espacement 8px minimum entre boutons adjacents.

## 11. Accessibilité

### 11.1 Accessibilité motrice — non négociable

- Deux-clics pour tout (drag toujours disponible en alternative)
- Snap et alignement automatique avec profils de tolérance
- Seuil de drag 1,5mm physique
- Debounce de clic 150ms
- Pas de raccourcis clavier par défaut
- Double-clic implémenté silencieusement, jamais documenté; le bouton Éditer est le seul chemin enseigné
- Pas de right-click
- Pas de geste de précision
- Pas de timeout sur les champs de saisie
- Feedback sonore et haptique au placement et au snap (défaut : réduit)
- Repositionner les champs de saisie en haut du canvas quand le clavier virtuel est détecté (tablette)

### 11.2 Compensation cognitive

Au-delà de la compensation motrice, l'outil compense aussi les difficultés d'organisation visuospatiale et de planification :

- **Snap et alignement automatique :** L'espace se structure sans effort conscient de l'enfant
- **Bouton Ranger :** Réorganise l'espace quand il devient chaotique
- **Bouton Ranger :** Réorganise l'espace quand les pièces débordent ou se chevauchent
- **Disclosure progressive :** 5 pièces au lieu de 8 réduit la charge de choix
- **Pièces configurables :** L'adulte peut restreindre les choix par problème
- **Pièces verrouillées :** L'adulte peut fournir un échafaudage de départ
- **Recommencer :** Repartir à zéro sans perdre l'énoncé
- **Zone problème toujours partiellement visible :** Les données numériques restent accessibles sans switch cognitif

### 11.3 WCAG

- Contraste AA sur tous les textes
- Focus visible (outline) sur tous les éléments interactifs
- Navigation clavier dans l'UI (Tab/Entrée) via éléments HTML sémantiques
- `aria-label` sur les boutons d'outils
- `inputmode="decimal"` sur les champs numériques

### 11.4 Barre d'état

Toujours visible. Affiche l'outil actif, le geste attendu, et les accusés de réception au placement.

## 12. Tutoriel

### 12.1 Principes

La première séance avec un nouvel outil détermine souvent l'adoption ou le rejet — un échec initial crée une aversion durable chez l'enfant ayant des difficultés motrices. Le tutoriel doit être un **succès garanti**. Il enseigne les gestes (comment placer une pièce), pas le raisonnement (quel schéma construire pour quel problème).

Pas de gamification : pas de badges, pas de score, pas de déblocage, pas de fanfare. Les sons de placement et de snap sont les mêmes qu'en mode normal. Animation subtile d'atterrissage au placement (scale 1.1→1.0, 200ms, ease-out) — feedback informationnel, pas célébration.

Chaque étape est **suggérée via la barre d'état**, jamais imposée. Si l'enfant saute une étape ou fait quelque chose de différent, le tutoriel continue. Si l'enfant place 6 jetons au lieu de 5, aucune erreur n'est signalée — l'outil ne valide pas, même dans le tutoriel.

### 12.2 Deux micro-problèmes

Le tutoriel utilise deux problèmes courts (< 3 minutes au total) pour montrer les deux pièces centrales : le jeton (problème additif) et la barre (problème multiplicatif). L'enfant découvre que la pièce appropriée dépend du type de problème.

**Problème 1 — additif (jeton) : ~1 minute**

> « Théo a 5 pommes. Il en donne 2 à Léa. Combien lui en reste-t-il? »

Barre d'état guidante :
1. « Clique sur les nombres importants pour les surligner en bleu. »
2. « Clique sur Jeton, puis clique 5 fois pour placer les pommes de Théo. »
3. « Tu peux écrire "Théo" à côté — clique sur Plus, puis Étiquette. » (optionnel, skippable)
4. « Clique sur Calcul et écris ton opération. »
5. « Clique sur Réponse et écris combien il en reste. »

> **Note :** L'étape 1 enseigne le surlignage, la fonctionnalité la plus distinctive de l'outil. L'étape 4 ne dicte pas le contenu du calcul — l'outil ne fournit jamais la réponse cognitive, même dans le tutoriel.

**Problème 2 — multiplicatif (barre) : ~1 minute**

> « Il y a 3 tables. Chaque table a 4 crayons. Combien y a-t-il de crayons en tout? »

> **Note :** Problème de groupes égaux (2e cycle) remplaçant la comparaison multiplicative (3e cycle) pour garantir l'accessibilité du tutoriel au plus bas cycle ciblé.

Barre d'état guidante :
1. « Clique sur Barre, puis clique dans le canvas pour placer une barre. »
2. « Sélectionne la barre et clique Copier pour en faire 2 copies. »
3. « Clique sur Calcul et écris ton opération. »
4. « Clique sur Réponse et écris ta réponse. »

**Fin du tutoriel :** La barre d'état affiche « Tu connais les pièces! » Le canvas se vide. L'enfant est en mode normal. Pas de récapitulatif, pas de cérémonie.

### 12.3 Rejouable

Le tutoriel est accessible à tout moment via les paramètres. En pratique, il sera rarement rejoué — son objectif est de briser l'inertie initiale, pas d'enseigner la modélisation. L'apprentissage réel vient de la pratique avec de vrais problèmes, médiée par l'adulte.

## 13. Partage et export

### 13.1 Lien partageable (enseignant → élève)

L'enseignant peut partager un problème (avec ou sans pièces pré-placées) via un lien URL. Bouton « Partager » (icône lien, 44×44) dans le header de la zone problème expanded. Masqué si le problème a été chargé via un lien (contexte élève — justification accessibilité : réduction de la charge visuelle). Au clic, un panneau inline s'expand sous le header avec : (1) lien copiable, (2) QR code téléchargeable/copiable (160×160px minimum pour scan fiable).

Format URL : `?probleme=texte` (texte seul) ou `?s=<lz-compressed>` (texte + pièces scaffold). Compression via lz-string. Pièces minifiées (clés courtes, valeurs par défaut omises) pour URLs compactes. Zéro backend — tout est encodé dans l'URL.

Le QR encode la même URL. L'élève scanne avec la caméra native de son appareil. Pas de scanner intégré dans l'app (justification accessibilité : la caméra native gère l'autofocus sans précision motrice requise).

### 13.2 Export image (élève → enseignant)

Bouton « Photo » dans l'ActionBar (pas flottant sur le canvas — justification accessibilité : un bouton flottant est un obstacle moteur). Capture la modélisation complète en PNG (2x retina) incluant : texte du problème avec surlignages, canvas SVG avec toutes les pièces, watermark « RésoMolo — AAAA-MM-JJ ». L'élève télécharge et dépose dans Google Classroom comme remise de devoir.

### 13.3 Impression CSS

`@media print` basique. Noir et blanc. Problème en en-tête, pièces en dessous.

## 14. PWA et offline

### 14.1 Service Worker

Comme GéoMolo. PWA installable. Fonctionne offline après la première visite.

### 14.2 Dégradation gracieuse

Si le SW est bloqué (filtres d'école), l'app fonctionne en mode online.

## 15. Modèle de données

### 15.1 Types principaux

```typescript
type PieceType = 'jeton' | 'boite' | 'etiquette' | 'fleche' | 'barre' | 'calcul' | 'reponse';

type CouleurPiece = 'bleu' | 'rouge' | 'vert' | 'jaune';

interface Piece {
  id: string;
  type: PieceType;
  x: number;          // mm depuis le coin haut-gauche du canvas
  y: number;
  locked: boolean;     // pièce verrouillée (échafaudage)
}

interface Jeton extends Piece {
  type: 'jeton';
  couleur: CouleurPiece;
  parentId: string | null;  // id de la boîte parente, ou null si libre
}

interface Boite extends Piece {
  type: 'boite';
  width: number;       // mm (auto-dimensionné selon contenu)
  height: number;      // mm
}

interface Etiquette extends Piece {
  type: 'etiquette';
  text: string;
  attachedTo: string | null;  // id de la pièce parente, ou null si libre
}

interface Fleche extends Piece {
  type: 'fleche';
  fromId: string;       // id de la pièce de départ (toujours attachée)
  toId: string;         // id de la pièce d'arrivée (toujours attachée)
  label: string;
  // Pas de flèche libre au MVP — toujours entre deux pièces
}

interface Barre extends Piece {
  type: 'barre';
  couleur: CouleurPiece;
  sizeMultiplier: number;       // 1, 2, 3, 4, 5 (taille relative à referenceUnitMm)
  // width est dérivé : sizeMultiplier × referenceUnitMm (pas stocké)
  divisions: number | null;     // nombre de subdivisions, ou null
  coloredParts: number[];       // indices des parts colorées (fractions)
  groupId: string | null;       // id du groupe si barres groupées
  groupLabel: string | null;    // étiquette de l'accolade (stockée sur la barre avec le plus petit y du groupe ; si supprimée, reportée sur la suivante)
  sizeLocked: boolean;          // true = taille non modifiable par l'enfant (échafaudage Option A)
}

interface Calcul extends Piece {
  type: 'calcul';
  mode: 'expression' | 'colonnes';
  expression: string;          // mode expression: "45 ÷ 3 = 15"
  operator: '+' | '-' | '×' | '÷' | null;  // mode colonnes
  operands: string[];          // mode colonnes: ["28", "4"]
  resultDigits: string[];      // mode colonnes: ["1", "1", "2"]
  carryDigits: string[];       // mode colonnes: retenues ["", "3", ""]
}

interface Reponse extends Piece {
  type: 'reponse';
  text: string;
}
```

### 15.2 État de la modélisation

```typescript
interface Highlight {
  start: number;       // index de début dans le texte
  end: number;         // index de fin
  color: 'bleu' | 'orange' | 'vert' | 'gris';
}

interface ModelisationState {
  probleme: string;
  problemeReadOnly: boolean;
  problemeHighlights: Highlight[];
  availablePieces: PieceType[] | null;  // null = toutes disponibles
  referenceUnitMm: number;             // unité de référence pour les barres (défaut 60)
  pieces: Piece[];
  // PAS de undoStack/redoStack ici — géré par UndoManager externe
}
```

### 15.3 Undo/Redo

```typescript
interface UndoManager {
  past: ModelisationState[];    // max 100 snapshots
  current: ModelisationState;
  future: ModelisationState[];
}
```

L'UndoManager est externe au state (pas récursif). Chaque action (sauf UNDO/REDO) pousse un snapshot complet dans `past`. Estimation mémoire : ~2 Ko par snapshot × 100 niveaux = ~200 Ko. Négligeable pour IndexedDB. Pattern copié de GéoMolo.

### 15.4 État du slot

```typescript
interface Slot {
  id: string;
  name: string;
  undoManager: UndoManager;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}
```

## 16. Langue

Interface entièrement en français (Québec).

- « Jeton », « Boîte », « Étiquette », « Flèche », « Barre », « Calcul », « Réponse »
- « Plus de pièces »
- « Mes modélisations »
- « Nouvelle modélisation »
- « Recommencer »
- « Supprimer » → « Sûr? »
- « Copier », « Diviser en... », « Même taille », « Grouper »
- « En colonnes », « En ligne »
- « Ranger »
- « Que sais-tu? », « Que cherches-tu? », « Qu'est-ce qui se passe dans l'histoire? »
- Format décimal : virgule française (2,5 pas 2.5)
- Division avec reste : « 4 reste 4 »

## 17. Roadmap

### MVP — Livré

Toutes les fonctionnalités décrites dans les sections 1 à 16 sont implémentées, incluant :
- 7 pièces sémantiques (Jeton, Barre, Boîte, Étiquette, Flèche, Calcul, Réponse)
- Barres: tailles 1-10×, copier, subdiviser, égaliser, grouper avec accolades
- Slots « Mes modélisations » (UX GéoMolo), import/export .modelivite
- 20+ settings + 4 profils d'aide prédéfinis
- Relances séquentielles (initiale + inactivité + relance métacognitive post-réponse)
- Compteur de jetons par couleur, zones suggérées optionnelles
- ContextActions barres en sous-menus (charge cognitive réduite)
- PWA offline, impression CSS, import URL `?probleme=`
- Tutoriel 2 problèmes avec étape surlignage

### v1.1 — Outils mathématiques — Livré

| Feature | Notes | Effort |
|---|---|---|
| ~~**Droite numérique**~~ | ✅ Livré — placement, marqueurs cliquables avec labels, context actions min/max/pas/largeur. | — |
| ~~**Multiplication multi-chiffres complète**~~ | ✅ Livré — lignes intermédiaires auto-générées pour multiplicateur multi-chiffres. | — |
| ~~**Division longue en colonnes**~~ | ✅ Livré — format crochet québécois, reste, étapes ajoutables. | — |
| ~~**Phrases-réponses à trous**~~ | ✅ Livré — 6 templates de phrases avec blancs remplissables. | — |

### v1.2 — Accessibilité comorbidités — Livré

| Feature | Comorbidité ciblée | Effort |
|---|---|---|
| ~~**Synthèse vocale (TTS)**~~ — Web Speech API | ✅ Livré — bouton dans zone problème, surlignage mot courant, débit configurable (lent/normal/rapide). | — |
| ~~**Police et espacement configurables**~~ — OpenDyslexic/Atkinson Hyperlegible | ✅ Livré — 3 polices (system, Atkinson, OpenDyslexic) + espacement lettres configurable. | — |
| ~~**Mode lecture guidée**~~ — segmentation phrase par phrase | ✅ Livré — navigation Précédent/Suivant, affichage phrase courante. | — |

### v1.3 — Infrastructure enseignant — Livré

| Feature | Notes | Effort |
|---|---|---|
| ~~**Banque de problèmes intégrée**~~ | ✅ Livré — filtres cycle, difficulté, catégorie. | — |
| ~~**Export PDF**~~ | ✅ Livré — jsPDF, A4 paysage, problème + canvas + date. | — |
| ~~**Mode démonstration / projection**~~ | ✅ Livré — bouton plein écran dans ActionBar, CSS :fullscreen. | — |

### v2 — Écosystème complet

#### Nouvelles pièces et mathématiques

| Feature | Notes |
|---|---|
| **Action « Répartir en groupes égaux »** | Action contextuelle sur un ensemble de jetons (pas une nouvelle pièce). L'enfant entre le nombre total et le nombre de groupes (ou la taille des groupes). L'outil crée les boîtes et y place les jetons — compensation motrice, pas cognitive. Si le partage est inégal, le reste est affiché visuellement (jetons libres). La Boîte existante couvre le besoin de contenant ; cette action automatise le geste répétitif de placement qui pénalise les enfants TDC. Vocabulaire PFEQ : « groupes égaux », pas « paquets ». |
| **Grandeurs décimales et fractions** | Barres avec valeurs 0.5, 1/4, etc. Fin 2e cycle / 3e cycle. Étend la barre au-delà des entiers |
| **Tableau de données** | Statistique/probabilité 3e cycle. *Implémentation de base disponible (type, rendu, édition cellule).* |
| **Diagramme en arbre** | Probabilité 3e cycle |
| **Deux réponses par problème** | Problèmes à 2 questions (fréquent 3e cycle). Deux pièces Réponse distinctes avec numérotation |
| **Problèmes avec donnée superflue** | L'enfant doit sélectionner les données pertinentes — le surlignage rend cet exercice explicite |

#### Accessibilité et cognition

| Feature | Notes |
|---|---|
| **Navigation clavier complète** | Tab entre pièces, flèches pour déplacer, Enter pour actions contextuelles. Roving tabindex sur le canvas SVG. Pour enfants utilisant clavier externe ou contacteur |
| **Indicateur de progression visuel** | Breadcrumb discret : lire → surligner → modéliser → calculer → répondre. Soutient la planification (fonctions exécutives) sans imposer une séquence |
| **Mode « focus »** | Masque les pièces existantes — réduit les distractions |
| **Rappel flottant de l'énoncé** | Quand le canvas est grand, l'énoncé sort du viewport. Bulle ancrée ou panneau latéral rappelant la question |
| **Rappel de fatigue** | Comme GéoMolo |

#### Infrastructure parent / enseignant

| Feature | Notes |
|---|---|
| **Vue portfolio chronologique** | Historique des modélisations par élève avec vignettes miniatures SVG |
| **Vignettes dans le slot manager** | Aperçu miniature de chaque modélisation sauvegardée — aide la mémoire épisodique |
| **Annotations privées de l'adulte** | Notes par slot, invisibles pour l'enfant |
| **Export groupé de slots** | Pour l'enseignant ou le parent |
| **Mode parent vs mode enfant** | Le parent configure (settings, problèmes), l'enfant utilise (interface simplifiée sans accès aux paramètres). Verrouillage par code simple |
| **Comparaison côte à côte** | Deux modélisations en parallèle — flexibilité cognitive |

#### Écosystème

| Feature | Notes |
|---|---|
| **Banque de problèmes communautaire** | Les parents partagent leurs problèmes via URL, on agrège les meilleurs. Modération par votes |
| **Multi-langue** | Anglais (hors-QC), potentiellement communautés autochtones |
| **Suite AlloMolo** | Autres outils avec la même philosophie d'accessibilité (production écrite, timer/séquenceur) |

### Jamais

- Validation ou correction automatique (principe fondamental)
- Score, points, gamification

## 18. Cas d'utilisation et conseils

L'outil est conçu pour les enfants ayant des difficultés motrices mais bénéficie à tous. Les principes ci-dessous s'appuient sur la littérature (approche CO-OP — Polatajko & Mandich, 2004; charge cognitive — Sweller et al., 2019; sens du nombre — Butterworth, 2005; Siegler & Ramani, 2009).

| Situation de l'enfant | Bénéfice attendu | Conseil |
|---|---|---|
| **Difficulté motrice** | L'outil fait le dessin, l'enfant fait le raisonnement | Profil « Aide maximale », sons activés |
| **Difficulté en math** | Construction du sens du nombre via manipulation visuelle | L'outil aide à organiser, pas à comprendre — accompagnement du parent en amont |
| **Difficulté en lecture** | Traduction texte → schéma visuel | Le surlignage aide. TTS prévu (v1.x). Taille texte 1.5× |
| **Difficulté d'attention** | Ancrage visuel de chaque étape | Réduire les pièces disponibles pour limiter la distraction |
| **Anxiété de performance** | Espace non évaluatif, point de départ concret | Utiliser les pièces verrouillées pour éviter la paralysie devant l'espace vide |
| **Difficulté d'organisation spatiale** | Alignement automatique | Utiliser le bouton Ranger si l'espace devient chaotique. Canevas structurés (pièces verrouillées) |

## 19. Scénarios de validation

### 19.1 Avec un enfant ayant des difficultés motrices

L'enfant peut-il :
- Compléter le tutoriel sans aide?
- Placer des pièces sans frustration motrice?
- Construire une modélisation lisible d'un problème à 2 étapes?
- Retrouver son travail après avoir fermé l'app?
- Utiliser l'outil sans aide adulte après le tutoriel?
- Utiliser le bouton Ranger quand l'espace est désordonné?

### 19.2 Avec un adulte accompagnateur

L'adulte peut-il :
- Lire le raisonnement de l'enfant dans la modélisation?
- Identifier où le raisonnement a déraillé?
- Fournir un problème via URL ou fichier?
- Préparer un échafaudage (pièces verrouillées)?
- Restreindre les pièces disponibles?

## 20. Métriques de succès

Pas de métriques logicielles (pas de tracking, pas d'analytics). Métriques observables :

- L'enfant ayant des difficultés motrices utilise l'outil de façon autonome
- L'enfant produit des modélisations plus riches au fil du temps (plus de pièces, liens entre pièces)
- L'adulte peut lire le raisonnement sans demander d'explication orale
- L'enfant commence à modéliser mentalement (sans l'outil) après plusieurs semaines d'utilisation — l'échafaudage a fonctionné

### 20.1 Conditions du transfert

L'outil seul ne produit pas le transfert vers la modélisation mentale. Le transfert nécessite :
- **Pratique régulière** (pas une fois par mois)
- **Médiation de l'adulte** (verbaliser la stratégie pendant la construction)
- **Estompage progressif** via les pièces configurables : toutes les pièces → pièces restreintes → Calcul + Réponse seulement → papier-crayon → mental
- **Généralisation** : le transfert est spécifique au type de problème. Utiliser explicitement l'outil avec différents types de problèmes.
