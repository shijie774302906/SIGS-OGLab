import { defineConfig, devices } from '@playwright/test';

const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const webServerUrl = environment.PLAYWRIGHT_WEB_SERVER_URL ?? 'http://127.0.0.1:5173';
const webServerCommand = environment.PLAYWRIGHT_WEB_SERVER_COMMAND
  ?? '"C:\\Program Files\\nodejs\\npm.cmd" run dev -- --port 5173';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './process_logs/playwright-results/real-serial',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: webServerUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'real-serial', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: webServerCommand, url: webServerUrl, reuseExistingServer: true, timeout: 60_000 },
});
