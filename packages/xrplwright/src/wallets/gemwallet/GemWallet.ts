import type { Page } from '@playwright/test';
import { sign as signHex } from 'ripple-keypairs';
import { convertTxFlagsToNumber, getNFTokenID, type Transaction, type TransactionMetadata } from 'xrpl';

import { engineResult } from '../../ledger/XrplLedger.js';
import { BaseWallet } from '../BaseWallet.js';
import { gemWalletInpage } from './inpage.js';
import { NETWORK_NAMES, type GemWalletPayload, type GemWalletRequest, type GemWalletResponse } from './protocol.js';

const BINDING = '__xrplwrightGemWallet';

/** Commands answered without a popup: they never consume an approve/reject decision. */
const SILENT = new Set(['REQUEST_IS_INSTALLED/V3', 'REQUEST_CONNECTION', 'REQUEST_GET_NETWORK/V3']);

type Tx = Record<string, unknown>;

/** Fields every transaction request may carry: GemWallet's camelCase name -> the ledger's. */
const COMMON_FIELDS = {
  fee: 'Fee',
  sequence: 'Sequence',
  accountTxnID: 'AccountTxnID',
  lastLedgerSequence: 'LastLedgerSequence',
  networkID: 'NetworkID',
  sourceTag: 'SourceTag',
  ticketSequence: 'TicketSequence',
} as const;

/** The transaction each typed request builds, and how its fields map. */
const TRANSACTIONS: Record<string, { type: string; fields: Record<string, string> }> = {
  'REQUEST_SEND_PAYMENT/V3': {
    type: 'Payment',
    fields: {
      amount: 'Amount', destination: 'Destination', destinationTag: 'DestinationTag', invoiceID: 'InvoiceID',
      paths: 'Paths', sendMax: 'SendMax', deliverMin: 'DeliverMin', flags: 'Flags',
    },
  },
  'REQUEST_SET_TRUSTLINE/V3': {
    type: 'TrustSet',
    fields: { limitAmount: 'LimitAmount', qualityIn: 'QualityIn', qualityOut: 'QualityOut', flags: 'Flags' },
  },
  'REQUEST_MINT_NFT/V3': {
    type: 'NFTokenMint',
    fields: { flags: 'Flags', issuer: 'Issuer', NFTokenTaxon: 'NFTokenTaxon', transferFee: 'TransferFee', URI: 'URI' },
  },
  'REQUEST_CREATE_NFT_OFFER/V3': {
    type: 'NFTokenCreateOffer',
    fields: {
      NFTokenID: 'NFTokenID', amount: 'Amount', owner: 'Owner', expiration: 'Expiration',
      destination: 'Destination', flags: 'Flags',
    },
  },
  'REQUEST_CANCEL_NFT_OFFER/V3': { type: 'NFTokenCancelOffer', fields: { NFTokenOffers: 'NFTokenOffers' } },
  'REQUEST_ACCEPT_NFT_OFFER/V3': {
    type: 'NFTokenAcceptOffer',
    fields: { NFTokenSellOffer: 'NFTokenSellOffer', NFTokenBuyOffer: 'NFTokenBuyOffer', NFTokenBrokerFee: 'NFTokenBrokerFee' },
  },
  'REQUEST_BURN_NFT/V3': { type: 'NFTokenBurn', fields: { NFTokenID: 'NFTokenID', owner: 'Owner' } },
  'REQUEST_SET_ACCOUNT/V3': {
    type: 'AccountSet',
    fields: {
      flags: 'Flags', clearFlag: 'ClearFlag', domain: 'Domain', emailHash: 'EmailHash', messageKey: 'MessageKey',
      NFTokenMinter: 'NFTokenMinter', setFlag: 'SetFlag', transferRate: 'TransferRate', tickSize: 'TickSize',
    },
  },
  'REQUEST_SET_REGULAR_KEY/V3': { type: 'SetRegularKey', fields: { regularKey: 'RegularKey' } },
  'REQUEST_CREATE_OFFER/V3': {
    type: 'OfferCreate',
    fields: {
      flags: 'Flags', expiration: 'Expiration', offerSequence: 'OfferSequence', takerGets: 'TakerGets', takerPays: 'TakerPays',
    },
  },
  'REQUEST_CANCEL_OFFER/V3': { type: 'OfferCancel', fields: { offerSequence: 'OfferSequence' } },
};

/**
 * Stands in for the GemWallet browser extension. The dapp keeps using the
 * real @gemwallet/api; this answers its messages and signs with a real key.
 *
 * Supported: `isInstalled`, `isConnected`, `getAddress`, `getPublicKey`,
 * `getNetwork`, `getNFT`, `signMessage`, `signTransaction`, `submitTransaction`,
 * `submitBulkTransactions`, and the typed transactions (`sendPayment`,
 * `setTrustline`, NFTs, offers, `setAccount`, `setRegularKey`). Not supported:
 * `setHook` (Xahau) and the deprecated pre-V3 calls.
 *
 * Requests are logged with GemWallet's message type as `command`
 * (e.g. `REQUEST_SEND_PAYMENT/V3`) and its payload as `data`.
 */
export class GemWallet extends BaseWallet<GemWalletRequest> {
  readonly name = 'gemwallet';

  async install(page: Page): Promise<void> {
    await page.exposeFunction(BINDING, (command: string, data: GemWalletPayload) => this.handle({ command, data }));
    await page.addInitScript(gemWalletInpage, BINDING);
  }

