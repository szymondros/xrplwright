import { ECDSA, Wallet, xrpToDrops } from 'xrpl';

import { expect, test } from '../fixtures';

// Real transactions on Testnet: the wallet's account is funded from the faucet.
test.use({ fundWallet: true });

test('pays 1.5 XRP and the ledger shows it', async ({ dapp, wallet, ledger }) => {
  const recipient = Wallet.generate(ECDSA.secp256k1);
  await ledger.fund(recipient);
  const before = await ledger.xrpBalance(recipient.classicAddress);

  await dapp.connect();
  await dapp.pay(recipient.classicAddress, '1.5');

  await expect(dapp.payment()).toHaveText(/^Paid: [0-9A-F]{64}$/, { timeout: 60_000 });

  const request = await wallet.waitForRequest((r) => r.command === 'sign-and-submit');
  expect(request.data?.tx).toMatchObject({ TransactionType: 'Payment', Amount: xrpToDrops('1.5') });
  expect(await ledger.xrpBalance(recipient.classicAddress)).toBeCloseTo(before + 1.5, 6);
});

test('a rejected payment is reported and nothing is sent', async ({ dapp, wallet, ledger }) => {
  const before = await ledger.xrpBalance(wallet.address);

  await dapp.connect();
  await expect(dapp.account()).toHaveText(/^Connected/);
  wallet.rejectNext();
  await dapp.pay(Wallet.generate().classicAddress, '1');

  await expect(dapp.payment()).toHaveText('Payment rejected');
  expect(await ledger.xrpBalance(wallet.address)).toBe(before);
});
