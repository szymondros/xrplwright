import { expect, type Page } from '@playwright/test';
import { test as base, walletTest } from 'xrplwright';

/** Page object: the dapp's steps in one place, so tests read like scenarios. */
export class DemoDapp {
  constructor(readonly page: Page) {}

  async connect(wallet: 'Crossmark' | 'GemWallet' = 'Crossmark') {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: `Connect ${wallet}` }).click();
  }

  account() {
    return this.page.locator('#account');
  }

  async pay(destination: string, amountXrp: string) {
    await this.page.getByLabel('Destination').fill(destination);
    await this.page.getByLabel('Amount (XRP)').fill(amountXrp);
    await this.page.getByRole('button', { name: 'Send' }).click();
  }

  payment() {
    return this.page.locator('#payment');
  }
}

type DappFixtures = { dapp: DemoDapp };
const dapp = async ({ page }: { page: Page }, use: (d: DemoDapp) => Promise<void>) => use(new DemoDapp(page));

/** The dapp with the Crossmark wallet (the default `test`). */
export const test = base.extend<DappFixtures>({ dapp });

/** The dapp with GemWallet: `wallet` is a `GemWallet`. */
export const gemTest = walletTest('gemwallet').extend<DappFixtures>({ dapp });

export { expect };
