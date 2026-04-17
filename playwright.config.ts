import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5176',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --port 5176 --strictPort',
    port: 5176,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
});
