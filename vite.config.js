import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: false, // We supply our own manifest.json in /public
      workbox: {
        // Cache the app shell and static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache Google API calls or Drive file content
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/oauth/,
          /^https:\/\/.*\.googleapis\.com/,
          /^https:\/\/accounts\.google\.com/,
        ],
        runtimeCaching: [
          {
            // Cache the Excalidraw assets (fonts, etc.)
            urlPattern: /^https:\/\/excalidraw\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'excalidraw-assets',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  base: '/drive-draw/',
})
