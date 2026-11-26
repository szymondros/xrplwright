import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

const require = createRequire(import.meta.url);

/** UMD builds of the wallets' real SDKs. */
const SDKS = {
  crossmark: () => readFileSync(require.resolve('@crossmarkio/sdk/umd'), 'utf8'),
  // Exposes `window.GemWalletApi`.
  gemwallet: () => readFileSync(require.resolve('@gemwallet/api/umd/gemwallet-api.js'), 'utf8'),
};

export const DAPP_URL = 'https://dapp.xrplwright.test/';

/** A blank dapp that loads a wallet's real SDK, served without a network. */
export async function openDemoDapp(page: Page, sdk: keyof typeof SDKS = 'crossmark'): Promise<void> {
  const sdkSource = SDKS[sdk]();
  await page.route('https://dapp.xrplwright.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sdk.js') {
      return route.fulfill({ contentType: 'text/javascript', body: sdkSource });
    }
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>demo dapp</title><script src="/sdk.js"></script></head><body>demo dapp</body></html>',
    });
  });
  await page.goto(DAPP_URL);
}
