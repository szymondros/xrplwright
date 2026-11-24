import { sign, verify } from 'ripple-keypairs';
import { Wallet } from 'xrpl';

import { ED25519, expect, SECP256K1, test, walletFromSecret } from '../src/index.js';

const message = Buffer.from('xrplwright', 'utf8').toString('hex');

for (const algorithm of [SECP256K1, ED25519]) {
  test(`walletFromSecret: every form of a ${algorithm} secret gives the same account`, () => {
    const original = Wallet.generate(algorithm);
    const raw = original.privateKey.slice(2); // without the 00 / ED prefix

    const forms = [original.seed!, original.privateKey, original.privateKey.toLowerCase()];
    if (algorithm === SECP256K1) forms.push(raw, `0x${raw}`);

    for (const secret of forms) {
      const wallet = walletFromSecret(secret);
      expect(wallet.classicAddress, secret.slice(0, 6)).toBe(original.classicAddress);
      expect(verify(message, sign(message, wallet.privateKey), wallet.publicKey)).toBe(true);
    }
  });
}

test('walletFromSecret rejects what it cannot read', () => {
  expect(() => walletFromSecret('rKn6qfBjvHb6yf9vwf6ikEJYW4jpekZRBG')).toThrow(/Unrecognized wallet secret/);
});
