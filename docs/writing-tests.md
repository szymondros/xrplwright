# Writing tests

A scenario is a Playwright test that also uses `wallet` (what the user signs)
and `ledger` (the state on chain). The usual shape:

1. **Arrange** the account (fund it, check balances).
2. **Act** in the UI as a user would.
3. **Assert** on three levels: what the wallet was asked to sign, what the UI
   shows, and what changed on the ledger.

```ts
import { Wallet, xrpToDrops } from 'xrpl';
import { SECP256K1 } from 'xrplwright';
import { expect, test } from '../fixtures';

test.use({ fundWallet: true });

test('pays 1.5 XRP', async ({ dapp, wallet, ledger }) => {
  // 1. Arrange
  const recipient = Wallet.generate(SECP256K1);
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

## Which `test`

| Import | Account | Use for |
| --- | --- | --- |
| `test` | fresh and empty per test | flows of a new user (signup, first login) |
| `test` + `test.use({ fundWallet: true })` | fresh, funded from the faucet (about 5–10 s) | transactions without an onboarded user |
| `userTest` (generated `fixtures.ts`) | `E2E_WALLET_SEED` | everything behind onboarding (email, KYC) |

`test` installs Crossmark. For another wallet use `walletTest(kind)`, which
also types `wallet` (and `wallet.requests`) for that wallet:

```ts
import { walletTest } from 'xrplwright';

export const test = walletTest('gemwallet');                // wallet: GemWallet
export const userTest = test.extend({ walletSeed: process.env.E2E_WALLET_SEED });
```

A dapp that offers several wallets can run the same scenarios with each, as
[examples/demo-dapp](../examples/demo-dapp) does. See [Wallets](wallets/README.md).

## User decisions

```ts
wallet.rejectNext();                 // the next prompt is rejected
wallet.approveNext(); wallet.rejectNext();   // approve the first prompt, reject the second
```

Only prompts count: what the real wallet shows a popup for (signatures,
transactions; with GemWallet also sharing the address). Silent requests such as
Crossmark's session handshake never consume a queued decision. Each
[wallet's page](wallets/README.md) lists which requests are prompts.

## What the dapp asked for

```ts
// Waits for a matching request; one that was already received counts too.
const signIn = await wallet.waitForRequest((r) => r.command === 'sign' && !!r.data?.hex);
const message = Buffer.from(signIn.data!.hex!, 'hex').toString('utf8');
expect(message).toContain(wallet.address);

// Everything so far, handshake requests included
const prompts = wallet.requests.filter((r) => r.command === 'sign' || r.command === 'sign-and-submit');
```

## Page objects

Put the dapp's steps (connect, open a screen, fill a form) in a class in
`fixtures.ts` and expose it as a fixture, as
[examples/demo-dapp/fixtures.ts](../examples/demo-dapp/fixtures.ts) does.
Selectors then live in one place when the UI changes. Prefer what a user sees
(role and visible text) over CSS classes.

## Tips from real dapps

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
