#!/usr/bin/env node
// Commands load their dependencies lazily: `init` must run before anything else is installed.

const USAGE = `usage:
  xrplwright init [dir] [options]      set up e2e tests (same as: npm init xrplwright)
  xrplwright new-wallet [wsUrl]        create and fund a Testnet account, print its seed
  xrplwright address <secret>          show the address of a seed, secret numbers or private key
  xrplwright fund <secret> [wsUrl]     top up an account from the faucet

Run "xrplwright init --help" for the init options.`;

async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'init': {
      const { runInit } = await import('./init/init.js');
      return runInit(args);
    }
    case 'new-wallet': {
      const { Wallet } = await import('xrpl');
      const { SECP256K1 } = await import('./wallets/BaseWallet.js');
      const { NETWORKS, XrplLedger } = await import('./ledger/XrplLedger.js');
      const url = args[0] ?? NETWORKS.testnet;
      const wallet = Wallet.generate(SECP256K1);
      const ledger = new XrplLedger(url);
      try {
        const { balance } = await ledger.fund(wallet);
        console.log(`address: ${wallet.classicAddress}\nseed:    ${wallet.seed}\nbalance: ${balance} XRP (${url})`);
      } finally {
        await ledger.close();
      }
      return;
    }
    case 'address': {
      const { walletFromSecret } = await import('./wallets/secret.js');
      const secret = args.join(' ');
      if (!secret) throw new Error('usage: xrplwright address <secret>');
      const wallet = walletFromSecret(secret);
      console.log(`address:    ${wallet.classicAddress}\npublic key: ${wallet.publicKey}`);
      return;
    }
    case 'fund': {
      const { walletFromSecret } = await import('./wallets/secret.js');
      const { NETWORKS, XrplLedger } = await import('./ledger/XrplLedger.js');
      const [secret, url = NETWORKS.testnet] = args;
      if (!secret) throw new Error('usage: xrplwright fund <secret> [wsUrl]');
      const ledger = new XrplLedger(url);
      try {
        const wallet = walletFromSecret(secret);
        const { balance } = await ledger.fund(wallet);
        console.log(`${wallet.classicAddress}: ${balance} XRP`);
      } finally {
        await ledger.close();
      }
      return;
    }
    default:
      console.log(USAGE);
      if (command && command !== '--help' && command !== '-h') process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
