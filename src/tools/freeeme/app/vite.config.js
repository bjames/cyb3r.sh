import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    manifest: true,
    rollupOptions: { input: 'src/main.js' },
  },
});
