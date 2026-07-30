import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './process_logs/playwright-results/domain-fast',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  projects: [{ name: 'domain-fast' }],
});
