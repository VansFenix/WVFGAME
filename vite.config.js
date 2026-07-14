import { defineConfig } from 'vite';

export default defineConfig({
  base: '/WVFGAME/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
