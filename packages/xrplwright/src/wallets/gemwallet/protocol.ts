/**
 * The GemWallet extension <-> @gemwallet/api protocol (read from
 * @gemwallet/api 3.8.0 and the extension's content script):
 *
 * - Detection: `isInstalled()` posts `REQUEST_IS_INSTALLED/V3` and waits for
 *   `{ isInstalled: true }`. Every other call first requires `window.gemWallet`
 *   to be set (older API versions also sent `REQUEST_CONNECTION`).
 * - Request:   `window.postMessage({ source: 'GEM_WALLET_MSG_REQUEST', messageId, app, type, payload })`.
 * - Response:  `{ source: 'GEM_WALLET_MSG_RESPONSE', messagedId, result?, error? }`. Note the
 *              spelling `messagedId`. No `result` and no `error` means the user rejected.
 */
export type GemWalletCommand =
  | 'REQUEST_IS_INSTALLED/V3'
  | 'REQUEST_CONNECTION'
  | 'REQUEST_GET_ADDRESS/V3'
  | 'REQUEST_GET_PUBLIC_KEY/V3'
  | 'REQUEST_GET_NETWORK/V3'
  | 'REQUEST_GET_NFT/V3'
  | 'REQUEST_SIGN_MESSAGE/V3'
  | 'REQUEST_SEND_PAYMENT/V3'
  | 'REQUEST_SET_TRUSTLINE/V3'
  | 'REQUEST_MINT_NFT/V3'
  | 'REQUEST_CREATE_NFT_OFFER/V3'
  | 'REQUEST_CANCEL_NFT_OFFER/V3'
  | 'REQUEST_ACCEPT_NFT_OFFER/V3'
  | 'REQUEST_BURN_NFT/V3'
  | 'REQUEST_SET_ACCOUNT/V3'
  | 'REQUEST_SET_REGULAR_KEY/V3'
  | 'REQUEST_CREATE_OFFER/V3'
  | 'REQUEST_CANCEL_OFFER/V3'
  | 'REQUEST_SIGN_TRANSACTION/V3'
  | 'REQUEST_SUBMIT_TRANSACTION/V3'
  | 'REQUEST_SUBMIT_BULK_TRANSACTIONS/V3'
  | (string & {});

/** The `payload` of a request: its fields depend on the command (see @gemwallet/api). */
export type GemWalletPayload = Record<string, any> | null;

export interface GemWalletRequest {
  command: GemWalletCommand;
  data: GemWalletPayload;
}

/** What the driver answers; the in-page script adds `source` and `messagedId`. */
export interface GemWalletResponse {
  result?: unknown;
  error?: { name: string; message: string; stack?: string };
  isInstalled?: boolean;
  isConnected?: boolean;
}

/** GemWallet's names for networks, as `getNetwork()` returns them. */
export const NETWORK_NAMES = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  devnet: 'Devnet',
  custom: 'Custom',
} as const;
