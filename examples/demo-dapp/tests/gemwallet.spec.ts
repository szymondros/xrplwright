import { Wallet, xrpToDrops } from 'xrpl';
import { SECP256K1 } from 'xrplwright';

import { expect, gemTest as test } from '../fixtures';

// The same scenarios as with Crossmark, through GemWallet's API.
test('connects with GemWallet and signs the sign-in message', async ({ dapp, wallet }) => {
  await dapp.connect('GemWallet');

  await expect(dapp.account()).toHaveText(`Connected: ${wallet.address}`);
  const signIn = await wallet.waitForRequest((r) => r.command === 'REQUEST_SIGN_MESSAGE/V3');
  expect(signIn.data?.message).toBe(`Sign in to Demo dapp: ${wallet.address}`);
});

test('a rejected GemWallet connection leaves the user signed out', async ({ dapp, wallet }) => {
  wallet.rejectNext(); // getAddress: GemWallet asks the user to share the address
  await dapp.connect('GemWallet');

  await expect(dapp.account()).toHaveText('Connection rejected');
});

test.describe('on Testnet', { tag: '@testnet' }, () => {
  test.use({ fundWallet: true });

  test('pays 1.5 XRP through GemWallet', async ({ dapp, wallet, ledger }) => {
    const recipient = Wallet.generate(SECP256K1);
    await ledger.fund(recipient);
    const before = await ledger.xrpBalance(recipient.classicAddress);

    await dapp.connect('GemWallet');
    await dapp.pay(recipient.classicAddress, '1.5');

    await expect(dapp.payment()).toHaveText(/^Paid: [0-9A-F]{64}$/, { timeout: 60_000 });
    const request = await wallet.waitForRequest((r) => r.command === 'REQUEST_SEND_PAYMENT/V3');
    expect(request.data).toMatchObject({ destination: recipient.classicAddress, amount: xrpToDrops('1.5') });
    expect(await ledger.xrpBalance(recipient.classicAddress)).toBeCloseTo(before + 1.5, 6);
  });
});
