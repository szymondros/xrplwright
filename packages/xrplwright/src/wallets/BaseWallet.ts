import { ECDSA, Wallet } from 'xrpl';

import { walletFromSecret } from './secret.js';

import type { XrplLedger } from '../ledger/XrplLedger.js';
import type { Decision, WalletRequest } from './types.js';

export interface WalletOptions {
  /**
   * Secret of the account: family seed, secret numbers or hex private key
   * (see `walletFromSecret`). A fresh secp256k1 account is generated when omitted.
   */
  seed?: string;
  /** Ledger the wallet autofills and submits through. */
  ledger: XrplLedger;
}

/** Key, approval queue and request log shared by every wallet driver. */
export abstract class BaseWallet<Req extends WalletRequest> {
  readonly wallet: Wallet;
  readonly requests: Req[] = [];
  protected readonly ledger: XrplLedger;

  private readonly decisions: Decision[] = [];
  private readonly listeners = new Set<(request: Req) => void>();

  constructor(options: WalletOptions) {
    this.wallet = options.seed ? walletFromSecret(options.seed) : Wallet.generate(ECDSA.secp256k1);
    this.ledger = options.ledger;
  }

  get address(): string {
    return this.wallet.classicAddress;
  }

  /** The next `count` prompts (signatures, transactions) are rejected. */
  rejectNext(count = 1): void {
    for (let i = 0; i < count; i++) this.decisions.push('reject');
  }

  /**
   * The next `count` prompts are approved. Approving is the default; this
   * orders decisions, e.g. `approveNext(); rejectNext()` rejects the second prompt.
   */
  approveNext(count = 1): void {
    for (let i = 0; i < count; i++) this.decisions.push('approve');
  }

  waitForRequest(predicate: (request: Req) => boolean = () => true, timeout = 30_000): Promise<Req> {
    const seen = this.requests.find(predicate);
    if (seen) return Promise.resolve(seen);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`No matching wallet request within ${timeout}ms`));
      }, timeout);
      const listener = (request: Req) => {
        if (!predicate(request)) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(request);
      };
      this.listeners.add(listener);
    });
  }

  /**
   * Log the request and, for one a user would see (a signature, a
   * transaction), take the next queued decision. Silent requests such as
   * session handshakes never consume a decision.
   */
  protected receive(request: Req, { prompt }: { prompt: boolean }): Decision {
    this.requests.push(request);
    for (const listener of this.listeners) listener(request);
    return prompt ? (this.decisions.shift() ?? 'approve') : 'approve';
  }
}
