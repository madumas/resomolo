# RésoMolo v0.9.0 — Captures d'écran pour revue d'experts

> Outil de modélisation mathématique pour élèves du primaire (2e-3e cycle) avec TDC/DCD.
> Toutes les images ci-dessous proviennent de captures Playwright automatisées.

Les chemins sont relatifs à la racine du projet.

---

## 1. Vue d'ensemble et navigation

| Image | Description |
|-------|-------------|
| `e2e/screenshots/desktop-chrome/01-initial-state.png` | État initial de l'application (canvas vide) |
| `e2e/screenshots/desktop-chrome/02-toolbar.png` | Barre d'outils (toolbar) |
| `e2e/screenshots/desktop-chrome/03-status-bar.png` | Barre de statut avec message contextuel |
| `e2e/screenshots/desktop-chrome/03b-action-bar.png` | Barre d'actions (undo, redo, partager, paramètres) |
| `e2e/screenshots/desktop-chrome/63-actionbar-full.png` | Action bar complète avec tous les boutons |
| `public/docs/images/guide-vue-ensemble.png` | Vue d'ensemble avec modélisation en cours |
| `public/docs/images/guide-mode-selector.png` | Sélecteur de mode (Simplifié/Complet) |
| `public/docs/images/guide-barre-statut.png` | Barre de statut (crop) |
| `e2e/screenshots/desktop-chrome/100-mode-essentiel.png` | Toolbar en mode Essentiel (Simplifié) |
| `e2e/screenshots/desktop-chrome/101-mode-complet.png` | Toolbar en mode Complet |
| `e2e/screenshots/desktop-chrome/62-toolbar-expanded.png` | Toolbar avec "Voir tout" activé |

## 2. Pièces — catalogue et exemples

### Jetons
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-jeton.png` | Catalogue : jetons bleus et rouges |
| `public/docs/images/exemple-jeton.png` | Exemple : 8 bleus + 5 rouges + calcul + réponse |
| `e2e/screenshots/desktop-chrome/12-jetons-5.png` | 5 jetons placés |
| `e2e/screenshots/desktop-chrome/95-jeton-color-rouge.png` | Jeton changé de couleur |
| `e2e/screenshots/desktop-chrome/96-jeton-counter.png` | Compteur de jetons par couleur |
| `e2e/screenshots/desktop-chrome/217-jeton-labels-couleur.png` | Labels de couleur sur jetons |

### Barres
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-barre.png` | Catalogue : 2 barres comparées |
| `public/docs/images/exemple-barre.png` | Exemple : comparaison avec calcul + réponse |
| `e2e/screenshots/desktop-chrome/08-bar-3x.png` | Barre avec multiplicateur 3× |
| `e2e/screenshots/desktop-chrome/09-bars-duplicated-aligned.png` | Barres dupliquées et alignées |
| `e2e/screenshots/desktop-chrome/23-bar-labeled.png` | Barre nommée |
| `e2e/screenshots/desktop-chrome/91-barre-fraction-label.png` | Barre avec subdivisions et fraction |
| `e2e/screenshots/desktop-chrome/104-bars-different-sizes.png` | Barres de tailles différentes |
| `e2e/screenshots/desktop-chrome/105-bars-equalized.png` | Barres égalisées |
| `e2e/screenshots/desktop-chrome/106-bar-half-vs-full.png` | Barre ½× vs 1× |
| `e2e/screenshots/desktop-chrome/107-bar-part-labels.png` | Étiquettes par part sur barre |
| `e2e/screenshots/desktop-chrome/167-barre-sans-1x.png` | Barre sans label 1× |
| `e2e/screenshots/desktop-chrome/205-barre-parts-colorees.png` | Barre avec parts colorées |
| `e2e/screenshots/desktop-chrome/200-accolade-groupement.png` | Barres groupées avec accolade |
| `e2e/screenshots/desktop-chrome/213-egaliser.png` | Égalisation de barres |

### Boîtes
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-boite.png` | Catalogue : boîte avec jetons |
| `e2e/screenshots/desktop-chrome/51-boite-placed.png` | Boîte placée |
| `e2e/screenshots/desktop-chrome/52-boite-with-jetons.png` | Boîte avec jetons à l'intérieur |
| `e2e/screenshots/desktop-chrome/92-boite-with-value.png` | Boîte avec valeur |
| `e2e/screenshots/desktop-chrome/93-boite-color-autoresize.png` | Boîte couleur + auto-resize |
| `public/docs/images/exemple-boite.png` | Exemple : 4 boîtes × 6 jetons |

### Flèches
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-fleche.png` | Catalogue : flèche entre jetons |
| `public/docs/images/exemple-fleche.png` | Exemple : flèche "donne 5" entre 2 jetons |
| `e2e/screenshots/desktop-chrome/47-arrow-created.png` | Flèche créée entre pièces |
| `e2e/screenshots/desktop-chrome/208-fleche-etiquette.png` | Flèche avec étiquette |

