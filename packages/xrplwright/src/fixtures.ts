import { test as base, type Page } from '@playwright/test';

import { NETWORKS, XrplLedger } from './ledger/XrplLedger.js';
import type { CrossmarkWallet } from './wallets/crossmark/CrossmarkWallet.js';
import { createWallet, type WalletKind, type WalletOf } from './wallets/registry.js';

export type { WalletKind, WalletOf };

export interface XrplOptions {
  /** XRPL node the wallet and helpers use. Defaults to Testnet. */
  xrplUrl: string;
  /** Which wallet `test` installs. `walletTest(kind)` ignores it. */
  walletKind: WalletKind;
  /** Account secret (seed, secret numbers or hex private key); a fresh, unfunded account when undefined. */
  walletSeed: string | undefined;
  /** Fund a fresh account from the faucet before the test. Ignored with a seed. */
  fundWallet: boolean;
}

export interface XrplFixtures<W = CrossmarkWallet> {
  ledger: XrplLedger;
  wallet: W;
}

/** Options and the ledger: everything but the wallet. */
const xrpl = base.extend<XrplOptions & { ledger: XrplLedger }>({
  xrplUrl: [NETWORKS.testnet, { option: true }],
  walletKind: ['crossmark', { option: true }],
  walletSeed: [undefined, { option: true }],
  fundWallet: [false, { option: true }],

  ledger: async ({ xrplUrl }, use) => {
    const ledger = new XrplLedger(xrplUrl);
    await use(ledger);
    await ledger.close();
  },
});

interface WalletSetup {
  page: Page;
  ledger: XrplLedger;
  walletSeed: string | undefined;
  fundWallet: boolean;
}

async function setUpWallet<K extends WalletKind>(kind: K, { page, ledger, walletSeed, fundWallet }: WalletSetup) {
  const wallet = createWallet(kind, { seed: walletSeed, ledger });
  if (fundWallet && !walletSeed) await ledger.fund(wallet.account);
  await wallet.install(page);
  return wallet;
}

/**
 * Playwright `test` with `wallet` (installed into `page` before navigation)
 * and `ledger`. The wallet is Crossmark unless `walletKind` says otherwise;
 * for another wallet prefer `walletTest(kind)`, which also types `wallet`.
 */
export const test = xrpl.extend<{ wallet: CrossmarkWallet }>({
  // Auto: every page gets the wallet, also in tests that never name the fixture
  // (a dapp checks for the wallet whether or not the test inspects it).
  wallet: [
    async ({ page, ledger, walletKind, walletSeed, fundWallet }, use) => {
      // Typed as Crossmark for 0.1 compatibility; walletTest() gives the exact type.
      await use((await setUpWallet(walletKind, { page, ledger, walletSeed, fundWallet })) as CrossmarkWallet);
    },
    { auto: true },
  ],
});

/**
 * A `test` whose `wallet` is the given kind, typed accordingly:
 *
 * ```ts
 * const test = walletTest('gemwallet');
 * test('pays', async ({ page, wallet }) => { ... }); // wallet: GemWallet
 * ```
 */
export function walletTest<K extends WalletKind>(kind: K) {
  return xrpl.extend<{ wallet: WalletOf<K> }>({
    wallet: [
      async ({ page, ledger, walletSeed, fundWallet }, use) => {
        await use(await setUpWallet(kind, { page, ledger, walletSeed, fundWallet }));
      },
      { auto: true },
    ],
  });
}

export { expect } from '@playwright/test';
