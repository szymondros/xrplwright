import { defineConfig, devices } from '@playwright/test';
import { loadDotenv, type XrplOptions } from 'xrplwright';

loadDotenv(import.meta.dirname);

export default defineConfig<XrplOptions>({
  testDir: './tests',
  timeout: 120_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0, // the Testnet faucet is sometimes slow
  reporter: [['list'], ['html', { open: 'never' }]],
  // Starts the demo dapp for the tests; against your own dapp, drop this and set baseURL.
  webServer: { command: 'node server.js', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
  use: {
    baseURL: 'http://localhost:4173',
    xrplUrl: process.env.E2E_XRPL_URL ?? 'wss://s.altnet.rippletest.net:51233',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
