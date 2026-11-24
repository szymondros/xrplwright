// A minimal dapp: sign in with Crossmark (proving key ownership), then pay.
const sdk = window.default; // the @crossmarkio/sdk UMD build
const $ = (id) => document.getElementById(id);
let address = null;

$('connect').addEventListener('click', async () => {
  if (!(await sdk.async.detect(3000))) return ($('account').textContent = 'Crossmark is not installed');

  const connect = (await sdk.async.signInAndWait()).response.data;
  if (connect.meta.isRejected) return ($('account').textContent = 'Connection rejected');

  // A challenge the user signs to prove they own the account (a backend would verify it).
  const challenge = Array.from(new TextEncoder().encode(`Sign in to Demo dapp: ${connect.address}`))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const signed = (await sdk.async.signInAndWait(challenge)).response.data;
  if (signed.meta.isRejected) return ($('account').textContent = 'Signature rejected');

  address = connect.address;
  $('account').textContent = `Connected: ${address}`;
  $('send').disabled = false;
});

$('send').addEventListener('click', async () => {
  $('payment').textContent = 'Waiting for the wallet...';
  const drops = String(Math.round(Number($('amount').value) * 1_000_000));
  const { data } = (
    await sdk.async.signAndSubmitAndWait({ TransactionType: 'Payment', Destination: $('destination').value, Amount: drops })
  ).response;

  if (data.meta.isRejected) $('payment').textContent = 'Payment rejected';
  else if (data.meta.isSuccess) $('payment').textContent = `Paid: ${data.resp.result.hash}`;
  else $('payment').textContent = 'Payment failed';
});
