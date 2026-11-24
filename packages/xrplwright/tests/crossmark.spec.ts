import { verify } from 'ripple-keypairs';
import { Wallet, xrpToDrops } from 'xrpl';

import { expect, SECP256K1, test } from '../src/index.js';
import { openDemoDapp } from './demo-dapp.js';

test.describe('CrossmarkWallet against the real @crossmarkio/sdk', () => {
  test('is detected and signs in with a verifiable message signature', async ({ page, wallet }) => {
    await openDemoDapp(page);

    const challenge = Buffer.from('log in to the demo dapp #42', 'utf8').toString('hex');
    const result = await page.evaluate(async (hex) => {
      const s = (window as any).default;
      const detected = await s.async.detect(0);
      const connect = await s.async.signInAndWait();
      const signed = await s.async.signInAndWait(hex);
      return { detected, connect: connect.response.data, signed: signed.response.data };
    }, challenge);

    expect(result.detected).toBe(true);
    expect(result.connect.address).toBe(wallet.address);
    expect(result.signed.publicKey).toBe(wallet.wallet.publicKey);
    expect(verify(challenge, result.signed.signature, result.signed.publicKey)).toBe(true);
  });

  test('a queued rejection reaches the dapp as isRejected', async ({ page, wallet }) => {
    await openDemoDapp(page);
    wallet.rejectNext();

    const meta = await page.evaluate(async () => {
      const s = (window as any).default;
      await s.async.detect(0);
      return (await s.async.signInAndWait()).response.data.meta;
    });

    expect(meta.isRejected).toBe(true);
  });

  test.describe('on Testnet', () => {
    test.use({ fundWallet: true });

    test('signs and submits a Payment', async ({ page, wallet, ledger }) => {
      const destination = Wallet.generate(SECP256K1);
      await ledger.fund(destination);
      const before = await ledger.xrpBalance(destination.classicAddress);

      await openDemoDapp(page);
      const data = await page.evaluate(
        async (tx) => {
          const s = (window as any).default;
          await s.async.detect(0);
          return (await s.async.signAndSubmitAndWait(tx)).response.data;
        },
        { TransactionType: 'Payment', Destination: destination.classicAddress, Amount: xrpToDrops('1.5') },
      );

      expect(data.meta.isSuccess).toBe(true);
      expect(data.resp.result.hash).toMatch(/^[0-9A-F]{64}$/);
      expect(await ledger.xrpBalance(destination.classicAddress)).toBeCloseTo(before + 1.5, 6);
      expect(wallet.requests.map((r) => r.command)).toContain('sign-and-submit');
    });
  });
});
