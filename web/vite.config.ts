import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

// base './' lets the built app live in any folder, for example a GitHub Pages project path.
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Ferrea',
        short_name: 'Ferrea',
        description: 'Un semplice diario di allenamento che mostra il tuo prossimo obiettivo.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f4f2',
        theme_color: '#f4f4f2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // Lets a tunnel such as ngrok reach `npm run preview`; Vite refuses unknown hostnames otherwise.
  preview: {
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', 'tonya-crewneck-archie.ngrok-free.dev'],
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
})
