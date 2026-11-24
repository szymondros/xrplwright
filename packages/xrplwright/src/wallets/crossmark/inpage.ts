/**
 * Runs in the page (via addInitScript) in place of the Crossmark extension's
 * content script. It must be self-contained: Playwright serializes it.
 * Every request is forwarded to the Node side through an exposed binding.
 */
export function crossmarkInpage(bindingName: string): void {
  const w = window as unknown as Record<string, any>;
  w.xrpl = Object.assign({}, w.xrpl, { isCrossmark: true });

  window.addEventListener('message', async (event: MessageEvent) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.type !== 'request' || typeof msg.command !== 'string' || !msg.id) return;

    let data: unknown;
    try {
      data = await w[bindingName](msg.command, msg.data ?? null);
    } catch (error) {
      data = {
        meta: { isSuccess: false, isRejected: false, isError: true },
        error: String(error),
      };
    }

    window.postMessage(
      // The SDK keys its session cache by `request.id`, so the request is echoed back.
      { app: msg.app, type: 'response', request: msg, response: { id: msg.id, type: 'response', data } },
      window.location.origin,
    );
  });
}
