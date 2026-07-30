import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:8788',
    // Use the environment's pre-installed Chromium when the pinned Playwright
    // version's own browser build isn't downloaded.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    port: 8788,
    reuseExistingServer: !process.env.CI,
  },
});
