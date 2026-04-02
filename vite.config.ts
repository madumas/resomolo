import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
