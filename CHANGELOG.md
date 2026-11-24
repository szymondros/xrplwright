# Changelog

All notable changes to `xrplwright` and `create-xrplwright`. The project follows
[semantic versioning](https://semver.org); while it is `0.x`, minor versions may
change the API.

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
