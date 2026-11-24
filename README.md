# xrplwright

Playwright end-to-end testing for XRP Ledger dapps.

xrplwright adds an XRPL wallet to the browser in your Playwright tests. The
dapp connects to it through its usual wallet SDK. The wallet signs with a real
key and submits transactions to a real network (XRPL Testnet by default).

- **Crossmark wallet** for dapps using `@crossmarkio/sdk`: connect, message
  signing, `sign`, `sign-and-submit`, `submit`
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
npm init xrplwright my-e2e
```

This creates `my-e2e/` with a Playwright config, fixtures, an example test and
`.env.example`, and installs `@playwright/test`, `xrplwright` and Chromium.

To add the tests to an existing project instead (in `./e2e`):

```bash
npm init xrplwright -- --here
```

| Option | |
| --- | --- |
| `--base-url <url>` | URL of the dapp under test (default `http://localhost:3000`) |
| `--ci gitlab\|github` | add a scheduled CI job |
| `--tests-dir <name>` | folder for the tests with `--here` (default `e2e`) |
| `--no-install` | only write the files |
| `-y` | use the defaults without asking |

To set it up by hand:

```bash
npm i -D @playwright/test xrplwright
npx playwright install chromium
```

## Usage

```ts
import { test, expect } from 'xrplwright';

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

### Fixtures

| Fixture | |
| --- | --- |
| `wallet` | The wallet, installed into every page before it loads |
| `wallet.address` | The account's classic address |
| `wallet.rejectNext(n?)` / `wallet.approveNext(n?)` | Decide the next prompts (default: approve) |
| `wallet.waitForRequest(predicate?)` | Wait for a request the dapp sent to the wallet |
| `wallet.requests` | Every request so far, as `{ command, data }` |
| `ledger.fund(wallet)` | Fund an account from the Testnet/Devnet faucet |
| `ledger.xrpBalance(address)` | XRP balance |
| `ledger.tokenBalance(address, { currency, issuer })` | Issued-token balance |
| `ledger.setTrustline(wallet, { currency, issuer })` | Open a trust line |
| `ledger.signAndSubmit(wallet, tx)` | Submit any transaction and wait for validation |

### Options

Set these in `playwright.config.ts` (`use`) or per file with `test.use({ ... })`:

| Option | Default | |
| --- | --- | --- |
| `walletSeed` | fresh account | Account secret: seed (`s...`), hex private key or secret numbers |
| `fundWallet` | `false` | Fund a fresh account from the faucet before the test |
| `xrplUrl` | XRPL Testnet | Node the wallet uses to autofill and submit |

### Testing as an onboarded user

To test flows behind sign-up or KYC, complete them once with a dedicated
Testnet account and give its secret to the tests:

```bash
npx xrplwright new-wallet        # prints a funded Testnet seed
```

```ts
test.use({ walletSeed: process.env.E2E_WALLET_SEED });
```

## CLI

```bash
npx xrplwright init [dir]            # same as npm init xrplwright
npx xrplwright new-wallet            # create and fund a Testnet account, print its seed
npx xrplwright address <secret>      # address of a seed, hex private key or secret numbers
npx xrplwright fund <secret>         # top up an account from the faucet
```

## Documentation

- [Guide](docs/GUIDE.md): writing scenarios, test accounts, API reference, CI,
  troubleshooting
- [Example](examples/demo-dapp): a dapp built on `@crossmarkio/sdk` and its
  e2e suite (connect, challenge signature, rejections, payment on Testnet)

## License

[MIT](LICENSE)
