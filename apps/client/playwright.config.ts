import { defineConfig } from '@playwright/test';

const PHONE_VIEWPORT = { width: 390, height: 844 };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: PHONE_VIEWPORT,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'default',
      testIgnore: '**/helpers/**',
    },
    {
      name: 'pseudo',
      testIgnore: '**/helpers/**',
    },
    {
      name: 'pseudo-cjk',
      testMatch: '**/usability.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
