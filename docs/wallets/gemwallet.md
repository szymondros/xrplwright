# GemWallet

For dapps using [`@gemwallet/api`](https://www.npmjs.com/package/@gemwallet/api)
(tested with 3.8.0): `walletTest('gemwallet')`, or `walletKind: 'gemwallet'`.

```ts
import { expect, walletTest } from 'xrplwright';

const test = walletTest('gemwallet');

test('pays', async ({ page, wallet }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect GemWallet' }).click();
  // ...
  const payment = await wallet.waitForRequest((r) => r.command === 'REQUEST_SEND_PAYMENT/V3');
  expect(payment.data).toMatchObject({ amount: '1500000' });
});
```

## Requests

`wallet.requests` entries are `{ command, data }`: GemWallet's message type
and its payload (the API function's argument, in GemWallet's camelCase).

| API function | `command` | Prompt | The dapp gets |
| --- | --- | --- | --- |
| `isInstalled()` | `REQUEST_IS_INSTALLED/V3` | no | `{ isInstalled: true }` |
| `getNetwork()` | `REQUEST_GET_NETWORK/V3` | no | `chain: 'XRPL'`, `network` (`Mainnet`, `Testnet`, `Devnet`, `Custom`), `websocket` |
| `getAddress()` | `REQUEST_GET_ADDRESS/V3` | yes | `address` |
| `getPublicKey()` | `REQUEST_GET_PUBLIC_KEY/V3` | yes | `address`, `publicKey` |
| `getNFT(options?)` | `REQUEST_GET_NFT/V3` | yes | `account_nfts`, `marker` from the ledger |
| `signMessage(message, isHex?)` | `REQUEST_SIGN_MESSAGE/V3` | yes | `signedMessage`: the signature of the message's UTF-8 bytes (or of the hex itself with `isHex`) |
| `signTransaction({ transaction })` | `REQUEST_SIGN_TRANSACTION/V3` | yes | `signature`: the signed blob (autofilled, not submitted) |
| `submitTransaction({ transaction })` | `REQUEST_SUBMIT_TRANSACTION/V3` | yes | `hash` |
| `submitBulkTransactions({ transactions, onError? })` | `REQUEST_SUBMIT_BULK_TRANSACTIONS/V3` | yes | `transactions: [{ id, accepted, hash?, error? }]`, in order; `onError: 'abort'` (default) stops at the first failure |
| `sendPayment(...)` | `REQUEST_SEND_PAYMENT/V3` | yes | `hash` |
| `setTrustline(...)` | `REQUEST_SET_TRUSTLINE/V3` | yes | `hash` |
| `mintNFT(...)` | `REQUEST_MINT_NFT/V3` | yes | `hash`, `NFTokenID` |
| `createNFTOffer`, `cancelNFTOffer`, `acceptNFTOffer`, `burnNFT` | `REQUEST_..._NFT_OFFER/V3`, `REQUEST_BURN_NFT/V3` | yes | `hash` |
| `createOffer`, `cancelOffer`, `setAccount`, `setRegularKey` | `REQUEST_CREATE_OFFER/V3`, ... | yes | `hash` |

Every transaction is autofilled, signed with the account, submitted to
`xrplUrl` and awaited until validated. Flags given as an object
(`{ tfPartialPayment: true }`) are converted to a number.

**Rejection**: a queued `wallet.rejectNext()` makes the API function resolve
with `{ type: 'reject' }`, as when the user clicks Reject.

**Failure**: a transaction that does not end in `tesSUCCESS` rejects the API
function's promise with an error naming the result (e.g. `tecUNFUNDED_PAYMENT`),
as the extension does.

Not implemented: `setHook` (Xahau), wallet events (`on(...)`), and the
deprecated pre-V3 messages. They reject with an error naming the message.

## Notes

- `@gemwallet/api` refuses every call but `isInstalled()` until
  `window.gemWallet` is set; xrplwright sets it before the page's scripts run.
- The real extension asks once per site before sharing the address. Here
  `getAddress()` and `getPublicKey()` are prompts every time, so queue a
  decision for each call you want to reject.
