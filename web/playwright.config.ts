import { defineConfig, devices } from '@playwright/test';

// Expects the API server running with the built web app (see README "End-to-end tests").
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:8787', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