### Étiquettes et Inconnues
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-etiquette.png` | Catalogue : étiquette |
| `public/docs/images/exemple-etiquette.png` | Exemple : étiquettes sur boîtes |
| `public/docs/images/catalogue-inconnue.png` | Catalogue : inconnue "?" |
| `public/docs/images/exemple-inconnue.png` | Exemple : inconnue entre 2 barres |
| `e2e/screenshots/desktop-chrome/53-etiquette-placed.png` | Étiquette placée |

### Calcul et Réponse
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-calcul-expression.png` | Catalogue : expression libre |
| `public/docs/images/catalogue-reponse.png` | Catalogue : réponse |
| `public/docs/images/exemple-calcul.png` | Exemple : expression 28 × 4 = 112 |
| `public/docs/images/exemple-reponse.png` | Exemple : phrase-réponse |
| `e2e/screenshots/desktop-chrome/10-calcul-placed.png` | Calcul placé |
| `e2e/screenshots/desktop-chrome/11-reponse-placed.png` | Réponse placée |
| `e2e/screenshots/desktop-chrome/30-template-submenu.png` | Sous-menu gabarits de réponse |
| `e2e/screenshots/desktop-chrome/31-template-applied.png` | Gabarit réponse appliqué |
| `e2e/screenshots/desktop-chrome/110-two-reponses.png` | Deux réponses numérotées |

### Tableau
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-tableau.png` | Catalogue : tableau vide |
| `public/docs/images/exemple-tableau.png` | Exemple : tableau avec données |
| `e2e/screenshots/desktop-chrome/111-tableau-editing-highlight.png` | Édition tableau avec surlignage |
| `e2e/screenshots/desktop-chrome/120-tableau-preview-5-rows.png` | Prévisualisation dimensions |

### Droite numérique
| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-droite.png` | Catalogue : droite numérique |
| `public/docs/images/exemple-droite.png` | Exemple : droite avec marqueurs |
| `e2e/screenshots/desktop-chrome/26-droite-numerique-placed.png` | Droite placée |
| `e2e/screenshots/desktop-chrome/70-droite-max20-pas2.png` | Droite max=20, pas=2 |
| `e2e/screenshots/desktop-chrome/76-droite-100-pas1.png` | Droite max=100, pas=1 (saturation) |
| `e2e/screenshots/desktop-chrome/77-droite-min5.png` | Droite min=5 (départ non-zéro) |
| `e2e/screenshots/desktop-chrome/113-droite-markers-labels.png` | Droite avec marqueurs et labels |
| `e2e/screenshots/desktop-chrome/114-droite-width-300.png` | Droite largeur 300mm |
| `e2e/screenshots/desktop-chrome/135-droite-marqueurs-gros.png` | Droite marqueurs agrandis |
| `e2e/screenshots/desktop-chrome/216-droite-numerique.png` | Droite numérique gros plan |
| `e2e/screenshots/desktop-chrome/220-droite-negatifs.png` | Droite avec nombres négatifs |

## 3. Outils de calcul (expression, colonnes, division)

| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-calcul-colonnes.png` | Catalogue : calcul en colonnes |
| `public/docs/images/catalogue-calcul-division.png` | Catalogue : division posée |
| `e2e/screenshots/desktop-chrome/56-colonnes-overlay.png` | Overlay calcul en colonnes |
| `e2e/screenshots/desktop-chrome/206-colonnes-retenues.png` | Colonnes avec retenues (addition) |
| `docs/expert-review/images/C1-soustraction-emprunts.png` | **Soustraction en colonnes avec emprunts** |
| `docs/expert-review/images/C2-multiplication-intermediaires.png` | **Multiplication en colonnes avec lignes intermédiaires** |
| `e2e/screenshots/desktop-chrome/156-transition-colonnes.png` | Transition expression → colonnes |
| `e2e/screenshots/desktop-chrome/210-transition-colonnes.png` | Transition expression → colonnes (détail) |
| `e2e/screenshots/desktop-chrome/28-division-posee-overlay.png` | Overlay division posée |
| `e2e/screenshots/desktop-chrome/207-division-completee.png` | Division complétée |
| `e2e/screenshots/desktop-chrome/155-division-tab-order.png` | Division tab order |
| `e2e/screenshots/desktop-chrome/136-decimaux-calcul.png` | Nombres décimaux dans calcul |

## 4. Schémas et diagrammes

| Image | Description |
|-------|-------------|
| `public/docs/images/catalogue-schema-parties.png` | Catalogue : schéma parties-tout |
| `public/docs/images/catalogue-schema-comparaison.png` | Catalogue : schéma comparaison |
| `public/docs/images/catalogue-schema-groupes.png` | Catalogue : schéma groupes-égaux |
| `public/docs/images/catalogue-schema-transformation.png` | Catalogue : schéma transformation |
| `public/docs/images/exemple-schema.png` | Exemple : schéma parties-tout |
| `public/docs/images/exemple-schema-comparaison-ex.png` | Exemple : schéma comparaison |
| `docs/expert-review/images/B1-schema-groupes-egaux.png` | **Schéma groupes-égaux avec calcul et réponse** |
| `docs/expert-review/images/B2-schema-transformation.png` | **Schéma transformation avec calcul et réponse** |
| `docs/expert-review/images/B3-schema-libre.png` | **Schéma libre (3 barres personnalisées)** |
| `public/docs/images/catalogue-arbre.png` | Catalogue : arbre (dénombrement) |
| `public/docs/images/exemple-arbre.png` | Exemple : arbre de probabilité |
| `public/docs/images/catalogue-diagramme-bandes.png` | Catalogue : diagramme à bandes |
| `public/docs/images/exemple-diagramme-bandes.png` | Exemple : diagramme à bandes |
| `public/docs/images/catalogue-diagramme-ligne.png` | Catalogue : diagramme à ligne brisée |
| `public/docs/images/exemple-diagramme-ligne.png` | Exemple : diagramme à ligne brisée |

## 5. Profils d'accommodation

| Image | Description |
|-------|-------------|
| `public/docs/images/guide-profils-rapides.png` | Panneau paramètres avec profils rapides |
| `e2e/screenshots/desktop-chrome/64-settings-panel.png` | Panneau paramètres complet |
| `e2e/screenshots/desktop-chrome/65-settings-panel-scrolled.png` | Paramètres (scrollé) |
| `e2e/screenshots/desktop-chrome/66-aide-maximale-selected.png` | Profil Aide maximale sélectionné |
| `e2e/screenshots/desktop-chrome/67-aide-maximale-canvas.png` | Canvas avec profil Aide maximale |
| `e2e/screenshots/desktop-chrome/160-aide-maximale.png` | Aide maximale complet |
| `e2e/screenshots/desktop-chrome/209-canvas-dense-aide-max.png` | Canvas dense + Aide maximale |
| `docs/expert-review/images/A6-profil-aide-attention.png` | **Profil Aide + Attention (zones suggérées + tolérance large)** |
| `docs/expert-review/images/A7-profil-aide-lecture.png` | **Profil Aide + Lecture (texte 1.5×)** |

## 6. Accessibilité visuelle

| Image | Description |
|-------|-------------|
| `e2e/screenshots/desktop-chrome/121-high-contrast.png` | Mode contraste élevé |
| `e2e/screenshots/desktop-chrome/123-high-contrast-with-content.png` | Contraste élevé avec contenu |
| `e2e/screenshots/desktop-chrome/139-high-contrast-canvas-charge.png` | Contraste élevé, canvas chargé |
| `e2e/screenshots/desktop-chrome/73-dyslexia-profile.png` | Profil dyslexie (OpenDyslexic) |
| `e2e/screenshots/desktop-chrome/122-dyslexie-probleme-surligne.png` | Dyslexie + problème surligné |
| `e2e/screenshots/desktop-chrome/141-dyslexie-avec-contenu.png` | Dyslexie avec contenu rempli |
| `e2e/screenshots/desktop-chrome/215-dyslexie-complet.png` | Profil dyslexie complet |
| `docs/expert-review/images/A1-atkinson-hyperlegible.png` | **Police Atkinson Hyperlegible avec contenu** |
| `e2e/screenshots/desktop-chrome/116-letter-spacing-settings.png` | Espacement lettres (paramètres) |
| `e2e/screenshots/desktop-chrome/117-letter-spacing-applied.png` | Espacement lettres appliqué |
| `e2e/screenshots/desktop-chrome/118-counter-visible.png` | Compteur jetons visible |
| `e2e/screenshots/desktop-chrome/119-counter-hidden.png` | Compteur jetons masqué |

## 7. Accessibilité motrice

| Image | Description |
|-------|-------------|
| `docs/expert-review/images/A2-zones-suggerees.png` | **Zones de positionnement suggérées (showSuggestedZones)** |
| `docs/expert-review/images/A4-main-gauche.png` | **Main dominante gauche (action bar inversée)** |
| `e2e/screenshots/desktop-chrome/161-aide-max-ctx.png` | Aide maximale + context actions (tolérance très large) |
| `e2e/screenshots/desktop-chrome/54-deplacer-picked-up.png` | Déplacer : pièce soulevée |
| `e2e/screenshots/desktop-chrome/55-deplacer-moved.png` | Déplacer : pièce déposée |

## 8. Aides à la lecture et cognition

| Image | Description |
|-------|-------------|
| `e2e/screenshots/desktop-chrome/32-tts-button-visible.png` | Bouton TTS visible dans zone problème |
| `e2e/screenshots/desktop-chrome/130-tts-speaking.png` | TTS en cours (surlignage mot à mot) |
| `e2e/screenshots/desktop-chrome/36-guided-reading-sentence1.png` | Lecture guidée : phrase 1 |
| `e2e/screenshots/desktop-chrome/37-guided-reading-sentence2.png` | Lecture guidée : phrase 2 |
| `e2e/screenshots/desktop-chrome/38-guided-reading-all.png` | Lecture guidée : toutes les phrases |
| `e2e/screenshots/desktop-chrome/97-surlignage-4-couleurs.png` | Surlignage 4 couleurs (données/question/contexte/superflu) |
| `e2e/screenshots/desktop-chrome/140-surlignage-verifie.png` | Surlignage vérifié |
| `e2e/screenshots/desktop-chrome/202-zone-repliee-highlights.png` | Zone repliée avec highlights visibles |
| `docs/expert-review/images/A8-probleme-toujours-visible.png` | **Problème toujours visible pendant modélisation** |

## 9. Scaffolding (relance, tutoriel, estompage)

| Image | Description |
|-------|-------------|
| `e2e/screenshots/desktop-chrome/68-inactivity-relance.png` | Relance après inactivité |
| `e2e/screenshots/desktop-chrome/82-relance-question-visible.png` | Question de relance dans barre de statut |
| `e2e/screenshots/desktop-chrome/151-relance-pfeq.png` | Messages de relance PFEQ |
| `e2e/screenshots/desktop-chrome/203-tutoriel-en-cours.png` | Tutoriel en cours |
| `e2e/screenshots/desktop-chrome/152-coherence-tutoriel.png` | Cohérence du tutoriel avec interface |
| `docs/expert-review/images/A3-mode-concentre-estompage.png` | **Mode concentré (estompage des pièces non sélectionnées)** |
| `docs/expert-review/images/A5-minuteur-session.png` | **Minuteur de session visible** |
| `e2e/screenshots/desktop-chrome/115-locked-piece-padlock.png` | Pièce verrouillée (cadenas) |
| `e2e/screenshots/desktop-chrome/201-piece-verroueillee.png` | Pièce verrouillée (détail) |

## 10. Responsive (mobile, tablette, zoom)

| Image | Description |
|-------|-------------|
| `e2e/screenshots/desktop-chrome/60-tablet-initial.png` | Tablette 768px : état initial |
| `e2e/screenshots/desktop-chrome/61-tablet-context-actions.png` | Tablette : context actions |
| `e2e/screenshots/desktop-chrome/74-tablet-aide-max.png` | Tablette + Aide maximale |
| `e2e/screenshots/desktop-chrome/80-mobile-portrait.png` | Mobile portrait 375px |
| `e2e/screenshots/desktop-chrome/81-mobile-portrait-ctx.png` | Mobile portrait : context actions |
| `e2e/screenshots/desktop-chrome/230-mobile-bottom-toolbar.png` | Mobile : bottom toolbar |
| `e2e/screenshots/desktop-chrome/231-mobile-drawer-open.png` | Mobile : drawer outils ouvert |
| `e2e/screenshots/desktop-chrome/232-mobile-after-drawer-select.png` | Mobile : après sélection dans drawer |
| `e2e/screenshots/desktop-chrome/128-mobile-paysage-editeur.png` | Mobile paysage : éditeur |
| `e2e/screenshots/desktop-chrome/87-zoom-150.png` | Zoom 150% |
| `e2e/screenshots/desktop-chrome/163-zoom-150.png` | Zoom 150% (vérifié) |

## 11. Scénarios pédagogiques complets

Chaque scénario montre un problème surligné + modélisation + calcul + réponse.

| Image | Description | Opération | Pièces utilisées |
|-------|-------------|-----------|-----------------|
| `docs/expert-review/images/D1-scenario-addition-jetons.png` | **Addition avec jetons** | 12 + 8 = 20 | Jetons, étiquettes, calcul, réponse |
| `docs/expert-review/images/D2-scenario-comparaison-barres.png` | **Comparaison avec barres** | 45 − 28 = 17 | Barres, inconnue, calcul, réponse |
| `docs/expert-review/images/D3-scenario-multiplication-groupes.png` | **Multiplication avec groupement** | 4 × 6 = 24 | Barres groupées (accolade), calcul, réponse |
| `docs/expert-review/images/D4-scenario-division.png` | **Division posée** | 156 ÷ 6 = 26 | Calcul (columnData division), réponse |
| `docs/expert-review/images/D5-scenario-multi-etapes.png` | **Problème multi-étapes** | Transport + entrée − subvention | Schéma parties-tout, 4 calculs, réponse |
| `docs/expert-review/images/D6-scenario-statistiques.png` | **Statistiques** | Comparaison de données | Diagramme à bandes, tableau, calcul, réponse |
| `e2e/screenshots/desktop-chrome/204-workflow-complet.png` | Workflow complet bout en bout | — | Divers |
| `e2e/screenshots/desktop-chrome/131-probleme-2-etapes-complet.png` | Problème 2 étapes complet | — | Divers |
| `e2e/screenshots/desktop-chrome/137-barre-plus-tableau.png` | Combinaison barre + tableau | — | Barres, tableau |

## 12. Partage et export

| Image | Description |
|-------|-------------|
| `public/docs/images/guide-partager-menu.png` | Menu Partager ouvert |
| `public/docs/images/guide-share-panel.png` | Panneau lien & QR code |
| `e2e/screenshots/desktop-chrome/58-after-photo-export.png` | Après export photo (PNG) |
| `e2e/screenshots/desktop-chrome/59-share-panel.png` | Panneau de partage |
| `e2e/screenshots/desktop-chrome/44-slot-manager.png` | Gestionnaire "Mes travaux" |

## 13. Banque de problèmes

| Image | Description |
|-------|-------------|
| `public/docs/images/guide-banque-problemes.png` | Banque de problèmes |
| `e2e/screenshots/desktop-chrome/22-problem-selector.png` | Sélecteur de problème |
| `e2e/screenshots/desktop-chrome/39-problem-bank-cycle2.png` | Banque filtrée : cycle 2 |
| `e2e/screenshots/desktop-chrome/13-problem-loaded.png` | Problème chargé |

## 14. Interactions et context actions

| Image | Description |
|-------|-------------|
| `e2e/screenshots/desktop-chrome/06-bar-selected-context-actions.png` | Barre sélectionnée + context actions |
| `e2e/screenshots/desktop-chrome/07-context-actions-detail.png` | Détail context actions |
| `e2e/screenshots/desktop-chrome/48-bars-before-grouping.png` | Barres avant groupement |
| `e2e/screenshots/desktop-chrome/49-grouping-mode.png` | Mode groupement actif |
| `e2e/screenshots/desktop-chrome/50-bars-grouped.png` | Barres groupées |
| `e2e/screenshots/desktop-chrome/108-before-repartir.png` | Avant répartir |
| `e2e/screenshots/desktop-chrome/109-after-repartir-3-groups.png` | Après répartir en 3 groupes |
| `e2e/screenshots/desktop-chrome/132-repartir-reste-visible.png` | Répartir avec reste visible |
| `e2e/screenshots/desktop-chrome/102-before-ranger.png` | Avant ranger |
| `e2e/screenshots/desktop-chrome/103-after-ranger.png` | Après ranger |
| `e2e/screenshots/desktop-chrome/159-supprimer-ctx.png` | Supprimer dans context actions |
| `e2e/screenshots/desktop-chrome/166-groupement-terminer.png` | Bouton Terminer mode groupement |
| `e2e/screenshots/desktop-chrome/20b-confirm-dialog.png` | Dialogue de confirmation |
