import { defineConfig } from '@playwright/test';

// Runs against an already-started stack (API :4000, web :5173) so the same
// config works for `npm run dev` locally and for the CI job that starts both.
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  outputDir: process.env.E2E_OUT ?? 'playwright-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    viewport: { width: 1360, height: 900 },
    screenshot: 'off',
    trace: 'off',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? undefined }
  }
});
