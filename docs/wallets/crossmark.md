# Crossmark

For dapps using [`@crossmarkio/sdk`](https://www.npmjs.com/package/@crossmarkio/sdk)
(tested with 0.4.0). The default wallet of `test`; also `walletTest('crossmark')`.

```ts
import { expect, test } from 'xrplwright';

test('signs in', async ({ page, wallet }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Crossmark' }).click();

  const signIn = await wallet.waitForRequest((r) => r.command === 'sign' && !!r.data?.hex);
  expect(Buffer.from(signIn.data!.hex!, 'hex').toString('utf8')).toContain(wallet.address);
});
```

## Requests

`wallet.requests` entries are `{ command, data }` as the SDK sends them.

| Command | Prompt | The dapp gets |
| --- | --- | --- |
| `sign` with `TransactionType: 'SignIn'` | yes | `address`, `publicKey`; with `hex`, also the `signature` of that hex |
| `sign` with any other transaction | yes | `txblob`, `hash` (autofilled and signed, not submitted) |
| `sign-and-submit` | yes | `resp.result` of the validated transaction (`hash`, `meta`, ...) |
| `submit` | yes | The same, for a blob signed earlier |
| `network`, `user`, `address` | no | Session handshake the SDK runs on detection |

`meta.isSuccess` is `true` only for `tesSUCCESS`. A rejection returns
`meta.isRejected: true`. `network` reports `type` from `xrplUrl`
(`mainnet`, `testnet`, `devnet`, or `custom` for any other node).

Not implemented: `bulk`, `bulk-sign`, `bulk-submit` (they return `meta.isError`).

## Notes

- The SDK detects the wallet by polling `window.xrpl.isCrossmark`, which
  xrplwright sets before the page's scripts run.
- Crossmark 0.2.19 cannot sign with accounts imported from a seed
  ([crossmarkio/crosskit#1](https://github.com/crossmarkio/crosskit/issues/1)),
  which matters only when you onboard a test user through the real extension.
