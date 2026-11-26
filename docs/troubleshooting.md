# Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| A click on "Connect" does nothing | The page has not hydrated yet: use a retrying helper ([Writing tests](writing-tests.md#tips-from-real-dapps)) |
| The dapp says the wallet is not installed | You opened a page yourself without `wallet.install(page)` before navigating |
| Login hangs after the first prompt | The wallet returned a shape the SDK doesn't expect: log `wallet.requests` and open an issue |
| `XRPLFaucetError ... 502`, `NotConnectedError: Connection failed` | Testnet or its faucet is down. `fund()` already retried; run again later. Keep such tests tagged (e.g. `@testnet`) so CI can run them apart |
| `actNotFound`, unfunded account | A Testnet reset, or a fresh account without `fundWallet: true` |
| `tecUNFUNDED_PAYMENT`, `tecPATH_DRY` | Not enough XRP above the reserve, or no trust line / token balance |
| A user test lands on signup or KYC | The secret's account is not onboarded on this environment |
| A 2FA prompt appears | 2FA is on for the test user |
| Flaky logins with one shared account | Two runs at the same time ([Getting started](getting-started.md#running-tests)) |

When a test fails, open `npx playwright show-report`. Each failure has a trace:
every step, before-and-after screenshots, network and console.

## Limitations

- Crossmark and GemWallet for now. Xaman, Ledger and WalletConnect are
  planned, see the [roadmap](../ROADMAP.md).
- The wallet's own UI is not tested.
- No 2FA (TOTP) helper yet.
- No mid-test network or account switching yet, and no wallet events
  (GemWallet's `on('walletChanged', ...)` and similar).
