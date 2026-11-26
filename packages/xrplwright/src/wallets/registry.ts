import type { WalletOptions } from './BaseWallet.js';
import { CrossmarkWallet } from './crossmark/CrossmarkWallet.js';
import { GemWallet } from './gemwallet/GemWallet.js';

/** Every wallet xrplwright can stand in for, by the name `walletKind` and `walletTest()` take. */
export const WALLETS = {
  crossmark: CrossmarkWallet,
  gemwallet: GemWallet,
} as const;

export type WalletKind = keyof typeof WALLETS;

/** The driver class of a wallet kind, e.g. `WalletOf<'gemwallet'>` is `GemWallet`. */
export type WalletOf<K extends WalletKind> = InstanceType<(typeof WALLETS)[K]>;

export function createWallet<K extends WalletKind>(kind: K, options: WalletOptions): WalletOf<K> {
  const Driver = WALLETS[kind];
  if (!Driver) throw new Error(`xrplwright: unknown walletKind "${kind}" (known: ${Object.keys(WALLETS).join(', ')})`);
  return new Driver(options) as WalletOf<K>;
}
