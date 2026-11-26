# Test accounts (and KYC)

A dapp identifies its user by **wallet address**, and xrplwright signs with the
key behind the **secret** you give it. With the secret of an account that went
through the dapp's onboarding (email, KYC) on an environment, tests act as that
user, with everything the user has.

## A dedicated test account (recommended)

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
3. Turn 2FA off for this user. xrplwright does not enter TOTP codes yet
   (planned, see the [roadmap](../ROADMAP.md)).
4. Set the secret: `E2E_WALLET_SEED=...` in `.env`, or as a masked, protected
   CI variable.

## Secrets it accepts

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

## Keeping it usable

- **Testnet resets** wipe balances from time to time. The secret, and the user
  in the dapp's database, stay valid. Top up with `npx xrplwright fund <secret>`.
- **Onboarding is per environment**: each backend (dev, staging) stores its own
  users and KYC.
- **Several roles** (e.g. admin and user): one fixture each,
  `export const adminTest = test.extend({ walletSeed: process.env.E2E_ADMIN_SEED })`.

> **Never use a mainnet secret.** The same key works on every network, and
> xrplwright signs and submits for real.
