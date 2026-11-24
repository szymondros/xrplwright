import { ed25519 } from '@noble/curves/ed25519.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { Wallet, walletFromSecretNumbers } from 'xrpl';

const toHex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex').toUpperCase();

/**
 * Builds a wallet from any secret form a wallet app exports:
 *
 * - family seed: `s...` (Crossmark import, `xrplwright new-wallet`, most wallets)
 * - secret numbers: 8 groups of 6 digits (Xaman)
 * - private key as hex (Crossmark's "expose private key"):
 *   `ED` + 64 hex for ed25519, `00` + 64 hex or bare 64 hex for secp256k1
 */
export function walletFromSecret(secret: string): Wallet {
  const value = secret.trim();

  if (/^s[1-9A-HJ-NP-Za-km-z]{20,40}$/.test(value)) return Wallet.fromSeed(value);

  const groups = value.split(/[\s,-]+/).filter(Boolean);
  if (groups.length === 8 && groups.every((g) => /^\d{6}$/.test(g))) return walletFromSecretNumbers(groups);

  const hex = value.replace(/^0x/i, '').toUpperCase();
  if (/^ED[0-9A-F]{64}$/.test(hex)) {
    const publicKey = 'ED' + toHex(ed25519.getPublicKey(Buffer.from(hex.slice(2), 'hex')));
    return new Wallet(publicKey, hex);
  }
  if (/^(00)?[0-9A-F]{64}$/.test(hex)) {
    const raw = hex.length === 66 ? hex.slice(2) : hex;
    const publicKey = toHex(secp256k1.getPublicKey(Buffer.from(raw, 'hex'), true));
    return new Wallet(publicKey, '00' + raw);
  }

  throw new Error(
    'Unrecognized wallet secret: expected a family seed (s...), 8 groups of 6 digits (secret numbers), ' +
      'or a hex private key (ED + 64 hex for ed25519, 64 or 00 + 64 hex for secp256k1).',
  );
}
