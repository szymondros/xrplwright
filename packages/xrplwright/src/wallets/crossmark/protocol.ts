/**
 * The slice of the Crossmark extension <-> @crossmarkio/sdk protocol that
 * dapps use (read from @crossmarkio/sdk 0.4.0):
 *
 * - Detection: the SDK polls for `window.xrpl.isCrossmark === true`.
 * - Request:   the SDK calls `window.postMessage({ app, type: 'request', id, command, data })`.
 * - Response:  the extension posts `{ type: 'response', response: { type: 'response', id, data } }`
 *              and the SDK resolves the pending request whose id matches.
 */
export type CrossmarkCommand = 'sign' | 'sign-and-submit' | 'submit' | (string & {});

export interface CrossmarkRequest {
  command: CrossmarkCommand;
  data: {
    tx?: Record<string, unknown> & { TransactionType?: string };
    /** Hex payload of a SignIn request: the login challenge. */
    hex?: string;
    txblob?: string;
    opts?: unknown;
  } | null;
}

export interface CrossmarkMeta {
  isSuccess: boolean;
  isRejected: boolean;
  isError: boolean;
}

export type CrossmarkResponseData = Record<string, unknown> & { meta: CrossmarkMeta };

export const meta = {
  success: (): CrossmarkMeta => ({ isSuccess: true, isRejected: false, isError: false }),
  rejected: (): CrossmarkMeta => ({ isSuccess: false, isRejected: true, isError: false }),
  error: (): CrossmarkMeta => ({ isSuccess: false, isRejected: false, isError: true }),
};
