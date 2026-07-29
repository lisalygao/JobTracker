import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

// Builds the side panel (HTML entry) and the background service worker (ES
// module). Content scripts need IIFE format, which Rollup can't code-split,
// so they are bundled separately by scripts/build-content.mjs.
export default defineConfig({
  root: resolve(root, 'src'),
  publicDir: resolve(root, 'public'),
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(root, 'src/sidepanel/index.html'),
        background: resolve(root, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
