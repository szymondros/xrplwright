# How it works

The browser in a test does not load a wallet extension. xrplwright installs a
**programmable wallet** in its place, which speaks the extension's page
protocol ([Crossmark, GemWallet](wallets/README.md)). The dapp keeps its wallet
SDK, unchanged, and cannot tell the difference.

```
 dapp code ── wallet SDK ── window.postMessage ────────┐
                                                        │  (in the browser)
 xrplwright in-page script  <───────────────────────────┘
        │  exposed binding
        ▼  (in Node, inside your test)
 CrossmarkWallet / GemWallet ── signs with a real key ── XrplLedger ── Testnet
```

The wallet:

- **signs for real** with `xrpl.js` and `ripple-keypairs`, so backends accept
  its login and challenge signatures;
- **submits for real**: it autofills, signs and submits transactions, and
  waits until they are validated;
- **approves every prompt** unless the test queues a rejection;
- **records every request**, so a test can assert on what the dapp asked it to sign.

Unlike tools that drive a real extension (walletwright, Synpress), there are no
popups to click, and nothing breaks when the wallet's UI changes. The trade-off
is that the wallet's own UI is never tested.
