import type { Page } from '@playwright/test';
import { sign as signHex } from 'ripple-keypairs';

import { engineResult } from '../../ledger/XrplLedger.js';
import { BaseWallet } from '../BaseWallet.js';
import { crossmarkInpage } from './inpage.js';
import { meta, type CrossmarkRequest, type CrossmarkResponseData } from './protocol.js';

const BINDING = '__xrplwrightCrossmark';

/** Commands the real extension shows a popup for. */
const PROMPTS = new Set(['sign', 'sign-and-submit', 'submit', 'bulk', 'bulk-sign', 'bulk-submit']);

/**
 * Stands in for the Crossmark browser extension. The dapp keeps using the real
 * @crossmarkio/sdk; this answers its messages and signs with a real key.
 *
 * Supported commands: `sign` (SignIn with or without a hex challenge, or any
 * transaction), `sign-and-submit`, `submit`.
 */
export class CrossmarkWallet extends BaseWallet<CrossmarkRequest> {
  readonly name = 'crossmark';

  async install(page: Page): Promise<void> {
    await page.exposeFunction(BINDING, (command: string, data: CrossmarkRequest['data']) =>
      this.handle({ command, data }),
    );
    await page.addInitScript(crossmarkInpage, BINDING);
  }

  private async handle(request: CrossmarkRequest): Promise<CrossmarkResponseData> {
    const prompt = PROMPTS.has(request.command);
    if (this.receive(request, { prompt }) === 'reject') return { meta: meta.rejected() };

    const { command, data } = request;
    switch (command) {
      case 'sign':
        return data?.tx?.TransactionType === 'SignIn' ? this.signIn(data.hex) : this.sign(data?.tx ?? {});
      case 'sign-and-submit':
        return this.submit((await this.ledger.sign(this.account, data?.tx ?? {})).tx_blob);
      case 'submit':
        return this.submit(data?.txblob ?? '');
      // Session handshake the SDK runs on detection.
      case 'network':
        return { network: this.network(), meta: meta.success() };
      case 'user':
        return { user: { id: this.address, username: 'xrplwright' }, meta: meta.success() };
      case 'address':
        return { address: this.address, meta: meta.success() };
      default:
        return { meta: meta.error(), error: `xrplwright: Crossmark command "${command}" is not implemented` };
    }
  }

  private network() {
    const { url, network: type } = this.ledger;
    return { label: type, type, protocol: 'xrpl', wss: url, rpc: url };
  }

  /** SignIn returns the account; with a hex challenge it also signs it (Crossmark's message signing). */
  private signIn(hex?: string): CrossmarkResponseData {
    return {
      address: this.address,
      publicKey: this.account.publicKey,
      ...(hex ? { signature: signHex(hex, this.account.privateKey) } : {}),
      meta: meta.success(),
    };
  }

  private async sign(tx: Record<string, unknown>): Promise<CrossmarkResponseData> {
    const signed = await this.ledger.sign(this.account, tx);
    return { txblob: signed.tx_blob, hash: signed.hash, meta: meta.success() };
  }

  private async submit(txBlob: string): Promise<CrossmarkResponseData> {
    const response = await this.ledger.submitAndWait(txBlob);
    return {
      resp: { result: response.result },
      meta: engineResult(response) === 'tesSUCCESS' ? meta.success() : meta.error(),
    };
  }
}
