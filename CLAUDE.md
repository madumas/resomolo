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

## Politique de tests — les tests ont raison

**Quand un test échoue, c'est l'application qui est fautive, pas le test.** Les tests sont la source de vérité sur le comportement attendu.

Concrètement :
- Ne jamais modifier un test pour contourner un bug dans l'application
- Ne jamais ajouter de skip, xfail, ou condition pour masquer un échec réel
- Ne jamais affaiblir une assertion (changer `toBe` en `toContain`, élargir une tolérance, etc.) pour faire passer un test
- Quand un test échoue : identifier la cause racine dans le code de l'application et corriger le code, pas le test
- Les seules modifications acceptables aux tests sont : corriger un test qui teste le mauvais comportement (bug dans le test lui-même, confirmé par la spec), ou adapter un test suite à un changement intentionnel de la spec/fonctionnalité
