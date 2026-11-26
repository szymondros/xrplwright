# Changelog

All notable changes to `xrplwright` and `create-xrplwright`. The project follows
[semantic versioning](https://semver.org); while it is `0.x`, minor versions may
change the API.

## Unreleased (0.2.0)

### Added

- **GemWallet**: dapps using `@gemwallet/api` (3.8.0) connect, sign messages,
  sign and submit transactions (payments, trust lines, NFTs, offers, account
  settings, bulk submission). See `docs/wallets/gemwallet.md`.
- `walletTest(kind)`: a `test` whose `wallet` is that wallet, typed for it:
  `walletTest('gemwallet')`.
- `wallet.account` (the `xrpl.Wallet`) and `wallet.name` on every wallet.
- `ledger.network` (`mainnet`, `testnet`, `devnet`, `custom`) and `engineResult(response)`.
- `createWallet(kind, options)` and `WALLETS`, to use a wallet driver without the fixtures.
- Docs split into pages under `docs/` (index: `docs/README.md`), one page per
  wallet, and a `ROADMAP.md`. The npm README now links to the docs of the
  published version.

### Changed

- Crossmark reports `type: 'mainnet'` for mainnet nodes (it said `custom`).

### Deprecated

- `wallet.wallet`: use `wallet.account`. The alias is removed in 0.3.0.

### Migration

Nothing breaks. Replace `wallet.wallet` with `wallet.account` before 0.3.0.

## 0.1.0

First release.

- Crossmark wallet emulation: detection, session handshake, `SignIn` with and
  without a hex challenge, `sign`, `sign-and-submit`, `submit`.
- Wallet control: `rejectNext()`, `approveNext()`, `waitForRequest()`, `requests`.
- Accounts from a family seed, a hex private key or secret numbers; fresh
  accounts funded from the faucet (`fundWallet`).
- `XrplLedger`: `fund`, `xrpBalance`, `tokenBalance`, `setTrustline`,
  `signAndSubmit`, `waitForXrpBalance`.
- `loadDotenv()` for Playwright configs.
- CLI: `init`, `new-wallet`, `address`, `fund`.
- `npm init xrplwright`: a separate e2e project, or e2e tests inside an existing one.
