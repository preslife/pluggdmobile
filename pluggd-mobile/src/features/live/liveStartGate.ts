/** Join success alone does not prove that a host is sending media. */
export function createLiveStartGate(options: {
  needsVideo: boolean;
  confirm: () => Promise<void>;
  onReady: () => void;
  onError: () => void;
}) {
  let joined = false;
  let audio = false;
  let video = false;
  let confirmed = false;
  let confirming = false;
  let disposed = false;

  const check = async () => {
    if (disposed || !joined) return;
    if (confirmed) { options.onReady(); return; }
    if (confirming || !audio || (options.needsVideo && !video)) return;
    confirming = true;
    try {
      await options.confirm();
      if (disposed) return;
      confirmed = true;
      if (joined) options.onReady();
    } catch {
      if (!disposed) options.onError();
    } finally {
      confirming = false;
    }
  };

  return {
    joined() { joined = true; void check(); },
    audioPublished(published: boolean) { audio = published; void check(); },
    videoPublished(published: boolean) { video = published; void check(); },
    disconnected() { joined = false; audio = false; video = false; },
    dispose() { disposed = true; },
  };
}
