# xrplwright guide

How to write and run end-to-end tests for XRP Ledger dapps with xrplwright.
It assumes no prior Playwright knowledge.

- [1. How it works](#1-how-it-works)
- [2. Playwright in five minutes](#2-playwright-in-five-minutes)
- [3. Setup](#3-setup)
- [4. Running tests](#4-running-tests)
- [5. Writing a scenario](#5-writing-a-scenario)
- [6. Test accounts (and KYC)](#6-test-accounts-and-kyc)
- [7. API reference](#7-api-reference)
- [8. Scheduled runs in CI](#8-scheduled-runs-in-ci)
- [9. Adding a wallet](#9-adding-a-wallet)
- [10. Troubleshooting](#10-troubleshooting)
- [11. Limitations](#11-limitations)

---

## 1. How it works

The browser in a test does not load a wallet extension. xrplwright installs a
**programmable wallet** in its place, which speaks the extension's page
protocol (for now, Crossmark's). The dapp keeps its wallet SDK, unchanged, and
cannot tell the difference.

```
 dapp code ── @crossmarkio/sdk ── window.postMessage ──┐
                                                        │  (in the browser)
 xrplwright in-page script  <───────────────────────────┘
        │  exposed binding
        ▼  (in Node, inside your test)
 CrossmarkWallet ── signs with a real key ── XrplLedger ── Testnet
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

## 2. Playwright in five minutes

[Playwright](https://playwright.dev) drives a real browser from TypeScript tests.

| Concept | What it is |
| --- | --- |
| `playwright.config.ts` | The app URL (`baseURL`), browsers, timeouts and reporters |
| `*.spec.ts` | Test files. Every `test('name', async (fixtures) => { ... })` is one scenario |
| Fixtures | Objects that Playwright builds before a test and tears down after it: `page` is built in, and xrplwright adds `wallet` and `ledger` |
| `page` | The browser tab: `page.goto('/')`, `page.getByRole('button', { name: 'Save' }).click()` |
| Locators | How to find elements, preferably as a user sees them: `getByRole`, `getByText`, `getByLabel` |
| `expect` | Assertions. On locators they wait and retry: `await expect(page.getByText('Done')).toBeVisible()` |
| `test.use({...})` | Options for a file or a group (e.g. which account) |
| `test.skip(cond, why)` | Skip when a precondition is missing |

Await every action and assertion. Locator assertions retry until they pass or
time out, so don't add sleeps.

```bash
npx playwright test --ui          # interactive runner: watch, time-travel, pick locators
npx playwright test --headed      # see the browser
npx playwright codegen <url>      # record clicks as test code
npx playwright show-report        # HTML report: failures with trace, screenshot and video
```

## 3. Setup

Requirements: Node 22 or newer.

```bash
npm init xrplwright my-e2e        # a separate e2e project (its own repo)
npm init xrplwright -- --here     # inside an existing project, in ./e2e
npm init xrplwright               # asks: inside this project, or a separate one
```

| Option | Meaning |
| --- | --- |
| `[dir]` | Create a separate project in this folder |
| `--here` | Add tests to the project in the current folder |
| `--tests-dir <name>` | Folder for the tests inside a project (default `e2e`) |
| `--base-url <url>` | URL of the dapp (default `http://localhost:3000`) |
| `--ci gitlab\|github\|none` | Add a scheduled CI job |
| `--no-install` | Only write files |
| `-y` | Ask nothing, take the defaults |

With `npm init`, options go after `--`, e.g. `npm init xrplwright -- --here --ci github`.
`npx xrplwright init` takes the same options without the `--`.

What it creates:

| Separate project | Inside a project | |
| --- | --- | --- |
| `playwright.config.ts` | `e2e/playwright.config.ts` | Loads `.env` next to it, reads `E2E_BASE_URL` and `E2E_XRPL_URL` |
| `fixtures.ts` | `e2e/fixtures.ts` | `test` (fresh account) and `userTest` (`E2E_WALLET_SEED`); add your page objects here |
| `tests/example.spec.ts` | `e2e/tests/example.spec.ts` | Wallet detection, a connect scenario to adapt, a ledger check |
| `.env.example` | `e2e/.env.example` | The variables |
| `package.json` | adds the scripts `test:e2e` and `test:e2e:ui` | Existing scripts are left alone |
| `.gitignore`, `tsconfig.json`, `README.md` | appends entries to `.gitignore` | |
| `.gitlab-ci.yml` / `.github/workflows/e2e.yml` | `e2e/gitlab-ci.yml` (to `include`) / `.github/workflows/e2e.yml` | With `--ci` |

The generator never overwrites a file and lists what it skipped. Inside a
project it uses `import.meta.dirname` or `__dirname` depending on the
project's `"type"`, and installs with the project's package manager (npm,
pnpm, yarn or bun).

**Separate repo or inside the dapp?** Inside the dapp, a UI change and its
test change land in one pull request, and the tests can run on every PR. A
separate repo suits tests of deployed environments on a schedule, tests owned
by a QA team, and suites that cover several apps. The generator supports both.

### By hand

```bash
npm i -D @playwright/test xrplwright
npx playwright install chromium
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { loadDotenv, type XrplOptions } from 'xrplwright';

loadDotenv(import.meta.dirname); // or __dirname in CommonJS

export default defineConfig<XrplOptions>({
  testDir: './tests',
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
});
```

Then `import { test, expect } from 'xrplwright'` in your specs.

## 4. Running tests

```bash
npm test                     # separate project (npm run test:e2e inside a project)
npm test -- --ui             # interactive
npx playwright test tests/payment.spec.ts --headed
npx playwright test -g "rejected"    # tests whose title matches
```

| Variable | Meaning |
| --- | --- |
| `E2E_BASE_URL` | The dapp under test |
| `E2E_XRPL_URL` | The XRPL node the wallet uses (default: Testnet) |
| `E2E_WALLET_SEED` | Secret of an onboarded test account: see [section 6](#6-test-accounts-and-kyc) |

`loadDotenv()` reads them from the `.env` next to `playwright.config.ts`.
Variables set in the shell or in CI take precedence.

**Run the suite once at a time per account.** Tests that share an account
(`E2E_WALLET_SEED`) interfere if two runs overlap: logins invalidate each
other's challenges, and balances move. Generated configs use `workers: 1` for
this reason.

## 5. Writing a scenario

A scenario is a Playwright test that also uses `wallet` (what the user signs)
and `ledger` (the state on chain). The usual shape:

1. **Arrange** the account (fund it, check balances).
2. **Act** in the UI as a user would.
3. **Assert** on three levels: what the wallet was asked to sign, what the UI
   shows, and what changed on the ledger.

```ts
import { ECDSA, Wallet, xrpToDrops } from 'xrpl';
import { expect, test } from '../fixtures';

test.use({ fundWallet: true });

test('pays 1.5 XRP', async ({ dapp, wallet, ledger }) => {
  // 1. Arrange
  const recipient = Wallet.generate(ECDSA.secp256k1);
  await ledger.fund(recipient);
  const before = await ledger.xrpBalance(recipient.classicAddress);

  // 2. Act
  await dapp.connect();
  await dapp.pay(recipient.classicAddress, '1.5');

  // 3. Assert: the request, the UI, the ledger
  const request = await wallet.waitForRequest((r) => r.command === 'sign-and-submit');
  expect(request.data?.tx).toMatchObject({ TransactionType: 'Payment', Amount: xrpToDrops('1.5') });
  await expect(dapp.payment()).toHaveText(/^Paid: /);
  expect(await ledger.xrpBalance(recipient.classicAddress)).toBeCloseTo(before + 1.5, 6);
});
```

The complete, runnable version is in
[examples/demo-dapp/tests/payment.spec.ts](../examples/demo-dapp/tests/payment.spec.ts).

### Which `test`

| Import | Account | Use for |
| --- | --- | --- |
| `test` | fresh and empty per test | flows of a new user (signup, first login) |
| `test` + `test.use({ fundWallet: true })` | fresh, funded from the faucet (about 5–10 s) | transactions without an onboarded user |
| `userTest` (generated `fixtures.ts`) | `E2E_WALLET_SEED` | everything behind onboarding (email, KYC) |

### User decisions

```ts
wallet.rejectNext();                 // the next prompt is rejected
wallet.approveNext(); wallet.rejectNext();   // approve the first prompt, reject the second
```

Only prompts count: signatures and transactions. Silent requests such as the
SDK's session handshake (`network`, `user`, `address`) never consume a queued
decision.

### What the dapp asked for

```ts
// Waits for a matching request; one that was already received counts too.
const signIn = await wallet.waitForRequest((r) => r.command === 'sign' && !!r.data?.hex);
const message = Buffer.from(signIn.data!.hex!, 'hex').toString('utf8');
expect(message).toContain(wallet.address);

// Everything so far, handshake requests included
const prompts = wallet.requests.filter((r) => r.command === 'sign' || r.command === 'sign-and-submit');
```

### Page objects

Put the dapp's steps (connect, open a screen, fill a form) in a class in
`fixtures.ts` and expose it as a fixture, as
[examples/demo-dapp/fixtures.ts](../examples/demo-dapp/fixtures.ts) does.
Selectors then live in one place when the UI changes. Prefer what a user sees
(role and visible text) over CSS classes.

### Tips from real dapps

- **Hydration**: in SSR apps (Next.js and similar), a click before hydration
  does nothing. Open menus with a retrying helper:
  `await expect(async () => { await button.click(); await expect(menu).toBeVisible({ timeout: 2000 }); }).toPass()`.
- **Visually hidden checkboxes** (styled replacements): Playwright won't click
  them, even with `force`. Use `checkbox.evaluate((el) => el.click())`, then
  `expect(checkbox).toBeChecked()`.
- **Duplicated forms** (one rendered off-screen for another breakpoint or
  modal): pick the one that is on screen (`boundingBox()` within the viewport)
  rather than matching on text that changes with state.
- **Responsive layouts**: set a desktop viewport (e.g. 1920×1080) when the
  tablet layout moves controls off-screen.
- **Wait for data**, not time: before deciding that something is absent, wait
  for either the data or its empty state:
  `await expect(rows.first().or(page.getByText('No positions'))).toBeVisible()`.

## 6. Test accounts (and KYC)

A dapp identifies its user by **wallet address**, and xrplwright signs with the
key behind the **secret** you give it. With the secret of an account that went
through the dapp's onboarding (email, KYC) on an environment, tests act as that
user, with everything the user has.

### A dedicated test account (recommended)

1. Create and fund a Testnet account:

   ```bash
   npx xrplwright new-wallet
   # address: r...
   # seed:    s...
   ```

2. Complete the dapp's onboarding with it once. You can use a real wallet, or
   a test that logs in with xrplwright and stops for you, so you never need
   the wallet app:

   ```ts
   userTest('onboard by hand', async ({ page }) => {
     await page.goto('/');
     // ...connect...
     await page.pause(); // finish email / KYC in the browser, then resume
   });
   ```

   Run it with `npx playwright test -g "onboard by hand" --headed`. If KYC
   cannot be passed on a test environment, ask the backend to mark the
   address as verified.
3. Turn 2FA off for this user. xrplwright does not enter TOTP codes yet.
4. Set the secret: `E2E_WALLET_SEED=...` in `.env`, or as a masked, protected
   CI variable.

### Secrets it accepts

| Form | Looks like | From |
| --- | --- | --- |
| Family seed | `s...` | `xrplwright new-wallet`, most wallets' export or import |
| Hex private key | `00` + 64 hex or 64 hex (secp256k1), `ED` + 64 hex (ed25519) | e.g. Crossmark: account details → private key |
| Secret numbers | 8 groups of 6 digits | Xaman |

Check which account a secret belongs to with `npx xrplwright address <secret>`.
A hardware wallet (e.g. Ledger) never reveals its key, so its accounts cannot
be used.

> Crossmark 0.2.19 cannot sign with accounts imported from a seed
> ([crossmarkio/crosskit#1](https://github.com/crossmarkio/crosskit/issues/1)).
> If you onboard through the real extension, use an account created in it, or
> onboard through xrplwright as in step 2.

### Keeping it usable

- **Testnet resets** wipe balances from time to time. The secret, and the user
  in the dapp's database, stay valid. Top up with `npx xrplwright fund <secret>`.
- **Onboarding is per environment**: each backend (dev, staging) stores its own
  users and KYC.
- **Several roles** (e.g. admin and user): one fixture each,
  `export const adminTest = test.extend({ walletSeed: process.env.E2E_ADMIN_SEED })`.

> **Never use a mainnet secret.** The same key works on every network, and
> xrplwright signs and submits for real.

## 7. API reference

### Fixtures and options (`import { test } from 'xrplwright'`)

| Name | Kind | Default | Description |
| --- | --- | --- | --- |
| `wallet` | fixture (auto) | | The wallet, installed into every `page` before navigation |
| `ledger` | fixture | | An `XrplLedger` that connects lazily to `xrplUrl` |
| `walletKind` | option | `'crossmark'` | Which wallet the page sees |
| `walletSeed` | option | `undefined` | Account secret (seed, hex private key or secret numbers); a fresh account when unset |
| `fundWallet` | option | `false` | Fund a fresh account from the faucet before the test |
| `xrplUrl` | option | Testnet | Node used to autofill and submit |

Set options in `playwright.config.ts` (`use`), per file or group
(`test.use({...})`), or in a derived test (`test.extend({...})`). Type the
config with `defineConfig<XrplOptions>`.

### `wallet` (`CrossmarkWallet`)

| Member | Description |
| --- | --- |
| `address` | Classic address (`r...`) |
| `wallet` | The underlying `xrpl.Wallet` |
| `requests` | Every request received: `{ command, data }` |
| `rejectNext(count = 1)` / `approveNext(count = 1)` | Queue decisions for the next prompts |
| `waitForRequest(predicate?, timeout = 30000)` | The first request (past or future) that matches |
| `install(page)` | Done by the fixture; for pages you open yourself |

Crossmark commands it answers:

| Command | The dapp gets |
| --- | --- |
| `sign` with `TransactionType: 'SignIn'` | `address`, `publicKey`; with `hex`, also the `signature` of that hex |
| `sign` with any other transaction | `txblob`, `hash` (autofilled and signed, not submitted) |
| `sign-and-submit` | `resp.result` of the validated transaction (`hash`, `meta`, ...) |
| `submit` | The same, for a blob signed earlier |
| `network`, `user`, `address` | Session handshake |

`meta.isSuccess` is `true` only for `tesSUCCESS`. A rejection returns
`meta.isRejected: true`.

### `ledger` (`XrplLedger`)

| Method | Description |
| --- | --- |
| `fund(wallet, amountXrp?)` | Fund or create an account from the faucet (Testnet, Devnet) |
| `xrpBalance(address)` | XRP balance; `0` for an account that doesn't exist |
| `tokenBalance(address, { currency, issuer })` | Issued-token balance; `0` without a trust line |
| `setTrustline(wallet, { currency, issuer }, limit?)` | Open a trust line |
| `signAndSubmit(wallet, tx)` | Autofill, sign, submit, wait for validation |
| `sign(wallet, tx)` / `submitAndWait(blob)` | The two halves |
| `waitForXrpBalance(address, predicate, timeout?)` | Poll until the balance satisfies `predicate` |
| `connect()` | The raw `xrpl.Client` |

### Other exports

`NETWORKS` (`testnet`, `devnet`, `mainnet` URLs), `walletFromSecret(secret)`,
`loadDotenv(dir)`, `BaseWallet` and the `WalletDriver` type (for new wallets).

### CLI

```bash
npx xrplwright init [dir] [options]   # set up e2e tests (section 3)
npx xrplwright new-wallet [wsUrl]     # create and fund a Testnet account, print its seed
npx xrplwright address <secret>       # address and public key of a secret
npx xrplwright fund <secret> [wsUrl]  # top up from the faucet
```

## 8. Scheduled runs in CI

`init --ci gitlab` or `--ci github` adds a job that runs the suite on a
schedule and on manual triggers, keeps the HTML report and traces as
artifacts, and publishes JUnit results.

- **GitLab**: add `E2E_BASE_URL` and the masked variable `E2E_WALLET_SEED`
  under Settings → CI/CD → Variables, then create a schedule under Build →
  Pipeline schedules.
- **GitHub**: add the repository variable `E2E_BASE_URL` and the secret
  `E2E_WALLET_SEED`, then adjust the `cron` line in `.github/workflows/e2e.yml`.

The generated jobs use the official Playwright Docker image (GitLab) or
`playwright install --with-deps` (GitHub). Everything runs headless, and no
extension has to be installed. An environment reachable only through a VPN
needs a runner inside that network.

## 9. Adding a wallet

A wallet is one class plus one in-page script:

1. `src/wallets/<name>/inpage.ts`: a self-contained function, run with
   `page.addInitScript`. It makes the wallet detectable the way its SDK
   checks (a `window` property, an announce event, ...) and forwards each
   request to Node through an exposed binding.
2. `src/wallets/<name>/<Name>Wallet.ts`: `extends BaseWallet` and implements
   `install(page)` and the request handler. Call
   `this.receive(request, { prompt })` first, then sign with `this.wallet` and
   `this.ledger`.
3. Register it in `WALLETS` in `src/fixtures.ts`, add its name to `WalletKind`,
   and export it from `src/index.ts`.
4. Add a test that drives the wallet's real SDK in the demo page
   (`tests/demo-dapp.ts`), like `tests/crossmark.spec.ts`.

Read the protocol from the wallet's SDK source in `node_modules`, and check
which response fields the SDK reads, not only the ones the dapp reads. The
Crossmark SDK, for example, needs the original request echoed back in each
response and a handshake (`network`, `user`, `address`). Without them it
hangs silently. Both are documented in `src/wallets/crossmark/protocol.ts`.

## 10. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| A click on "Connect" does nothing | The page has not hydrated yet: use a retrying helper (section 5) |
| The dapp says the wallet is not installed | You opened a page yourself without `wallet.install(page)` before navigating |
| Login hangs after the first prompt | The wallet returned a shape the SDK doesn't expect: log `wallet.requests` and open an issue |
| `actNotFound`, unfunded account | A Testnet reset, or a fresh account without `fundWallet: true` |
| `tecUNFUNDED_PAYMENT`, `tecPATH_DRY` | Not enough XRP above the reserve, or no trust line / token balance |
| A user test lands on signup or KYC | The secret's account is not onboarded on this environment |
| A 2FA prompt appears | 2FA is on for the test user |
| Flaky logins with one shared account | Two runs at the same time (section 4) |

When a test fails, open `npx playwright show-report`. Each failure has a trace:
every step, before-and-after screenshots, network and console.

## 11. Limitations

- Crossmark only for now. GemWallet is next. Xaman cannot be a browser
  wallet, since it signs on the phone.
- The wallet's own UI is not tested.
- No 2FA (TOTP) helper yet.
- No mid-test network or account switching yet.
