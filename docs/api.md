# API reference

## Fixtures and options

`import { test, walletTest } from 'xrplwright'`

| Name | Kind | Default | Description |
| --- | --- | --- | --- |
| `wallet` | fixture (auto) | | The wallet, installed into every `page` before navigation |
| `ledger` | fixture | | An `XrplLedger` that connects lazily to `xrplUrl` |
| `walletKind` | option | `'crossmark'` | Which wallet `test` installs (`walletTest(kind)` ignores it) |
| `walletSeed` | option | `undefined` | Account secret (seed, hex private key or secret numbers); a fresh account when unset |
| `fundWallet` | option | `false` | Fund a fresh account from the faucet before the test |
| `xrplUrl` | option | Testnet | Node used to autofill and submit |

Set options in `playwright.config.ts` (`use`), per file or group
(`test.use({...})`), or in a derived test (`test.extend({...})`). Type the
config with `defineConfig<XrplOptions>`.

`walletTest(kind)` returns a `test` whose `wallet` is that kind's driver
(`walletTest('gemwallet')` → `GemWallet`). Kinds: `'crossmark'`, `'gemwallet'`.

## `wallet`

Every wallet driver has these members. What each wallet answers is on its
page: [Crossmark](wallets/crossmark.md), [GemWallet](wallets/gemwallet.md).

| Member | Description |
| --- | --- |
| `name` | The kind: `'crossmark'`, `'gemwallet'` |
| `address` | Classic address (`r...`) |
| `account` | The underlying `xrpl.Wallet` (keys) |
| `wallet` | Deprecated alias of `account`, removed in 0.3.0 |
| `requests` | Every request received: `{ command, data }`, as the wallet's protocol names them |
| `rejectNext(count = 1)` / `approveNext(count = 1)` | Queue decisions for the next prompts |
| `waitForRequest(predicate?, timeout = 30000)` | The first request (past or future) that matches |
| `install(page)` | Done by the fixture; for pages you open yourself |

## `ledger` (`XrplLedger`)

`new XrplLedger(url, { faucetAttempts = 5, faucetRetryDelayMs = 2000 })` for a
ledger of your own; the fixture uses the defaults.

| Method | Description |
| --- | --- |
| `fund(wallet, amountXrp?)` | Fund or create an account from the faucet (Testnet, Devnet); retries a briefly unavailable faucet |
| `xrpBalance(address)` | XRP balance; `0` for an account that doesn't exist |
| `tokenBalance(address, { currency, issuer })` | Issued-token balance; `0` without a trust line |
| `setTrustline(wallet, { currency, issuer }, limit?)` | Open a trust line |
| `signAndSubmit(wallet, tx)` | Autofill, sign, submit, wait for validation |
| `sign(wallet, tx)` / `submitAndWait(blob)` | The two halves |
| `waitForXrpBalance(address, predicate, timeout?)` | Poll until the balance satisfies `predicate` |
| `network` | `'mainnet'`, `'testnet'`, `'devnet'` or `'custom'`, from the URL |
| `url` | The node's URL |
| `connect()` | The raw `xrpl.Client` |

## Other exports

- `NETWORKS`: `testnet`, `devnet`, `mainnet` URLs
- `walletFromSecret(secret)`: an `xrpl.Wallet` from a seed, hex private key or secret numbers
- `engineResult(txResponse)`: the result code of a validated transaction (`tesSUCCESS`, ...)
- `loadDotenv(dir)`: load `.env` into `process.env` in a Playwright config
- `CrossmarkWallet`, `GemWallet`, `createWallet(kind, options)`, `WALLETS`: the drivers, to use without the fixtures
- `BaseWallet` and the `WalletDriver` type: for [new wallets](adding-a-wallet.md)

## CLI

```bash
npx xrplwright init [dir] [options]   # set up e2e tests (see Getting started)
npx xrplwright new-wallet [wsUrl]     # create and fund a Testnet account, print its seed
npx xrplwright address <secret>       # address and public key of a secret
npx xrplwright fund <secret> [wsUrl]  # top up from the faucet
```
