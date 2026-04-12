# Spécification — Sauts sur la droite numérique

> **Statut** : Proposition  
> **Date** : 2026-04-11  
> **Prérequis** : Droite numérique existante (v0.9.0)  

## 1. Motivation

### 1.1 Lacune identifiée

La droite numérique actuelle est une **règle graduée avec des marqueurs ponctuels**. Elle permet le repérage de nombres mais ne supporte pas l'usage pédagogique central de la droite au primaire : **représenter les opérations comme des déplacements**.

### 1.2 Fondements de recherche

- **IES/WWC Recommandation #4** (Fuchs et al., 2021) : « Use number lines to facilitate learning of mathematical concepts **and procedures** »
- **PFEQ** : La droite numérique avec sauts est utilisée explicitement au 1er et 2e cycle pour l'addition, la soustraction, le comptage par sauts, et les suites
- **CLT** : La droite avec sauts externalise le déplacement mental — réduit la charge sur la mémoire de travail, particulièrement critique pour les enfants TDC (Wallinheimo & Gentle, 2024)
- **CRA** : La droite avec sauts est un outil **représentationnel** qui fait le pont entre le concret (déplacer des jetons) et l'abstrait (écrire 7 + 3 = 10)
- **Subitisation** (Pieters et al., 2020) : Les sauts regroupés (+5, +10) soutiennent le raisonnement par groupements plutôt que le comptage un-par-un
- **Ligne numérique mentale** (Kucian et al., 2011) : L'entraînement sur la ligne numérique améliore significativement les habiletés numériques, y compris chez les enfants dyscalculiques

### 1.3 Cas d'usage

| Cas | Cycle | Description | Sauts |
|-----|-------|-------------|-------|
| Addition simple | 1 | 7 + 3 : partir de 7, faire 3 sauts de 1 | 3 arcs unitaires |
| Addition par regroupement | 1-2 | 7 + 5 : partir de 7, un saut de 3 (→10), un saut de 2 (→12) | 2 arcs étiquetés |
| Soustraction | 1-2 | 15 − 4 : partir de 15, un saut de 4 vers la gauche (→11) | 1 arc en dessous |
| Comptage par sauts | 1-2 | Suite de 5 : 0, 5, 10, 15, 20 | 4 arcs identiques |
| Complément | 2 | Combien de 8 à 12? Saut de ? | 1 arc avec étiquette « ? » |
| Multiplication | 2-3 | 4 × 3 : 4 sauts de 3 depuis 0 | 4 arcs de même taille |
| Nombres entiers | 3 | +3 + (−5) = −2 : un saut de 3 vers la droite, puis un saut de 5 vers la gauche | 1 arc au-dessus + 1 arc en dessous, traversant le zéro |

> **Note** : L'arrondissement (« 37 est plus près de 40 que de 30 ») ne nécessite que des marqueurs, pas de sauts. Il est supporté par la droite actuelle.

---

## 2. Terminologie

Le terme **« saut »** est utilisé dans toute l'interface visible (action contextuelle, barre d'état, messages). C'est le terme du PDA/PFEQ québécois : « compter par sauts de 5 », « faire des sauts sur la droite numérique ».

Dans le code source et les structures de données, l'identifiant `bond` est conservé pour la brièveté et l'absence d'accents. La correspondance est :

| Interface | Code |
|-----------|------|
| Saut | `Bond` |
| Sauts | `bonds` |
| « Saut de 3 » | `label: "3"` |

---

## 3. Modèle de données

### 3.1 Extension de l'interface

```typescript
export interface Bond {
  from: number;       // valeur de départ (snappée au step)
  to: number;         // valeur d'arrivée (snappée au step)
  label: string;      // étiquette : auto-calculée par défaut, éditable
}

export interface DroiteNumerique extends PieceBase {
  type: 'droiteNumerique';
  min: number;
  max: number;
  step: number;
  markers: number[];
  bonds: Bond[];      // ← AJOUT
  width: number;
}
```

### 3.2 Valeurs par défaut

```typescript
// dans state.ts, création par défaut
bonds: []
```

### 3.3 Auto-label selon le mode

À la création d'un saut, l'étiquette est calculée automatiquement. Le format dépend du mode toolbar :

```typescript
const diff = bond.to - bond.from;
const absDiff = Math.abs(diff);

if (toolbarMode === 'essentiel') {
  // Mode Simplifié (1er-2e cycle) : pas de signe algébrique
  // La direction est portée par la position haut/bas de l'arc
  bond.label = `${absDiff}`;
  // Exemples : "3", "5", "10"
} else {
  // Mode Complet (3e cycle) : notation signée pour les entiers relatifs
  bond.label = diff >= 0 ? `+${diff}` : `${diff}`;
  // Exemples : "+3", "-5", "+10"
}
```

