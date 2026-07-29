import { defineConfig } from 'vitest/config';

// Standalone config: vite.config.ts sets root to src/ for the extension
// build, which would hide the tests/ directory from vitest.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
