/**
 * Runs in the page (via addInitScript) in place of the GemWallet extension's
 * content script. It must be self-contained: Playwright serializes it.
 * Every request is forwarded to the Node side through an exposed binding.
 */
export function gemWalletInpage(bindingName: string): void {
  const w = window as unknown as Record<string, any>;
  // @gemwallet/api refuses every call but `isInstalled()` until this flag is set.
  w.gemWallet = true;

  window.addEventListener('message', async (event: MessageEvent) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== 'GEM_WALLET_MSG_REQUEST' || typeof msg.type !== 'string') return;

    let response: Record<string, unknown>;
    try {
      response = await w[bindingName](msg.type, msg.payload ?? null);
    } catch (error) {
      response = { error: { name: 'Error', message: String(error) } };
    }

    // `messagedId` (sic) is the name @gemwallet/api matches responses by.
    window.postMessage(
      { source: 'GEM_WALLET_MSG_RESPONSE', messagedId: msg.messageId, ...response },
      window.location.origin,
    );
  });
}
