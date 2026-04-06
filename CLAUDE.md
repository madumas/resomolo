# CLAUDE.md — RésoMolo

## Avertissement professionnel — gestes réservés et champ d'expertise

**Aucun code, commentaire, documentation, spec, rapport, nom d'agent ou libellé dans ce projet ne doit laisser croire qu'un professionnel réel a été consulté ou a émis un avis.** Ceci s'applique que ce soit vrai ou non.

Les agents spécialisés (ergo-tdc-expert, pedagogue-quebec-primaire, neuropsych-expert, etc.) sont des assistants IA. Leurs sorties ne constituent pas des avis professionnels. Les termes « évaluation », « rapport », « prescription », « recommandation clinique » et similaires doivent être évités ou explicitement qualifiés comme provenant d'une IA.

Concrètement :
- Ne jamais écrire « recommandé par un ergothérapeute » ou « validé par un neuropsychologue » — écrire « suggestions générées par IA, à valider par un professionnel qualifié »
- Ne jamais utiliser de titres professionnels réservés (erg., OT, neuropsy., orthopédagogue) comme auteur ou source
- Les documents comme `guide-prescription.md`, `limites.md`, `estompage.md` sont des ébauches à soumettre à des professionnels — pas des documents cliniques finaux
- Les références bibliographiques proviennent de la mémoire d'entraînement du modèle et doivent être vérifiées avant toute publication

Au Québec, les gestes réservés incluent notamment l'évaluation des troubles d'apprentissage, la prescription d'outils compensatoires, et les recommandations d'intervention. Ces gestes relèvent d'ordres professionnels (OEQ, OPQ, etc.) et ne peuvent être posés que par des membres en règle.

## Release & Versioning

- **Branches:** `dev` pour le développement, `main` pour la production. Cloudflare auto-déploie sur push à `main`.
- **Conventional commits:** `fix:` → patch, `feat:` → minor, `BREAKING CHANGE` → major.
- **Release script:** `npm run release` (ou `./scripts/release.sh`). Auto-détecte le bump depuis les commits depuis le dernier tag, merge `dev` → `main`, `npm version`, crée un tag git léger, push branche et tag séparément (pas `--follow-tags` qui ne push que les tags annotés), sync `dev`.
- **Build hash & branch:** `__BUILD_HASH__` (git short hash) et `__GIT_BRANCH__` injectés au build via `vite.config.ts`. Détection de branche : `CF_PAGES_BRANCH` env → git branch → tag match → release commit message match → fallback `dev`.
- **Tags:** Semver léger avec préfixe `v` (`v0.1.0`, `v0.2.0`). Créés par le script de release, jamais manuellement. Doivent être pushés explicitement (`git push origin v{version}`).
- **Docs PDF:** Le script de release cherche `docs/generate-pdfs.mjs` et l'exécute s'il existe pour stamper la version dans les docs HTML et regénérer les PDFs.

## Politique de tests — les tests ont raison

**Quand un test échoue, c'est l'application qui est fautive, pas le test.** Les tests sont la source de vérité sur le comportement attendu.

Concrètement :
- Ne jamais modifier un test pour contourner un bug dans l'application
- Ne jamais ajouter de skip, xfail, ou condition pour masquer un échec réel
- Ne jamais affaiblir une assertion (changer `toBe` en `toContain`, élargir une tolérance, etc.) pour faire passer un test
- Quand un test échoue : identifier la cause racine dans le code de l'application et corriger le code, pas le test
- Les seules modifications acceptables aux tests sont : corriger un test qui teste le mauvais comportement (bug dans le test lui-même, confirmé par la spec), ou adapter un test suite à un changement intentionnel de la spec/fonctionnalité