**Justification pédagogique** : Le PFEQ n'introduit pas la notation signée (+/−) avant le 3e cycle (nombres entiers). Au 1er et 2e cycle, on parle de « avancer de 3 » ou « reculer de 4 », pas de +3 et −4 au sens algébrique. La direction est déjà donnée par la position spatiale de l'arc (au-dessus = vers la droite, en dessous = vers la gauche).

L'enfant peut ensuite éditer l'étiquette (remplacer par « ? », « donne 3 », « ×3 », etc.).

### 3.4 Marqueurs implicites

Quand un saut est créé, ses positions `from` et `to` sont **automatiquement ajoutées aux marqueurs** si elles n'y sont pas déjà. Suppression d'un saut : les marqueurs restent (l'enfant les a posés, ils ont un sens).

Justification : les marqueurs et les sauts sont deux couches d'information complémentaires. Le marqueur dit « cette position est importante », le saut dit « il y a un déplacement entre ces deux positions ».

---

## 4. Interaction

### 4.1 Principe : cohérent avec les patterns existants

L'interaction suit le pattern **deux-clics** de la flèche, adapté au contexte linéaire de la droite :

| Étape | Geste | Feedback |
|-------|-------|----------|
| 0 | Droite sélectionnée | Actions contextuelles visibles, dont « Saut » (avec micro-icône arc) |
| 1 | Clic sur « Saut » (action contextuelle) | Barre d'état : « Clique sur le point de départ du saut. » Mode saut actif. Indicateur visuel sur la droite (voir §4.9) |
| 2 | Clic sur la droite (position de départ) | Marqueur de départ apparaît (si absent). Ghost arc suit le curseur. Barre d'état : « Clique sur le point d'arrivée. » |
| 3 | Clic sur la droite (position d'arrivée) | Saut créé avec arc + étiquette auto-calculée. Son `onBond()` + haptique. Barre d'état adaptée selon le mode (voir §4.2) |
| 4 | **Mode Complet** : le mode saut reste actif (enchaînement). **Mode Simplifié** : le mode saut se termine | Voir §4.2 |
| 5 | Bouton « Terminer », Échap, ou clic hors droite | Mode saut terminé. Retour à la sélection normale |

### 4.2 Enchaînement : comportement selon le mode

**Mode Complet** (2e-3e cycle) : Après le premier saut, le mode reste actif et **le point d'arrivée devient le nouveau point de départ**. L'enfant clique seulement l'arrivée pour chaque saut suivant. C'est critique pour :
- Le comptage par sauts (5 sauts de 2 = 1 clic de départ + 5 clics d'arrivée, pas 12)
- Les stratégies de décomposition (7+5 = 7+3+2 = 1 clic de départ + 2 clics d'arrivée)

L'enchaînement se termine par le bouton « Terminer », Échap, clic hors droite, ou clic sur un autre outil.

**Mode Simplifié** (1er cycle et introduction) : Après chaque saut, **le mode se termine automatiquement**. L'enfant doit cliquer « Saut » à nouveau pour en créer un autre. Justification : un élève de 6-7 ans qui n'a pas l'intention de former une chaîne serait déstabilisé par un mode qui « reste actif » sans qu'il comprenne pourquoi.

### 4.3 Snap au step

Le clic sur la droite est snappé au step, comme pour les marqueurs :

```typescript
const clamped = Math.max(min, Math.min(max, rawValue));
const snapped = Math.round((clamped - min) / step) * step + min;
```

Pas de placement libre entre deux graduations. Le saut connecte toujours des valeurs alignées sur le step. Ceci évite la confusion pour l'enfant et élimine le besoin de précision motrice — **compensation TDC directe**.

### 4.4 Direction du saut

- **Saut vers la droite** (from < to) : arc **au-dessus** de la droite.
- **Saut vers la gauche** (from > to) : arc **en dessous** de la droite.

Cette convention est standard dans les manuels scolaires québécois (Défi mathématiques, Clicmaths). La séparation spatiale haut/bas rend la direction immédiatement visible sans flèche directionnelle — un enfant TDC n'a pas besoin de décoder une pointe de flèche minuscule.

### 4.5 Saut de taille zéro

Si l'enfant clique au même endroit que le départ (from === to), le saut n'est pas créé. Son discret `onGhostSnap()` pour indiquer « rien ne s'est passé ». Pas de message d'erreur — l'outil ne juge pas.

### 4.6 Édition de l'étiquette

- Sélection d'un saut (clic sur l'arc ou l'étiquette) → action contextuelle « Éditer »
- Le champ de l'étiquette devient éditable (inline, comme les étiquettes de flèche)
- L'enfant peut taper : « ? », « donne 5 », « 3 pommes », texte libre
- Entrée ou clic ailleurs pour valider
- L'étiquette vide est permise (l'enfant peut effacer le label auto-calculé)

### 4.7 Suppression d'un saut

- Sélection d'un saut → action contextuelle « Supprimer »
- Micro-confirmation « Sûr? » (pattern existant, 2s)
- Les marqueurs aux extrémités restent
- Son `onDelete()` + haptique

### 4.8 Pas de déplacement de saut

Un saut n'est pas déplaçable indépendamment. Il est ancré à ses positions `from` et `to` sur la droite. Si l'enfant veut changer un saut, il le supprime et en crée un nouveau. Justification : un saut déplaçable introduit une ambiguïté de geste (« est-ce que je déplace le saut ou la droite? ») qui est un risque majeur pour les enfants TDC.

### 4.9 Indicateur visuel du mode saut actif

Pendant le mode saut, la droite affiche un **indicateur visuel persistant** pour que l'enfant sache qu'il est dans un mode spécial :

- Bordure de sélection de la droite en **bleu pulsant** (au lieu du violet statique habituel)
- Badge « Mode saut » dans la barre d'état (style violet, comme les relances métacognitives)

Les enfants TDC ont souvent un déficit de monitoring exécutif. Un mode implicite (sans indicateur visuel fort) peut les désorienter — ils oublient dans quel mode ils sont.

### 4.10 Bouton « Terminer » visible

Pendant le mode saut (en mode Complet avec enchaînement), un bouton **« Terminer »** apparaît :
- Dans la barre d'état, à droite du message contextuel
- Taille 44×44px, style cohérent avec le bouton « Annuler » existant

Justification : Échap n'est pas accessible sur tablette (pas de clavier physique), et un mode modal sans sortie visible explicite est anxiogène pour les enfants TDC (Hourcade, 2015). Le « clic hors droite » reste une sortie alternative, mais le bouton explicite est le chemin principal documenté.

### 4.11 Interaction tactile (tablette)

Sur écran tactile, le ghost preview (qui dépend du hover, absent sur tactile) est remplacé par un **pattern slide-to-place** complémentaire :

1. L'enfant **tap** le point de départ (comme le clic desktop)
2. Pour le point d'arrivée, deux chemins possibles :
   - **Tap** sur la position d'arrivée (identique au desktop)
   - **Touch-move** : l'enfant pose le doigt sur la droite et glisse — le ghost arc suit le doigt en temps réel. Au **touch-end** (doigt relevé), le saut est confirmé à la position snappée

Le pattern slide est un **deuxième chemin**, pas un remplacement — cohérent avec le principe CUA de moyens multiples d'action (CAST, 2018). Le snap au step garantit que même un glissement imprécis atterrit au bon endroit.

Le ghost preview (arc + étiquette temps réel) fonctionne pendant le touch-move exactement comme pendant le hover desktop.

---

## 5. Rendu SVG

### 5.1 Arc (courbe de Bézier quadratique)

```
Saut positif (3, de 7 à 10) — arc AU-DESSUS :

          3
        ╭───╮
       ╱     ╲
──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──
  0  1  2  3  4  5  6  7  8  9  10

Saut négatif (4, de 10 à 6) — arc EN DESSOUS :

──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──
  0  1  2  3  4  5  6  7  8  9  10
                 ╲     ╱
                  ╰───╯
                   4
```

(Étiquettes en mode Simplifié — sans signe. En mode Complet : « +3 » et « −4 ».)

### 5.2 Géométrie de l'arc

```typescript
function renderBond(bond: Bond, piece: DroiteNumerique) {
  const { x, y, min, max, width } = piece;
  const range = max - min;

  // Positions en mm
  const x1 = x + ((bond.from - min) / range) * width;
  const x2 = x + ((bond.to - min) / range) * width;
  const midX = (x1 + x2) / 2;

  // Hauteur de l'arc proportionnelle à la distance
  const dist = Math.abs(x2 - x1);
  const arcHeight = Math.max(8, Math.min(dist * 0.4, 30));
  // Plancher 8mm : arc visible même pour sauts courts (1 step)
  // Plafond 30mm : arc ne prend pas trop de place sur le canvas

  // Direction : positif = au-dessus (y négatif), négatif = en dessous
  const direction = bond.to >= bond.from ? -1 : 1;
  const cpY = y + direction * arcHeight;

  // Bézier quadratique
  const path = `M ${x1} ${y} Q ${midX} ${cpY} ${x2} ${y}`;

  return { path, midX, cpY, direction, arcHeight };
}
```

### 5.3 Apparence de l'arc

| Propriété | Valeur | Justification |
|-----------|--------|---------------|
| Couleur | `#185FA5` (bleu RésoMolo) | Cohérent avec les marqueurs |
| Épaisseur | 1.5px (normal), 2px (sélectionné) | Visible sans dominer |
| Style | Trait plein | Les pointillés sont réservés aux ghosts/previews |
| Remplissage | Aucun (`fill: none`) | L'arc est une ligne, pas une surface |
| Pointe de flèche | **Aucune** | La direction est donnée par la position haut/bas. Pas de pointe = pas de détail moteur fin à décoder. Accessible TDC |
| Opacité | 1.0 (normal), 0.3 (mode concentré, pièce non focalisée) | Cohérent avec le pattern existant |

### 5.4 Apparence de l'étiquette

| Propriété | Valeur |
|-----------|--------|
| Position | Centré horizontalement sur l'arc, au sommet/nadir de la courbe |
| Police | `fontSize: 7 * textScale`, `fontWeight: 600` |
| Couleur | `#185FA5` (bleu) |
| Fond | Petit rectangle blanc semi-transparent (`fill: rgba(255,255,255,0.85)`, `rx: 2`, padding 1mm) pour lisibilité sur les ticks |
| Alignement | `textAnchor: 'middle'`, `dominantBaseline` adapté à la direction |

### 5.5 Saut sélectionné

Quand l'enfant clique sur un arc ou son étiquette :
- L'arc passe en violet (`#7028E0`) et épaisseur 2px — pattern cohérent avec les flèches et barres sélectionnées
- Les actions contextuelles apparaissent
- Les marqueurs from/to sont mis en évidence (cercle légèrement agrandi, `r: 5` au lieu de `r: 4`)

### 5.6 Ghost preview pendant la création

Pendant le mode saut (entre le clic de départ et le clic d'arrivée) :

- **Ghost arc** : arc en pointillés (`strokeDasharray: "2,2"`) semi-transparent (`opacity: 0.4`) qui suit le curseur snappé au step le plus proche
- **Ghost étiquette** : le label auto-calculé apparaît en temps réel sur le ghost. **Visible en mode Complet seulement**. En mode Simplifié, le ghost arc seul suffit — l'étiquette dynamique force un recodage numérique continu qui frôle la saturation de la MT visuospatiale (2-3 items chez les enfants TDC, Pailian et al., 2016)
- **Marqueur de départ** : cercle plein avec halo pulsant discret (`animation: marker-pulse 1.5s ease-in-out infinite`) pour indiquer « en attente du 2e clic »

```css
@keyframes marker-pulse {
  0%, 100% { r: 4; opacity: 1; }
  50% { r: 5.5; opacity: 0.7; }
}
```

### 5.7 Empilage des sauts

Quand plusieurs sauts se chevauchent (même direction), les arcs se **nichent** :

```
          2      3
        ╭──╮  ╭────╮
       ╱    ╲╱      ╲
──┼──┼──┼──┼──┼──┼──┼──┼──
  0  1  2  3  4  5  6  7
```

Implémentation : chaque saut reçoit un **niveau d'empilage** basé sur le chevauchement avec les sauts existants dans la même direction. Le `arcHeight` est multiplié par `(1 + 0.5 * level)`.

```typescript
function getBondLevel(bond: Bond, allBonds: Bond[]): number {
  const sameDirBonds = allBonds.filter(b =>
    b !== bond &&
    (b.to >= b.from) === (bond.to >= bond.from) && // même direction
    Math.max(b.from, bond.from) < Math.min(b.to, bond.to) // chevauchement
  );
  // Assignation gloutonne : le plus petit niveau non-occupé
  const usedLevels = sameDirBonds.map(b => b._level ?? 0);
  let level = 0;
  while (usedLevels.includes(level)) level++;
  return level;
}
```

Si l'empilage dépasse 3 niveaux, les arcs commencent à se compresser (arcHeight ne grandit plus) — protection contre le débordement vertical du canvas. Le message de la barre d'état apparaît dès le **3e niveau** d'empilage : « Tu peux effacer des sauts pour simplifier. » (suggestion, pas obligation).

### 5.8 Collision labels de marqueurs / arcs

Quand des sauts positifs (arcs au-dessus) occupent l'espace où les labels de marqueurs sont normalement affichés, les labels de marqueurs se **déplacent automatiquement** :

- **Sans sauts au-dessus** : labels de marqueurs au-dessus de la droite (position par défaut, `y - 7`)
- **Avec sauts au-dessus** : les labels de marqueurs dont la position chevauche un arc se déplacent **en dessous** de la droite (position miroir, `y + 9 + fontSize`)
- Les labels de marqueurs en dessous ne chevauchent pas les arcs négatifs grâce à l'offset suffisant (les labels sont proches de la ligne, les arcs négatifs descendent plus bas)

Implémentation : pour chaque marqueur, vérifier si un saut positif couvre sa position horizontale. Si oui, basculer le label en dessous.

---

## 6. Sons et haptique

### 6.1 Nouveau son : `onBond()`

Un son distinctif pour la création d'un saut, différent du placement (`onPlace`) et de l'attachement (`onAttach`). Le son évoque un **déplacement/glissement** :

```typescript
export function onBond(baseFreq = 400) {
  if (mode === 'off') return;
  const c = getCtx();
  const now = c.currentTime;

  // Sweep ascendant court — évoque le mouvement le long de la droite
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.linearRampToValueAtTime(baseFreq + 200, now + 0.06);
  g.gain.setValueAtTime(0.12 * gainMultiplier, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(g); g.connect(c.destination);
  osc.start(now); osc.stop(now + 0.08);

  haptic(25);
}
```

**Caractéristiques** :
- Triangle wave (plus doux que sine, cohérent avec `onSnap`)
- Sweep ascendant 400→600Hz en 60ms — direction « vers l'avant »
- Durée totale 80ms — très court, ne gêne pas l'enchaînement rapide
- Haptique 25ms (entre placement 30ms et snap 15ms)

### 6.2 Son d'enchaînement (mode Complet seulement)

Quand l'enfant enchaîne des sauts (comptage par sauts), chaque saut suivant joue le même `onBond()` mais avec une fréquence de base légèrement plus haute (+50Hz par saut dans la chaîne, plafonné à +200Hz). Cela crée un **escalier sonore** qui renforce la sensation de progression le long de la droite :

```typescript
// Dans le handler d'enchaînement
const chainIndex = Math.min(consecutiveBonds, 4); // max 4 paliers
onBond(400 + chainIndex * 50); // 400, 450, 500, 550, 600 Hz de base
```

**Mode réduit** : seul le premier saut de la chaîne émet un son. Les suivants sont silencieux (évite la surcharge sensorielle — 30-50% des enfants TDC présentent une hypersensibilité sensorielle, Zwicker et al., 2012).

**Mode complet** : tous les sauts émettent un son avec l'escalier.

**Justification neurocognitive** : La montée en fréquence renforce la correspondance cross-modale hauteur-espace (Rusconi et al., 2006). Le plafonnement à 4 paliers respecte la discrimination fréquentielle des 8-12 ans.

### 6.3 Son du ghost snap

Pendant la création (ghost arc qui suit le curseur), chaque snap sur un nouveau step émet le `onGhostSnap()` existant (350Hz, 15ms). **Mode complet seulement** — en mode réduit, le ghost est silencieux pour éviter un flux auditif continu potentiellement distracteur (pertinent pour la comorbidité TDC + TDAH, ~50%).

### 6.4 Tableau récapitulatif

| Événement | Son | Haptique | Mode réduit | Mode complet |
|-----------|-----|----------|-------------|--------------|
| Créer un saut | `onBond()` sweep 400→600Hz, 80ms | 25ms | Oui | Oui |
| Saut enchaîné | `onBond()` fréquence crescendo | Non | Non (silencieux) | Oui (avec escalier) |
| Ghost snap (exploration) | `onGhostSnap()` 350Hz, 15ms | Non | Non | Oui |
| Supprimer un saut | `onDelete()` existant | 20ms | Oui | Oui |
| Éditer étiquette | Aucun | Non | — | — |

> **Note** : Le mode réduit est le **défaut** pour les profils d'aide TDC (Aide maximale, Aide + Attention). Ceci est cohérent avec les profils existants.

---

## 7. Animation

### 7.1 Animation de création du saut

Quand l'enfant clique le point d'arrivée, l'arc **se dessine progressivement** de gauche à droite (ou droite à gauche pour un saut négatif). C'est la seule animation non-triviale de cette spec.

**Implémentation** : `stroke-dashoffset` animé sur le path SVG.

```css
@keyframes bond-draw {
  from { stroke-dashoffset: var(--path-length); }
  to   { stroke-dashoffset: 0; }
}

.bond-new {
  stroke-dasharray: var(--path-length);
  animation: bond-draw 200ms ease-out forwards;
}
```

**Durée** : 200ms. Au-dessus du seuil de perception (50ms), en dessous du seuil d'impatience enfant (400ms, Nielsen adapté par Hourcade, 2015). L'enfant peut cliquer le saut suivant avant la fin de l'animation.

**Justification pédagogique** : L'animation de tracé renforce la **directionnalité** — l'enfant voit le mouvement se produire le long de la droite. Ceci soutient la construction du modèle mental « addition = avancer, soustraction = reculer » et la construction de la ligne numérique mentale (Kucian et al., 2011).

**Justification TDC** : L'animation offre un repère temporel qui complète le repère spatial. Pour un enfant dont la proprioception est déficitaire, voir le mouvement se produire confirme que l'action a eu lieu.

### 7.2 Animation de l'étiquette

L'étiquette apparaît en fondu après l'arc (délai 150ms, fondu 100ms). La hiérarchie temporelle arc→étiquette suit l'ordre cognitif naturel : percevoir l'action (le mouvement), puis la nommer (la valeur).

```css
.bond-label-new {
  animation: fade-in 100ms ease-out 150ms both;
}
```

### 7.3 Animation de suppression

L'arc se dissout en fondu (150ms, ease-in) puis est retiré du DOM. Pas d'animation de « rétraction » — trop complexe visuellement et pas de valeur pédagogique.

### 7.4 Pas d'animation en enchaînement rapide

Si l'enfant clique rapidement (< 200ms entre deux sauts), l'animation de tracé est **sautée** — le saut apparaît instantanément. Justification : ne pas ralentir un enfant qui a trouvé son rythme. Le son reste.

---

## 8. Actions contextuelles

### 8.1 Sur la droite sélectionnée — regroupement

Les actions contextuelles de la droite sont **regroupées en deux blocs** pour réduire la charge de scan (7-8 boutons textuels est trop pour un enfant de 8 ans) :

**Bloc « Contenu »** (actions sur ce que la droite contient) :

| Action | Icône | Description |
|--------|-------|-------------|
| **Saut** | Micro-icône arc ⌒ | Active le mode saut (deux-clics). Icône distincte pour faciliter la découverte visuelle parmi les boutons textuels |
| **Effacer marqueurs** | — | Existant. Affiché si `markers.length > 0` |
| **Effacer sauts** | — | Supprime tous les sauts. Affiché si `bonds.length > 0`. Micro-confirmation « Sûr? » |

**Bloc « Paramètres »** (configuration de la droite) :

| Action | Description |
|--------|-------------|
| **Min** | Sous-menu presets + personnalisé (existant) |
| **Max** | Sous-menu presets + personnalisé (existant) |
| **Pas** | Presets [1, 2, 5, 10] (existant) |
| **Largeur** | Presets [100, 150, 200, 300] mm (existant) |

**Supprimer** : en bas, isolé (existant).

Séparation visuelle : une ligne fine (`1px #E5E7EB`) entre les deux blocs + un label discret « Paramètres » au-dessus du 2e bloc.

### 8.2 Sur un saut sélectionné

Quand l'enfant clique sur un arc ou son étiquette, le saut est sélectionné (pas la droite). Actions :

| Action | Description |
|--------|-------------|
| **Éditer** | Rend l'étiquette éditable (champ inline) |
| **Supprimer** | Supprime le saut. Micro-confirmation « Sûr? ». Les marqueurs restent |

**Pas d'action « Couleur »** sur les sauts individuels. Tous les sauts d'une droite partagent la même couleur (bleu). Justification : la cohérence visuelle est plus importante que la personnalisation à ce niveau.

### 8.3 Pas d'action « Déplacer » sur un saut

Cohérent avec §4.8. Supprimer + recréer est le flux.

---

## 9. Accessibilité TDC — considérations spécifiques

### 9.1 Zone de clic sur la droite

Pendant le mode saut, la zone de clic pour placer le départ/arrivée est **la hauteur totale de la droite** (h = 20mm, y ± 10mm), pas juste la ligne de 1px. L'enfant peut cliquer au-dessus ou en dessous de la ligne — le snap vertical est implicite. Ceci est cohérent avec la zone de sélection existante (`y - 10` à `y + h`).

### 9.2 Zone de clic sur un arc (sélection)

L'arc est un trait de 1.5px — trop fin pour un clic précis. La zone de hit-test est **élargie à 5mm** autour du path, via un path invisible plus épais (`strokeWidth: 10`, `stroke: transparent`).

Avec profil de tolérance :
- Normal : 5mm
- Large : 7.5mm (×1.5)
- Très large : 10mm (×2.0)

### 9.3 Feedback visuel continu (barre d'état en mots)

Pendant le mode saut, la **barre d'état indique en permanence** la valeur snappée sous le curseur **en mots directionnels** :

```
Mode Simplifié :
  « Saut depuis 7 — tu es sur 10, tu avances de 3. Clique pour placer. »

Mode Complet :
  « Saut depuis 7 → actuellement sur 10 (+3). Clique pour placer. »
```

Ce texte est mis à jour en temps réel au mouvement du curseur. Il sert de **triple codage** (spatial + numérique + verbal) pour les enfants qui ont du mal à lire les graduations. La formulation directionnelle (« tu avances de 3 » / « tu recules de 4 ») est accessible au 1er cycle sans notation algébrique.

### 9.4 Annulation (Undo)

Chaque saut est un pas d'undo individuel. Un Ctrl+Z pendant l'enchaînement supprime le dernier saut créé et recule le point de départ au saut précédent. Deux Ctrl+Z supprime les deux derniers sauts. Etc.

### 9.5 Tolérance aux clics accidentels

Pendant le mode saut, un clic sur une zone qui n'est pas sur la droite (ni sur sa zone élargie) est **ignoré silencieusement** — pas de son d'erreur, pas de message. L'enfant peut « rater » sans conséquence. Le mode saut reste actif.

Un clic sur une autre pièce (barre, jeton) **termine le mode saut** et sélectionne cette pièce. C'est le comportement naturel attendu — pas de mode piégeant.

### 9.6 Cas du clavier virtuel (tablette)

Le mode saut ne nécessite **aucune saisie clavier**. L'étiquette auto-calculée est suffisante par défaut. L'édition de l'étiquette est optionnelle et déclenchée par une action contextuelle explicite. Pas de clavier virtuel intrusif pendant la création.

### 9.7 Nudge anti-comptage séquentiel (optionnel)

Quand l'enfant crée **3 sauts unitaires consécutifs ou plus** (même taille = 1 step, ex. : +1, +1, +1), la barre d'état affiche une suggestion douce :

```
« As-tu essayé de faire un seul grand saut? Par exemple, un saut de 3 au lieu de trois sauts de 1. »
```

**Ce nudge est :**
- **Désactivé par défaut** — activable par l'adulte accompagnateur dans les paramètres
- **Non bloquant** — l'enfant peut l'ignorer et continuer
- **Conforme à la philosophie « l'outil ne juge pas »** — il suggère, il n'impose pas

**Justification** : Pieters et al. (2020) identifient le comptage un-par-un comme une stratégie problématique chez les enfants TDC. Les sauts unitaires (+1, +1, +1) sur la droite modélisent exactement cette stratégie. Le nudge oriente doucement vers le raisonnement par groupements sans invalider la démarche de l'enfant.

---

## 10. Intégration avec les autres pièces

### 10.1 Pas de lien formel droite↔calcul

Un saut n'est pas connecté programmatiquement à une pièce Calcul. L'enfant fait la correspondance visuellement : les sauts sur la droite montrent le raisonnement, le calcul en dessous formalise l'opération. C'est cohérent avec la philosophie « l'outil ne juge pas » — pas de validation croisée droite/calcul.

### 10.2 Droite dans un schéma pré-construit (estompage)

Un fichier `.resomolo` peut inclure une droite avec des sauts `locked: true`. L'adulte prépare un exercice où certains sauts sont déjà tracés et l'enfant doit en ajouter d'autres ou remplir les étiquettes manquantes.

```json
{
  "type": "droiteNumerique",
  "min": 0, "max": 20, "step": 1, "width": 300,
  "markers": [5, 8],
  "bonds": [
    { "from": 5, "to": 8, "label": "?" }
  ],
  "locked": false
}
```

L'enfant voit un saut de 5 à 8 avec « ? » — il doit déduire que c'est 3 et peut éditer l'étiquette. Soutient le niveau 2 d'estompage (schéma partiel).

### 10.3 Droite + barres (piste exploratoire, hors scope)

La correspondance visuelle droite↔barres (placer une barre au-dessus de la droite pour voir que la barre « 3× » va de 0 à 3) est une piste intéressante mais n'est pas dans le scope de cette spec. Elle nécessiterait un mécanisme d'ancrage inter-pièces qui n'existe pas encore.

---

## 11. Persistance et export

### 11.1 Format `.resomolo`

Les sauts sont sérialisés dans le champ `bonds` de la pièce droite numérique :

```json
{
  "type": "droiteNumerique",
  "id": "dn1",
  "x": 50, "y": 200,
  "min": 0, "max": 10, "step": 1,
  "markers": [3, 7, 10],
  "bonds": [
    { "from": 3, "to": 7, "label": "4" },
    { "from": 7, "to": 10, "label": "3" }
  ],
  "width": 200,
  "locked": false
}
```

### 11.2 Migration

Les droites existantes (v0.9.0) n'ont pas de champ `bonds`. À la lecture, le champ manquant est initialisé à `[]`. Pas de migration nécessaire.

### 11.3 Export image (PNG)

Les arcs et étiquettes sont rendus en SVG — ils apparaissent naturellement dans l'export PNG existant. Pas de travail supplémentaire.

---

## 12. Cas limites

| Cas | Comportement |
|-----|-------------|
| Saut qui dépasse min ou max | Impossible — le snap clamp les valeurs à [min, max] |
| Saut de from === to | Non créé. Ghost arc disparaît. Pas de son |
| Empilage 3+ niveaux dans une direction | Compression (arcHeight plafonne). Message barre d'état dès le 3e niveau : « Tu peux effacer des sauts pour simplifier. » |
| Changement de min/max après sauts | Les sauts dont from ou to sont hors [min, max] sont **supprimés silencieusement** avec un Undo groupé. Barre d'état : « 2 sauts hors plage supprimés. » |
| Changement de step après sauts | Les sauts dont from ou to ne sont plus alignés sur le step sont **recalés** au step le plus proche. L'étiquette est recalculée |
| Effacer marqueurs (action existante) | Les marqueurs sont effacés. Les sauts **restent** (ils ont leurs propres from/to). Les positions des sauts sont re-ajoutées aux marqueurs implicitement au rendu |
| Droite verrouillée (locked: true) | Les sauts existants sont affichés mais non modifiables. Le mode saut est désactivé. Les étiquettes « ? » restent éditables (même pattern que les barres verrouillées) |
| 3+ sauts unitaires consécutifs | Nudge optionnel « un seul grand saut? » (§9.7) |

---

## 13. Barre d'état — messages

| Contexte | Message (mode Simplifié) | Message (mode Complet) |
|----------|--------------------------|------------------------|
| Droite sélectionnée | « Clique sur la droite pour placer un marqueur. Actions à droite. » | idem |
| Mode saut activé, attente départ | « Clique sur le point de départ du saut. » | idem |
| Mode saut, départ posé, attente arrivée | « Clique sur le point d'arrivée. » | « Clique sur le point d'arrivée. Échap pour annuler. » |
| Saut créé (mode Simplifié) | « Saut créé : tu avances de 3. » | — |
| Saut créé (mode Complet, non enchaîné) | — | « Saut +3 créé. » |
| Saut créé (mode Complet, enchaîné) | — | « Saut +3 créé. Clique le prochain point d'arrivée, ou Terminer. » |
| Saut vers la gauche créé | « Saut créé : tu recules de 4. » | « Saut −4 créé. » |
| Saut sélectionné | « Saut de 3 sélectionné. Tu peux éditer ou supprimer. » | « Saut +3 sélectionné. Tu peux éditer ou supprimer. » |
| Nudge anti-comptage (si activé) | « As-tu essayé un seul grand saut? » | idem |

---

## 14. Résumé des livrables

| # | Livrable | Fichiers impactés | Effort |
|---|----------|-------------------|--------|
| 1 | Type `Bond` + extension `DroiteNumerique` | `types.ts`, `state.ts` | Faible |
| 2 | Auto-label conditionnel (mode Simplifié/Complet) | `state.ts` | Faible |
| 3 | Rendu des arcs SVG + étiquettes | `DroiteNumeriquePiece.tsx` | Moyen |
| 4 | Empilage des sauts (niveaux, seuil 3) | `DroiteNumeriquePiece.tsx` | Moyen |
| 5 | Collision labels marqueurs / arcs | `DroiteNumeriquePiece.tsx` | Moyen |
| 6 | Mode saut (interaction deux-clics) + indicateur visuel | `Canvas.tsx` | Moyen |
| 7 | Enchaînement conditionnel (Complet) / saut unique (Simplifié) | `Canvas.tsx` | Faible |
| 8 | Bouton « Terminer » visible | `StatusBar` ou `Canvas.tsx` | Faible |
| 9 | Ghost arc pendant création (ghost label conditionnel) | `Canvas.tsx` | Moyen |
| 10 | Interaction tactile (touch-move fallback) | `Canvas.tsx` | Moyen |
| 11 | Sélection/édition/suppression d'un saut | `Canvas.tsx`, `ContextActions.tsx` | Moyen |
| 12 | Regroupement actions contextuelles (2 blocs) | `ContextActions.tsx` | Faible |
| 13 | Micro-icône arc sur bouton « Saut » | `ContextActions.tsx` | Faible |
| 14 | Son `onBond()` + escalier sonore conditionnel | `sound.ts` | Faible |
| 15 | Animation de tracé (`stroke-dashoffset`) | `index.css`, `DroiteNumeriquePiece.tsx` | Faible |
| 16 | Hit-test élargi sur arcs | `Canvas.tsx` | Faible |
| 17 | Barre d'état (messages directionnels, mode-aware) | `Canvas.tsx` ou `StatusBar` | Moyen |
| 18 | Nudge anti-comptage séquentiel (optionnel) | `Canvas.tsx`, paramètres | Faible |
| 19 | Sérialisation bonds | `state.ts`, migration implicite | Faible |
| 20 | Tests unitaires | `droite-numerique.test.ts` | Moyen |
| 21 | Tests E2E visuels | `visual-audit.spec.ts` | Moyen |

**Effort total estimé** : Moyen-élevé — supérieur à l'implémentation initiale des bonds seuls, en raison des comportements conditionnels (Simplifié/Complet), du fallback tactile, et du regroupement des actions contextuelles.

