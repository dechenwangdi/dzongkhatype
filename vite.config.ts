import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
export default defineConfig({
 plugins: [react(), VitePWA({
   strategies: 'generateSW',
   registerType: 'prompt',
   injectRegister: 'script',
   scope: './',
   includeAssets: ['fonts/OFL.txt'],
   manifest: {
     name: 'Dzongkha Typing Practice', short_name: 'Dzongkha Typing',
     description: 'Practice Dzongkha typing and improve your typing speed and accuracy.',
     start_url: './', scope: './', display: 'standalone', lang: 'dz',
     background_color: '#faf2df', theme_color: '#944312',
     icons: [
       { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
       { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
       { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
     ],
   },
   workbox: {
     globPatterns: ['**/*.{js,css,html,png,svg,json,woff2,ttf}'],
     navigateFallback: 'index.html',
     cleanupOutdatedCaches: true,
     clientsClaim: true,
     // No runtime routes: feedback POSTs are never cached or queued.
     runtimeCaching: [],
   },
   devOptions: { enabled: false },
 })], resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
 // Keep every build relocatable, including GitHub Pages repository deployments.
 base: './',
 build: { outDir: 'dist' },
});
