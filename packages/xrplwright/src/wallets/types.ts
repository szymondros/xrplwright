import type { Page } from '@playwright/test';
import type { Wallet } from 'xrpl';

export type Decision = 'approve' | 'reject';

/** A request the dapp sent to the wallet, as the wallet's protocol names it. */
export interface WalletRequest {
  command: string;
  data: unknown;
}

/**
 * A wallet a dapp under test can talk to. Each implementation speaks one
 * wallet's page protocol (Crossmark, GemWallet, ...) and signs with a real
 * key, so backends verify its signatures like the real wallet's.
 */
export interface WalletDriver<Req extends WalletRequest = WalletRequest> {
  readonly name: string;
  readonly wallet: Wallet;
  readonly address: string;
  /** Every request received, in order. */
  readonly requests: Req[];
  /** Make the wallet visible to a page. Call before the page's first navigation. */
  install(page: Page): Promise<void>;
  /** The next `count` prompts are rejected, as if the user clicked Reject. */
  rejectNext(count?: number): void;
  /** The next `count` prompts are approved (to order decisions before a rejection). */
  approveNext(count?: number): void;
  /** Resolves with the first request (past or future) that matches. */
  waitForRequest(predicate?: (request: Req) => boolean, timeout?: number): Promise<Req>;
}
