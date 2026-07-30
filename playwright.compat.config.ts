import { defineConfig, devices } from '@playwright/test';

const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const webServerUrl = environment.PLAYWRIGHT_WEB_SERVER_URL ?? 'http://127.0.0.1:5173';
const webServerCommand = environment.PLAYWRIGHT_WEB_SERVER_COMMAND
  ?? '"C:\\Program Files\\nodejs\\npm.cmd" run dev -- --port 5173';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './process_logs/playwright-results/compatibility',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: webServerUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'firefox-smoke',
      use: {
        ...devices['Desktop Firefox'],
        firefoxUserPrefs: {
          'gfx.webrender.all': false,
          'gfx.webrender.software': false,
          'layers.acceleration.disabled': true,
        },
      },
    },
    {
      name: 'webkit-smoke',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: webServerUrl,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
