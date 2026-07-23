const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  "import {defineConfig, loadEnv} from 'vite';",
  "import {defineConfig, loadEnv} from 'vite';\nimport { VitePWA } from 'vite-plugin-pwa';"
);

code = code.replace(
  "plugins: [react(), tailwindcss()],",
  `plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'TryRating Tracker',
          short_name: 'Tracker',
          description: 'A tracking app for TryRating ERT.',
          theme_color: '#6366f1',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],`
);

fs.writeFileSync('vite.config.ts', code);
console.log('patched vite config');
