# Getting started

## Playwright in five minutes

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

## Setup

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

## Running tests

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
| `E2E_WALLET_SEED` | Secret of an onboarded test account: see [Test accounts](test-accounts.md) |

`loadDotenv()` reads them from the `.env` next to `playwright.config.ts`.
Variables set in the shell or in CI take precedence.

**Run the suite once at a time per account.** Tests that share an account
(`E2E_WALLET_SEED`) interfere if two runs overlap: logins invalidate each
other's challenges, and balances move. Generated configs use `workers: 1` for
this reason.
