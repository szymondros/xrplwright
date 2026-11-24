import { Client, Wallet, dropsToXrp, type SubmittableTransaction, type TxResponse } from 'xrpl';

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

  constructor(readonly url: string) {}

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

  /** Fund (or create) an account from the network's faucet. Testnet/Devnet only. */
  async fund(wallet: Wallet, amountXrp?: string): Promise<{ balance: number }> {
    const client = await this.connect();
    const { balance } = await client.fundWallet(wallet, amountXrp ? { amount: amountXrp } : undefined);
    return { balance };
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

export const NETWORKS = {
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233',
  mainnet: 'wss://xrplcluster.com',
} as const;
