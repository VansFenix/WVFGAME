import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wvfgame/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
