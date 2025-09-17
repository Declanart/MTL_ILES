import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/MTL_ILES/', // <- déjà présent chez toi
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Les Motivés',
        short_name: 'Motivés',
        description: 'Suivi des kilomètres en groupe, synchro temps réel.',
        theme_color: '#111111',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/MTL_ILES/',      // <- important sur GitHub Pages
        start_url: '/MTL_ILES/',  // <- important sur GitHub Pages
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // laisse par défaut : assets Vite cachés, index fallback
      }
    })
  ]
})
