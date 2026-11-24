/** File contents the generator writes. Pure functions of the choices made. */

export type Ci = 'gitlab' | 'github' | 'none';

export interface TemplateOptions {
  /** Base URL of the dapp under test. */
  baseURL: string;
  /** `import.meta.dirname` for ESM projects, `__dirname` for CommonJS. */
  dirnameExpr: 'import.meta.dirname' | '__dirname';
  /** Path from the repo root to the folder holding playwright.config.ts ('' or 'e2e'). */
  root: string;
  /** Command that runs the suite from the repo root. */
  runCommand: string;
}

const at = (root: string, path: string) => (root ? `${root}/${path}` : path);

export function playwrightConfig(o: TemplateOptions): string {
  return `import { defineConfig, devices } from '@playwright/test';
import { loadDotenv, type XrplOptions } from 'xrplwright';

// Reads ${at(o.root, '.env')}; variables set in the shell or in CI win.
loadDotenv(${o.dirnameExpr});

const isCI = !!process.env.CI;

export default defineConfig<XrplOptions>({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Tests that share one wallet (E2E_WALLET_SEED) must not run at the same time.
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? '${o.baseURL}',
    xrplUrl: process.env.E2E_XRPL_URL ?? 'wss://s.altnet.rippletest.net:51233',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }],
});
`;
}

export function fixtures(): string {
  return `import { test as base } from 'xrplwright';

/**
 * \`test\`: a fresh, empty Testnet account per test (add \`test.use({ fundWallet: true })\` for XRP).
 * \`userTest\`: the account from E2E_WALLET_SEED, e.g. a user who completed the dapp's onboarding/KYC.
 *
 * Add your page objects here, e.g.:
 *   export const test = base.extend<{ app: MyApp }>({ app: async ({ page }, use) => use(new MyApp(page)) });
 */
export const test = base;
export const userTest = base.extend({ walletSeed: process.env.E2E_WALLET_SEED || undefined });

export { expect } from 'xrplwright';
`;
}

export function exampleSpec(): string {
  return `import { expect, test, userTest } from '../fixtures';

test('the dapp sees a Crossmark wallet', async ({ page, wallet }) => {
  await page.goto('/');

  // xrplwright installs the wallet before the page loads; the dapp's @crossmarkio/sdk detects it.
  expect(await page.evaluate(() => (window as any).xrpl?.isCrossmark)).toBe(true);
  console.log(\`test wallet: \${wallet.address}\`);
});

// A typical scenario. Adjust the selectors to your dapp and remove .skip.
test.skip('connects Crossmark and signs in', async ({ page, wallet }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect Wallet' }).click();
  await page.getByRole('button', { name: /Crossmark/ }).click();

  // What the dapp asked the wallet for: a SignIn, maybe with a challenge to sign.
  const request = await wallet.waitForRequest((r) => r.command === 'sign');
  expect(request.data?.tx?.TransactionType).toBe('SignIn');
});

// Runs only with E2E_WALLET_SEED set (an onboarded account).
userTest.describe('as an onboarded user', () => {
  userTest.skip(!process.env.E2E_WALLET_SEED, 'set E2E_WALLET_SEED');

  userTest('has XRP on Testnet', async ({ wallet, ledger }) => {
    if ((await ledger.xrpBalance(wallet.address)) < 20) await ledger.fund(wallet.wallet);
    expect(await ledger.xrpBalance(wallet.address)).toBeGreaterThan(0);
  });
});
`;
}

export function envExample(o: TemplateOptions): string {
  return `# Copy to .env (next to playwright.config.ts). Shell and CI variables win over this file.

# Dapp under test
E2E_BASE_URL=${o.baseURL}

# XRPL node the wallet autofills and submits through (default: Testnet)
# E2E_XRPL_URL=wss://s.altnet.rippletest.net:51233

# Secret of an onboarded TESTNET account: family seed (s...), hex private key or
# Xaman secret numbers. Create one with: npx xrplwright new-wallet
# Check one with:                         npx xrplwright address <secret>
# Never a mainnet secret: the wallet signs and submits for real.
# E2E_WALLET_SEED=
`;
}

export function gitignoreLines(root: string): string[] {
  return [at(root, '.env'), at(root, 'test-results/'), at(root, 'playwright-report/')];
}

export function tsconfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
`;
}

export function readme(o: TemplateOptions & { standalone: boolean }): string {
  return `# E2E tests (xrplwright)

End-to-end tests of an XRP Ledger dapp with [Playwright](https://playwright.dev) and
xrplwright: the browser gets a programmable Crossmark wallet that signs and submits
for real on Testnet.

\`\`\`bash
cp ${at(o.root, '.env.example')} ${at(o.root, '.env')}   # set E2E_BASE_URL (and E2E_WALLET_SEED)
${o.runCommand}                          # run headless
${o.runCommand} -- --ui                  # interactive runner
npx playwright show-report${o.root ? ` ${o.root}/playwright-report` : ''}       # report with traces of failures
\`\`\`

- \`fixtures.ts\`: \`test\` (fresh account per test) and \`userTest\` (the account from \`E2E_WALLET_SEED\`).
- \`tests/\`: the scenarios. \`wallet.waitForRequest()\` shows what the dapp asked to sign,
  \`wallet.rejectNext()\` rejects the next prompt, \`ledger\` reads and funds Testnet accounts.
- A test account: \`npx xrplwright new-wallet\` (funded Testnet seed). Complete the dapp's
  onboarding/KYC with it once, then set \`E2E_WALLET_SEED\`.
`;
}

export function gitlabCi(o: TemplateOptions & { standalone: boolean }): string {
  const cd = o.root ? `    - cd ${o.root}\n` : '';
  const artifacts = (p: string) => at(o.root, p);
  return `# E2E tests on a pipeline schedule (Build > Pipeline schedules) or a manual run.
# Set E2E_BASE_URL and, for user tests, the masked variable E2E_WALLET_SEED.
e2e:
  image: mcr.microsoft.com/playwright:v1.65.1-noble
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_PIPELINE_SOURCE == "web"
  script:
    - npm ci
${cd}    - npx playwright test
  artifacts:
    when: always
    expire_in: 14 days
    paths:
      - ${artifacts('playwright-report/')}
      - ${artifacts('test-results/')}
    reports:
      junit: ${artifacts('test-results/junit.xml')}
`;
}

export function githubWorkflow(o: TemplateOptions): string {
  const wd = o.root ? `\n    defaults:\n      run:\n        working-directory: ${o.root}` : '';
  return `name: e2e

on:
  schedule:
    - cron: '0 6 * * 1-5'
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest${wd}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
        working-directory: .
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          E2E_BASE_URL: \${{ vars.E2E_BASE_URL }}
          E2E_WALLET_SEED: \${{ secrets.E2E_WALLET_SEED }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: ${at(o.root, 'playwright-report/')}
`;
}
