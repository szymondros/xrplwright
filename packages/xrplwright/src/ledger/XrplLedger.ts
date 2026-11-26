import { Client, Wallet, dropsToXrp, type SubmittableTransaction, type TxResponse } from 'xrpl';

export type NetworkName = 'mainnet' | 'testnet' | 'devnet' | 'custom';

export interface LedgerOptions {
  /**
   * How many times `fund()` tries the faucet before giving up. Public faucets
   * have short outages (502, timeouts); later attempts wait longer (2 s, 4 s, 8 s, ...).
   * Default 5.
   */
  faucetAttempts?: number;
  /** Delay before the first retry, doubled after each one (at most 15 s). Default 2000. */
  faucetRetryDelayMs?: number;
}

export interface IssuedCurrency {
  /** 3-letter code or 40-char hex code, as on the ledger. */
  currency: string;
  issuer: string;
}

/**
 * One connection to an XRPL node, shared by wallets and test helpers.
 * Connects lazily, so tests that never touch the ledger never open a socket.
 */
export class XrplLedger {
  private client: Client | null = null;

  constructor(
    readonly url: string,
    private readonly options: LedgerOptions = {},
  ) {}

  /** Which network `url` points at, from its host name; `custom` for any other node. */
  get network(): NetworkName {
    const host = this.url.replace(/^\w+:\/\//, '').split(/[:/]/)[0] ?? '';
    if (host.includes('altnet') || host.includes('testnet')) return 'testnet';
    if (host.includes('devnet')) return 'devnet';
    if (MAINNET_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 'mainnet';
    return 'custom';
  }

  async connect(): Promise<Client> {
    if (!this.client) this.client = new Client(this.url);
    if (!this.client.isConnected()) await this.client.connect();
    return this.client;
  }

  async close(): Promise<void> {
    await this.client?.disconnect().catch(() => undefined);
    this.client = null;
  }

  /** Autofill (Account defaults to the wallet), sign and return the signed blob. */
  async sign(wallet: Wallet, tx: Record<string, unknown>): Promise<{ tx_blob: string; hash: string }> {
    const client = await this.connect();
    const prepared = await client.autofill({ Account: wallet.classicAddress, ...tx } as unknown as SubmittableTransaction);
    return wallet.sign(prepared);
  }

  /** Submit a signed blob and wait until it is validated. */
  async submitAndWait(txBlob: string): Promise<TxResponse> {
    const client = await this.connect();
    return client.submitAndWait(txBlob);
  }

  async signAndSubmit(wallet: Wallet, tx: Record<string, unknown>): Promise<TxResponse> {
    const { tx_blob } = await this.sign(wallet, tx);
    return this.submitAndWait(tx_blob);
  }

  /**
   * Fund (or create) an account from the network's faucet. Testnet/Devnet only.
   * Retries when the faucet or the node is briefly unavailable (see `LedgerOptions`).
   */
  async fund(wallet: Wallet, amountXrp?: string): Promise<{ balance: number }> {
    const attempts = Math.max(1, this.options.faucetAttempts ?? 5);
    let delay = this.options.faucetRetryDelayMs ?? 2_000;
    for (let attempt = 1; ; attempt++) {
      try {
        const client = await this.connect();
        const { balance } = await client.fundWallet(wallet, amountXrp ? { amount: amountXrp } : undefined);
        return { balance };
      } catch (error) {
        if (attempt >= attempts || !isTransient(error)) {
          throw attempt > 1 ? withAttempts(error, attempt) : error;
        }
        if (isConnectionError(error)) await this.close(); // reconnect on the next attempt
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 15_000);
      }
    }
  }

  /** XRP balance, or 0 for an account that does not exist yet. */
  async xrpBalance(address: string): Promise<number> {
    const client = await this.connect();
    try {
      const { result } = await client.request({ command: 'account_info', account: address, ledger_index: 'validated' });
      return Number(dropsToXrp(result.account_data.Balance));
    } catch (error) {
      if (String(error).includes('actNotFound')) return 0;
      throw error;
    }
  }

  /** Balance of an issued currency held through a trust line, or 0 without one. */
  async tokenBalance(address: string, token: IssuedCurrency): Promise<number> {
    const client = await this.connect();
    const { result } = await client.request({
      command: 'account_lines',
      account: address,
      peer: token.issuer,
      ledger_index: 'validated',
    });
    const line = result.lines.find((l) => l.currency === token.currency);
    return line ? Number(line.balance) : 0;
  }

  /** Open a trust line so the wallet can hold the token. */
  async setTrustline(wallet: Wallet, token: IssuedCurrency, limit = '1000000000'): Promise<TxResponse> {
    return this.signAndSubmit(wallet, {
      TransactionType: 'TrustSet',
      LimitAmount: { currency: token.currency, issuer: token.issuer, value: limit },
    });
  }

  /** Polls until `predicate` holds for the XRP balance; returns the last balance. */
  async waitForXrpBalance(address: string, predicate: (balance: number) => boolean, timeout = 60_000): Promise<number> {
    const deadline = Date.now() + timeout;
    let balance = await this.xrpBalance(address);
    while (!predicate(balance)) {
      if (Date.now() > deadline) throw new Error(`XRP balance of ${address} still ${balance} after ${timeout}ms`);
      await new Promise((r) => setTimeout(r, 2_000));
      balance = await this.xrpBalance(address);
    }
    return balance;
  }
}

const CONNECTION_ERRORS = new Set(['NotConnectedError', 'ConnectionError', 'DisconnectedError', 'TimeoutError']);

function isConnectionError(error: unknown): boolean {
  return error instanceof Error && CONNECTION_ERRORS.has(error.name);
}

/**
 * Worth another try: the faucet answered 5xx or 429, the network failed, the
 * node dropped the connection, or the funded account did not show up in time.
 * Not: other 4xx answers, or a network without a faucet.
 */
function isTransient(error: unknown): boolean {
  if (isConnectionError(error)) return true;
  const message = error instanceof Error ? error.message : String(error);
  const status = /"statusCode":\s*(\d{3})/.exec(message)?.[1];
  if (status) return status.startsWith('5') || status === '429';
  return /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|Unable to fund address with faucet after waiting/i.test(
    message,
  );
}

function withAttempts(error: unknown, attempts: number): unknown {
  if (error instanceof Error) error.message = `${error.message} (faucet: gave up after ${attempts} attempts)`;
  return error;
}

/** The engine result of a validated transaction, e.g. `tesSUCCESS`. */
export function engineResult(response: TxResponse): string | undefined {
  const meta = response.result.meta;
  return typeof meta === 'object' && meta !== null ? meta.TransactionResult : undefined;
}

const MAINNET_HOSTS = ['xrplcluster.com', 's1.ripple.com', 's2.ripple.com', 'xrpl.ws'];

export const NETWORKS = {
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233',
  mainnet: 'wss://xrplcluster.com',
} as const;
