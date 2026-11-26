import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  // Testnet and its faucet have short outages; offline tests never need a retry.
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
});