  private async handle(request: GemWalletRequest): Promise<GemWalletResponse> {
    // A rejection is a response without `result` and without `error`.
    if (this.receive(request, { prompt: !SILENT.has(request.command) }) === 'reject') return {};
    try {
      return await this.answer(request);
    } catch (error) {
      const e = error instanceof Error ? error : new Error(String(error));
      return { error: { name: e.name, message: e.message, stack: e.stack } };
    }
  }

  private async answer({ command, data }: GemWalletRequest): Promise<GemWalletResponse> {
    const payload = data ?? {};
    switch (command) {
      case 'REQUEST_IS_INSTALLED/V3':
        return { isInstalled: true };
      case 'REQUEST_CONNECTION':
        return { isConnected: true };
      case 'REQUEST_GET_ADDRESS/V3':
        return { result: { address: this.address } };
      case 'REQUEST_GET_PUBLIC_KEY/V3':
        return { result: { address: this.address, publicKey: this.account.publicKey } };
      case 'REQUEST_GET_NETWORK/V3':
        return { result: { chain: 'XRPL', network: NETWORK_NAMES[this.ledger.network], websocket: this.ledger.url } };
      case 'REQUEST_GET_NFT/V3':
        return { result: await this.nfts(payload) };
      case 'REQUEST_SIGN_MESSAGE/V3': {
        // As the extension does: the UTF-8 bytes of the message, or the message itself when it is hex.
        const message = String(payload.message ?? '');
        const hex = payload.isHex ? message : Buffer.from(message, 'utf8').toString('hex');
        return { result: { signedMessage: signHex(hex, this.account.privateKey) } };
      }
      case 'REQUEST_SIGN_TRANSACTION/V3': {
        const { tx_blob } = await this.ledger.sign(this.account, numericFlags(payload.transaction ?? {}));
        return { result: { signature: tx_blob } };
      }
      case 'REQUEST_SUBMIT_TRANSACTION/V3':
        return { result: await this.submit(payload.transaction ?? {}) };
      case 'REQUEST_SUBMIT_BULK_TRANSACTIONS/V3':
        return { result: { transactions: await this.submitBulk(payload) } };
      case 'REQUEST_MINT_NFT/V3': {
        const { hash, meta } = await this.submitWithMeta(toTransaction(command, payload));
        return { result: { hash, NFTokenID: getNFTokenID(meta) } };
      }
      default:
        if (command in TRANSACTIONS) return { result: await this.submit(toTransaction(command, payload)) };
        throw new Error(`xrplwright: GemWallet request "${command}" is not implemented`);
    }
  }

  /** Autofill, sign, submit, wait for validation; throw unless it succeeded (as the extension does). */
  private async submitWithMeta(tx: Tx): Promise<{ hash: string; meta: TransactionMetadata }> {
    const response = await this.ledger.signAndSubmit(this.account, numericFlags(tx));
    const result = engineResult(response);
    if (result !== 'tesSUCCESS') throw new Error(`Transaction failed: ${result ?? 'unknown result'}`);
    return { hash: response.result.hash, meta: response.result.meta as TransactionMetadata };
  }

  private async submit(tx: Tx): Promise<{ hash: string }> {
    return { hash: (await this.submitWithMeta(tx)).hash };
  }

  /**
   * `submitBulkTransactions`: in order; with `onError: 'abort'` (the default)
   * the first failure stops the rest. Every result carries the transaction's `ID`.
   */
  private async submitBulk(payload: Record<string, any>) {
    const transactions: Tx[] = Object.values(payload.transactions ?? {});
    const abort = (payload.onError ?? 'abort') === 'abort';
    const results: { id?: string; accepted: boolean; hash?: string; error?: string }[] = [];
    for (const { ID, ...tx } of transactions) {
      const id = ID as string | undefined;
      try {
        results.push({ id, accepted: true, ...(await this.submit(tx)) });
      } catch (error) {
        results.push({ id, accepted: false, error: error instanceof Error ? error.message : String(error) });
        if (abort) break;
      }
    }
    return results;
  }

  private async nfts(payload: Record<string, any>) {
    const client = await this.ledger.connect();
    const { result } = await client.request({
      command: 'account_nfts',
      account: this.address,
      ledger_index: 'validated',
      ...(payload.limit ? { limit: payload.limit } : {}),
      ...(payload.marker ? { marker: payload.marker } : {}),
    });
    return { account_nfts: result.account_nfts, ...(result.marker ? { marker: result.marker } : {}) };
  }
}

/** GemWallet accepts flags as an object (`{ tfPartialPayment: true }`); the ledger needs a number. */
function numericFlags(tx: Tx): Tx {
  return typeof tx.Flags === 'object' ? { ...tx, Flags: convertTxFlagsToNumber(tx as unknown as Transaction) } : tx;
}

/** Build the ledger transaction a typed request (`sendPayment`, `setTrustline`, ...) stands for. */
function toTransaction(command: string, payload: Record<string, any>): Tx {
  const spec = TRANSACTIONS[command];
  if (!spec) throw new Error(`xrplwright: no transaction for ${command}`);
  const tx: Tx = { TransactionType: spec.type };
  for (const [from, to] of Object.entries({ ...COMMON_FIELDS, ...spec.fields })) {
    if (payload[from] !== undefined) tx[to] = payload[from];
  }
  if (Array.isArray(payload.memos)) {
    tx.Memos = payload.memos.map(({ memo }: { memo: Record<string, string | undefined> }) => ({
      Memo: {
        ...(memo.memoType !== undefined ? { MemoType: memo.memoType } : {}),
        ...(memo.memoData !== undefined ? { MemoData: memo.memoData } : {}),
        ...(memo.memoFormat !== undefined ? { MemoFormat: memo.memoFormat } : {}),
      },
    }));
  }
  return tx;
}
