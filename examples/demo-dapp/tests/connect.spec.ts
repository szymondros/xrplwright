import { expect, test } from '../fixtures';

test('connects and signs the sign-in challenge', async ({ dapp, wallet }) => {
  await dapp.connect();

  await expect(dapp.account()).toHaveText(`Connected: ${wallet.address}`);

  // The dapp asked for a SignIn, then for a signature over its challenge.
  const challenge = await wallet.waitForRequest((r) => r.command === 'sign' && !!r.data?.hex);
  expect(Buffer.from(challenge.data!.hex!, 'hex').toString('utf8')).toBe(`Sign in to Demo dapp: ${wallet.address}`);
});

test('a rejected connection leaves the user signed out', async ({ dapp, wallet }) => {
  wallet.rejectNext();
  await dapp.connect();

  await expect(dapp.account()).toHaveText('Connection rejected');
  await expect(dapp.page.getByRole('button', { name: 'Send' })).toBeDisabled();
});

test('a rejected challenge signature leaves the user signed out', async ({ dapp, wallet }) => {
  wallet.approveNext(); // the connection
  wallet.rejectNext(); //  the challenge signature
  await dapp.connect();

  await expect(dapp.account()).toHaveText('Signature rejected');
});
