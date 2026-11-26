// A minimal dapp: sign in with a wallet (proving key ownership), then pay.
// Each wallet is one small adapter over its real SDK.
const $ = (id) => document.getElementById(id);
const toHex = (text) => Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('');

const wallets = {
  // @crossmarkio/sdk UMD build: window.default
  crossmark: {
    name: 'Crossmark',
    async connect() {
      const sdk = window.default;
      if (!(await sdk.async.detect(3000))) return { error: 'Crossmark is not installed' };
      const connect = (await sdk.async.signInAndWait()).response.data;
      if (connect.meta.isRejected) return { error: 'Connection rejected' };
      const signed = (await sdk.async.signInAndWait(toHex(challengeFor(connect.address)))).response.data;
      if (signed.meta.isRejected) return { error: 'Signature rejected' };
      return { address: connect.address };
    },
    async pay(tx) {
      const { data } = (await window.default.async.signAndSubmitAndWait(tx)).response;
      if (data.meta.isRejected) return { rejected: true };
      return data.meta.isSuccess ? { hash: data.resp.result.hash } : { error: 'Payment failed' };
    },
  },
  // @gemwallet/api UMD build: window.GemWalletApi
  gemwallet: {
    name: 'GemWallet',
    async connect() {
      const gem = window.GemWalletApi;
      if (!(await gem.isInstalled()).result.isInstalled) return { error: 'GemWallet is not installed' };
      const connect = await gem.getAddress();
      if (connect.type === 'reject') return { error: 'Connection rejected' };
      const signed = await gem.signMessage(challengeFor(connect.result.address));
      if (signed.type === 'reject') return { error: 'Signature rejected' };
      return { address: connect.result.address };
    },
    async pay(tx) {
      try {
        const sent = await window.GemWalletApi.sendPayment({ destination: tx.Destination, amount: tx.Amount });
        return sent.type === 'reject' ? { rejected: true } : { hash: sent.result.hash };
      } catch {
        return { error: 'Payment failed' };
      }
    },
  },
};

// A challenge the user signs to prove they own the account (a backend would verify it).
const challengeFor = (address) => `Sign in to Demo dapp: ${address}`;
let wallet = null;

for (const [id, candidate] of Object.entries(wallets)) {
  $(`connect-${id}`).addEventListener('click', async () => {
    const { address, error } = await candidate.connect();
    if (error) return ($('account').textContent = error);
    wallet = candidate;
    $('account').textContent = `Connected: ${address}`;
    $('send').disabled = false;
  });
}

$('send').addEventListener('click', async () => {
  $('payment').textContent = 'Waiting for the wallet...';
  const drops = String(Math.round(Number($('amount').value) * 1_000_000));
  const result = await wallet.pay({ TransactionType: 'Payment', Destination: $('destination').value, Amount: drops });

  if (result.rejected) $('payment').textContent = 'Payment rejected';
  else if (result.hash) $('payment').textContent = `Paid: ${result.hash}`;
  else $('payment').textContent = result.error;
});
