import { verify } from 'ripple-keypairs';
import { decode, Wallet, xrpToDrops } from 'xrpl';

import { expect, SECP256K1, walletTest } from '../src/index.js';
import { openDemoDapp } from './demo-dapp.js';

const test = walletTest('gemwallet');

test.describe('GemWallet against the real @gemwallet/api', () => {
  test('is installed and shares the address, public key and network', async ({ page, wallet }) => {
    await openDemoDapp(page, 'gemwallet');

    const result = await page.evaluate(async () => {
      const g = (window as any).GemWalletApi;
      return {
        installed: await g.isInstalled(),
        address: await g.getAddress(),
        publicKey: await g.getPublicKey(),
        network: await g.getNetwork(),
      };
    });

    expect(result.installed.result.isInstalled).toBe(true);
    expect(result.address).toEqual({ type: 'response', result: { address: wallet.address } });
    expect(result.publicKey.result).toEqual({ address: wallet.address, publicKey: wallet.account.publicKey });
    expect(result.network.result).toMatchObject({ chain: 'XRPL', network: 'Testnet' });
    expect(wallet.name).toBe('gemwallet');
  });

  test('signs a message the way the extension does', async ({ page, wallet }) => {
    await openDemoDapp(page, 'gemwallet');
    const message = 'log in to the demo dapp #42';
    const hex = Buffer.from('hex challenge', 'utf8').toString('hex');

    const signed = await page.evaluate(
      async ({ message, hex }) => {
        const g = (window as any).GemWalletApi;
        return { text: await g.signMessage(message), hex: await g.signMessage(hex, true) };
      },
      { message, hex },
    );

    const { publicKey } = wallet.account;
    expect(verify(Buffer.from(message, 'utf8').toString('hex'), signed.text.result.signedMessage, publicKey)).toBe(true);
    expect(verify(hex, signed.hex.result.signedMessage, publicKey)).toBe(true);
    const request = await wallet.waitForRequest((r) => r.command === 'REQUEST_SIGN_MESSAGE/V3');
    expect(request.data?.message).toBe(message);
  });

  test('a queued rejection reaches the dapp as type "reject"; detection consumes no decision', async ({ page, wallet }) => {
    await openDemoDapp(page, 'gemwallet');
    wallet.rejectNext();

    const result = await page.evaluate(async () => {
      const g = (window as any).GemWalletApi;
      await g.isInstalled();
      await g.getNetwork();
      return { rejected: await g.getAddress(), next: await g.getAddress() };
    });

    expect(result.rejected).toEqual({ type: 'reject' });
    expect(result.next.type).toBe('response');
  });

  test('an unsupported request rejects the call with an error', async ({ page }) => {
    await openDemoDapp(page, 'gemwallet');
    const error = await page.evaluate(async () => {
      try {
        await (window as any).GemWalletApi.setHook({ hooks: [] });
        return null;
      } catch (e) {
        return String(e);
      }
    });
    expect(error).toContain('REQUEST_SET_HOOK/V3');
  });

  test('signTransaction returns the signed blob without submitting', async ({ page, wallet }) => {
    await openDemoDapp(page, 'gemwallet');
    // Sequence, Fee and LastLedgerSequence given, so autofill needs no account on the ledger.
    const tx = {
      TransactionType: 'Payment',
      Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
      Amount: '1000',
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 99_999_999,
    };

    const signed = await page.evaluate(async (transaction) => {
      return (window as any).GemWalletApi.signTransaction({ transaction });
    }, tx);

    expect(decode(signed.result.signature)).toMatchObject({ ...tx, Account: wallet.address, SigningPubKey: wallet.account.publicKey });
  });

  test.describe('on Testnet', () => {
    test.use({ fundWallet: true });

    test('sendPayment submits a Payment and returns its hash', async ({ page, wallet, ledger }) => {
      const destination = Wallet.generate(SECP256K1);
      await ledger.fund(destination);
      const before = await ledger.xrpBalance(destination.classicAddress);

      await openDemoDapp(page, 'gemwallet');
      const sent = await page.evaluate(
        async (payment) => (window as any).GemWalletApi.sendPayment(payment),
        {
          amount: xrpToDrops('1.5'),
          destination: destination.classicAddress,
          memos: [{ memo: { memoType: Buffer.from('note').toString('hex'), memoData: Buffer.from('e2e').toString('hex') } }],
        },
      );

      expect(sent.type).toBe('response');
      expect(sent.result.hash).toMatch(/^[0-9A-F]{64}$/);
      expect(await ledger.xrpBalance(destination.classicAddress)).toBeCloseTo(before + 1.5, 6);
      const request = await wallet.waitForRequest((r) => r.command === 'REQUEST_SEND_PAYMENT/V3');
      expect(request.data).toMatchObject({ destination: destination.classicAddress });
    });

    test('mintNFT returns the NFTokenID and getNFT lists it', async ({ page }) => {
      await openDemoDapp(page, 'gemwallet');
      const result = await page.evaluate(async () => {
        const g = (window as any).GemWalletApi;
        const minted = await g.mintNFT({ NFTokenTaxon: 0, URI: '68747470733A2F2F6578616D706C652E636F6D', flags: { tfTransferable: true } });
        const listed = await g.getNFT();
        return { minted: minted.result, listed: listed.result };
      });

      expect(result.minted.NFTokenID).toMatch(/^[0-9A-F]{64}$/);
      expect(result.listed.account_nfts.map((n: { NFTokenID: string }) => n.NFTokenID)).toContain(result.minted.NFTokenID);
    });

    test('a failing transaction rejects the call with the engine result', async ({ page }) => {
      await openDemoDapp(page, 'gemwallet');
      // Paying more than the balance fails on the ledger (tecUNFUNDED_PAYMENT).
      const error = await page.evaluate(async () => {
        try {
          await (window as any).GemWalletApi.sendPayment({ amount: '900000000000', destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe' });
          return null;
        } catch (e) {
          return String(e);
        }
      });
      expect(error).toMatch(/tec\w+/);
    });
  });
});
