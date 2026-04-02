import { defineConfig } from 'vitest/config'
import { execSync } from 'child_process'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'unknown'; }
})();

const gitBranch = (() => {
  try { return execSync('git rev-parse --abbrev-ref HEAD').toString().trim(); }
  catch { return 'unknown'; }
})();

// https://vite.dev/config/
export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RésoMolo — Modélisation mathématique',
        short_name: 'RésoMolo',
        description: 'Outil de modélisation visuelle de problèmes mathématiques pour le primaire québécois',
        theme_color: '#185FA5',
        background_color: '#FAFCFF',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/resomolo-badge.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
