import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

const require = createRequire(import.meta.url);
const sdkSource = readFileSync(require.resolve('@crossmarkio/sdk/umd'), 'utf8');

export const DAPP_URL = 'https://dapp.xrplwright.test/';

/** A blank dapp that loads the real @crossmarkio/sdk, served without a network. */
export async function openDemoDapp(page: Page): Promise<void> {
  await page.route('https://dapp.xrplwright.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sdk.js') {
      return route.fulfill({ contentType: 'text/javascript', body: sdkSource });
    }
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><script src="/sdk.js"></script></head><body>demo dapp</body></html>',
    });
  });
  await page.goto(DAPP_URL);
}
