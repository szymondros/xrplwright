import { expect, test } from '@playwright/test';
import { Wallet, XRPLFaucetError, type Client } from 'xrpl';

import { NETWORKS, SECP256K1, XrplLedger } from '../src/index.js';

const faucetError = (statusCode: number) =>
  new XRPLFaucetError(`Request failed: ${JSON.stringify({ contentType: 'text/html', statusCode, body: '...' })}`);

/** A ledger whose client fails `fundWallet` with each of `failures` in turn, then succeeds. */
function ledgerWithFaucet(failures: Error[], attempts = 5) {
  const ledger = new XrplLedger(NETWORKS.testnet, { faucetAttempts: attempts, faucetRetryDelayMs: 1 });
  let calls = 0;
  const client = {
    isConnected: () => true,
    disconnect: async () => undefined,
    fundWallet: async () => {
      const failure = failures[calls++];
      if (failure) throw failure;
      return { wallet: null, balance: 100 };
    },
  } as unknown as Client;
  ledger.connect = async () => client;
  return { ledger, calls: () => calls };
}

test.describe('XrplLedger.fund retries a briefly unavailable faucet', () => {
  const wallet = Wallet.generate(SECP256K1);

  test('a 502 and a dropped connection are retried', async () => {
    const dropped = Object.assign(new Error('Connection failed.'), { name: 'NotConnectedError' });
    const { ledger, calls } = ledgerWithFaucet([faucetError(502), dropped]);

    expect(await ledger.fund(wallet)).toEqual({ balance: 100 });
    expect(calls()).toBe(3);
  });

  test('a 4xx answer is not retried', async () => {
    const { ledger, calls } = ledgerWithFaucet([faucetError(400)]);

    await expect(ledger.fund(wallet)).rejects.toThrow('"statusCode":400');
    expect(calls()).toBe(1);
  });

  test('gives up after faucetAttempts and says so', async () => {
    const { ledger, calls } = ledgerWithFaucet(Array.from({ length: 5 }, () => faucetError(503)), 3);

    await expect(ledger.fund(wallet)).rejects.toThrow('gave up after 3 attempts');
    expect(calls()).toBe(3);
  });
});

test('XrplLedger.network names the network from the URL', () => {
  expect(new XrplLedger(NETWORKS.testnet).network).toBe('testnet');
  expect(new XrplLedger('wss://testnet.xrpl-labs.com').network).toBe('testnet');
  expect(new XrplLedger(NETWORKS.devnet).network).toBe('devnet');
  expect(new XrplLedger(NETWORKS.mainnet).network).toBe('mainnet');
  expect(new XrplLedger('ws://localhost:6006').network).toBe('custom');
});
