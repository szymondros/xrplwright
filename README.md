# xrplwright

Playwright end-to-end testing for XRP Ledger dapps.

xrplwright puts an XRPL wallet into the browser of your Playwright tests. The
dapp connects to it through its usual wallet SDK; the wallet signs with a real
key and submits to a real network (XRPL Testnet by default).

| Wallet | The dapp uses | |
| --- | --- | --- |
| Crossmark | `@crossmarkio/sdk` | [docs](docs/wallets/crossmark.md) |
| GemWallet | `@gemwallet/api` | [docs](docs/wallets/gemwallet.md) |

Xaman, Ledger and WalletConnect are next: see the [roadmap](ROADMAP.md).

- **Real signatures**: login challenges and transactions verify like the real wallet's
- **Real transactions**: autofilled, signed, submitted and awaited until validated
- **Approve or reject** each wallet prompt from the test
- **Request log**: assert on exactly what the dapp asked the wallet to sign
- **Accounts**: a fresh one per test (optionally funded from the faucet), or
  your own from a seed, a hex private key or secret numbers
- **Ledger helpers**: fund accounts, read XRP and token balances, open trust
  lines, submit transactions
- **Headless**: runs in CI with nothing but Playwright and Chromium

## Install

```bash
npm init xrplwright my-e2e          # a new e2e project in my-e2e/
npm init xrplwright -- --here       # or e2e tests inside the current project
```

Or by hand: `npm i -D @playwright/test xrplwright && npx playwright install chromium`.
Details in [Getting started](docs/getting-started.md).

## Usage

```ts
import { test, expect } from 'xrplwright'; // Crossmark; walletTest('gemwallet') for GemWallet

test.use({ fundWallet: true }); // fresh Testnet account with XRP from the faucet

test('sends a payment', async ({ page, wallet, ledger }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Crossmark' }).click();
  await expect(page.getByText(wallet.address)).toBeVisible();

  await page.getByLabel('Destination').fill('rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe');
  await page.getByLabel('Amount').fill('10');
  await page.getByRole('button', { name: 'Send' }).click();

  const request = await wallet.waitForRequest((r) => r.command === 'sign-and-submit');
  expect(request.data?.tx).toMatchObject({ TransactionType: 'Payment', Amount: '10000000' });
  await expect(page.getByText('Payment confirmed')).toBeVisible();
});

test('rejecting the payment shows an error', async ({ page, wallet }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Crossmark' }).click();

  wallet.rejectNext();
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Payment rejected')).toBeVisible();
});
```

| Fixture | |
| --- | --- |
| `wallet` | The wallet, installed into every page before it loads: `address`, `account`, `rejectNext()`, `approveNext()`, `waitForRequest()`, `requests` |
| `ledger` | The XRPL node: `fund()`, `xrpBalance()`, `tokenBalance()`, `setTrustline()`, `signAndSubmit()` |

| Option | Default | |
| --- | --- | --- |
| `walletSeed` | fresh account | Account secret: seed (`s...`), hex private key or secret numbers |
| `fundWallet` | `false` | Fund a fresh account from the faucet before the test |
| `xrplUrl` | XRPL Testnet | Node the wallet uses to autofill and submit |
| `walletKind` | `'crossmark'` | Which wallet `test` installs |

To test flows behind sign-up or KYC, onboard a dedicated Testnet account once
(`npx xrplwright new-wallet` prints a funded seed) and pass its secret as
`walletSeed`: see [Test accounts](docs/test-accounts.md).

## CLI

```bash
npx xrplwright init [dir]            # same as npm init xrplwright
npx xrplwright new-wallet            # create and fund a Testnet account, print its seed
npx xrplwright address <secret>      # address of a seed, hex private key or secret numbers
npx xrplwright fund <secret>         # top up an account from the faucet
```

## Documentation

- [Documentation](docs/README.md): getting started, writing tests, wallets,
  test accounts, API reference, CI, troubleshooting
- [Example](examples/demo-dapp): a dapp offering Crossmark and GemWallet, and
  its e2e suite (connect, challenge signature, rejections, payment on Testnet)
- [Roadmap](ROADMAP.md) and [changelog](CHANGELOG.md)

## License

[MIT](LICENSE)
