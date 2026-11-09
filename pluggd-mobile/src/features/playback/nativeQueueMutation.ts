// Share one mutation lane between UI and playback-service code in this JS
// runtime. Resolve network authority before entering it; a slow signer must
// never hold up a later pause or an unrelated public selection.
let tail: Promise<unknown> = Promise.resolve();

export function runNativeQueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = tail.then(operation, operation);
  tail = result.then(() => undefined, () => undefined);
  return result;
}
