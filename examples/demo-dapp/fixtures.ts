import { expect, type Page } from '@playwright/test';
import { test as base } from 'xrplwright';

/** Page object: the dapp's steps in one place, so tests read like scenarios. */
export class DemoDapp {
  constructor(readonly page: Page) {}

  async connect() {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Connect Crossmark' }).click();
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

export const test = base.extend<{ dapp: DemoDapp }>({
  dapp: async ({ page }, use) => use(new DemoDapp(page)),
});

export { expect };
