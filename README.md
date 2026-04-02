# RésoMolo

Aidez votre enfant à modéliser des problèmes de maths visuellement.

RésoMolo permet de manipuler des jetons, barres, boîtes et autres pièces pour représenter et résoudre des problèmes mathématiques — sans crayon, sans découpage, sans motricité fine. Pensé pour les enfants du primaire au Québec.

## Démarrage rapide

```bash
npm install
npm run dev
```

L'application sera disponible sur `http://localhost:5173`.

## Tests

```bash
npm test              # tests unitaires (Vitest)
npx playwright test   # tests e2e
```

## Stack technique

- **React** + **TypeScript** — interface
- **Vite** — bundler
- **SVG** — rendu du canevas de modélisation
- **Vitest** — tests unitaires
- **Playwright** — tests end-to-end

## Licence

[MIT](LICENSE)
