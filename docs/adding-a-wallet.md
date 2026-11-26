# Adding a wallet

A wallet is one class plus one in-page script:

1. `src/wallets/<name>/inpage.ts`: a self-contained function, run with
   `page.addInitScript`. It makes the wallet detectable the way its SDK
   checks (a `window` property, an announce event, ...) and forwards each
   request to Node through an exposed binding.
2. `src/wallets/<name>/<Name>Wallet.ts`: `extends BaseWallet`, sets `name`
   and implements `install(page)` and the request handler. Call
   `this.receive(request, { prompt })` first, then sign with `this.account`
   and `this.ledger`.
3. `src/wallets/<name>/protocol.ts`: the request and response types, and a
   comment describing the protocol as read from the SDK.
4. Register it in `WALLETS` in `src/wallets/registry.ts` (this makes it a
   `walletKind` and a `walletTest()` argument) and export it from `src/index.ts`.
5. Add a test that drives the wallet's real SDK in the demo page
   (`tests/demo-dapp.ts`), like `tests/gemwallet.spec.ts`, and a page in
   `docs/wallets/`.

`src/wallets/gemwallet` is the smallest complete example.

Read the protocol from the wallet's SDK source in `node_modules`, and check
which response fields the SDK reads, not only the ones the dapp reads. The
Crossmark SDK, for example, needs the original request echoed back in each
response and a handshake (`network`, `user`, `address`). Without them it
hangs silently. Both are documented in `src/wallets/crossmark/protocol.ts`.
