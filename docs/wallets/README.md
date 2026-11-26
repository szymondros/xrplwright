# Wallets

xrplwright stands in for a wallet by speaking its page protocol. The dapp keeps
the wallet's real SDK and cannot tell the difference.

| Wallet | `walletKind` | The dapp uses | Page |
| --- | --- | --- | --- |
| Crossmark | `'crossmark'` (default) | `@crossmarkio/sdk` | [crossmark.md](crossmark.md) |
| GemWallet | `'gemwallet'` | `@gemwallet/api` | [gemwallet.md](gemwallet.md) |

Planned: Xaman, Ledger, WalletConnect ([roadmap](../../ROADMAP.md)).

## Choosing the wallet

```ts
import { test, walletTest } from 'xrplwright';

test('...', async ({ wallet }) => {});         // Crossmark: wallet is a CrossmarkWallet

const gemTest = walletTest('gemwallet');
gemTest('...', async ({ wallet }) => {});      // wallet is a GemWallet
```

`walletTest(kind)` types `wallet` and `wallet.requests` for that wallet, so
`r.command` autocompletes the wallet's request names. `test.use({ walletKind })`
also switches the wallet of `test`, but keeps `wallet` typed as Crossmark: use
it for Playwright projects that run one suite per wallet, and `walletTest` otherwise.

## The same suite for every wallet

When the dapp offers several wallets, keep the scenarios wallet-agnostic and
put the wallet's steps in the page object:

```ts
// fixtures.ts
export const crossmarkTest = walletTest('crossmark').extend({ dapp: ... });
export const gemTest = walletTest('gemwallet').extend({ dapp: ... });
```

[examples/demo-dapp](../../examples/demo-dapp) connects and pays with both.

## What every wallet does the same way

- **Real keys**: signatures verify like the real wallet's, transactions are
  autofilled, signed and submitted to `xrplUrl` and awaited until validated.
- **Prompts**: what the real wallet shows a popup for is approved unless the
  test queued `wallet.rejectNext()`. Each page lists which requests are prompts.
- **Request log**: `wallet.requests` holds every request as `{ command, data }`,
  named as the wallet's protocol names them.
