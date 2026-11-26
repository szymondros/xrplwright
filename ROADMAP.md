# Roadmap

xrplwright aims to be the default way to end-to-end test XRP Ledger dapps:
every popular wallet emulated, real signatures, real ledger. Priorities follow
what most XRPL dapps need, not one application.

Versions are `0.x`: a minor version may change the API, but a renamed or
removed API keeps working for one minor version as `@deprecated`, and
`CHANGELOG.md` gets a "Migration" note.

| Version | Theme | Contents | Status |
| --- | --- | --- | --- |
| 0.1.0 | First release | Crossmark wallet, ledger helpers, CLI, `npm init xrplwright` | released |
| 0.2.0 | Second wallet | Wallet registry (the `wallet` fixture's type follows `walletKind`), `wallet.account` (`wallet.wallet` deprecated), **GemWallet**, docs split into pages | released |
| 0.3.0 | Xaman | Xaman for dapps using the browser `xumm` SDK (sign-in, payloads), by intercepting the Xaman API. Payloads created by a dapp's backend are out of scope | planned |
| 0.4.0 | Ledger | Ledger hardware wallet through an emulated WebHID device speaking the XRP app's APDUs | planned |
| 0.5.0 | WalletConnect | A real WalletConnect wallet client in Node answering the dapp's session | planned |
| later | Ledger tooling | Local `rippled` in standalone mode (no faucet, fast, deterministic, immune to Testnet outages), helpers for tokens, AMM, NFTs, MPTs, escrow; `expect` matchers for transactions | ideas |
| later | More wallets | Seen in real dapps' pickers: MetaMask (XRPL Snap), D'CENT, Bitget Wallet, Joey | ideas |
| later | Tooling | `npm init xrplwright` asks which wallet the dapp uses; tests pass on Node 24 (Playwright's loader fails on `xrpl` there) | ideas |
| later | App flows | Small optional helpers: TOTP codes for 2FA, an email `inbox` with adapters (Mailpit, Mailosaur, ...) | ideas |

## How a feature lands

1. Implement in this repo with tests (`packages/xrplwright/tests`) and, for a
   wallet, a small dapp in `examples/` that uses the wallet's real SDK.
2. Check it against a real dapp's e2e suite before the release.
3. Release: see `CONTRIBUTING.md`.
