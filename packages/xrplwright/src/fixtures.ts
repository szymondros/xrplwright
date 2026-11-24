import { test as base } from '@playwright/test';

import { NETWORKS, XrplLedger } from './ledger/XrplLedger.js';
import { CrossmarkWallet } from './wallets/crossmark/CrossmarkWallet.js';

export type WalletKind = 'crossmark';

export interface XrplOptions {
  /** XRPL node the wallet and helpers use. Defaults to Testnet. */
  xrplUrl: string;
  /** Which wallet the page sees. */
  walletKind: WalletKind;
  /** Account secret (seed, secret numbers or hex private key); a fresh, unfunded account when undefined. */
  walletSeed: string | undefined;
  /** Fund a fresh account from the faucet before the test. Ignored with a seed. */
  fundWallet: boolean;
}

export interface XrplFixtures {
  ledger: XrplLedger;
  wallet: CrossmarkWallet;
}

const WALLETS = {
  crossmark: CrossmarkWallet,
} satisfies Record<WalletKind, unknown>;

/**
 * Playwright `test` with `wallet` (installed into `page` before navigation)
 * and `ledger`. Configure per project or per file with `test.use({ ... })`.
 */
export const test = base.extend<XrplOptions & XrplFixtures>({
  xrplUrl: [NETWORKS.testnet, { option: true }],
  walletKind: ['crossmark', { option: true }],
  walletSeed: [undefined, { option: true }],
  fundWallet: [false, { option: true }],

  ledger: async ({ xrplUrl }, use) => {
    const ledger = new XrplLedger(xrplUrl);
    await use(ledger);
    await ledger.close();
  },

  // Auto: every page gets the wallet, also in tests that never name the fixture
  // (a dapp checks for the wallet whether or not the test inspects it).
  wallet: [
    async ({ page, ledger, walletKind, walletSeed, fundWallet }, use) => {
      const wallet = new WALLETS[walletKind]({ seed: walletSeed, ledger });
      if (fundWallet && !walletSeed) await ledger.fund(wallet.wallet);
      await wallet.install(page);
      await use(wallet);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
