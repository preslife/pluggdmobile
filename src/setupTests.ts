import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const noop = () => {};

if (typeof window !== "undefined") {
  (window as any).ResizeObserver = ResizeObserverMock;
}

if (typeof globalThis !== "undefined" && typeof globalThis.HTMLMediaElement !== "undefined") {
  const mediaProto = globalThis.HTMLMediaElement.prototype as HTMLMediaElement;

  Object.defineProperty(mediaProto, "load", {
    configurable: true,
    writable: true,
    value: noop,
  });

  Object.defineProperty(mediaProto, "play", {
    configurable: true,
    writable: true,
    value: () => Promise.resolve(),
  });

  Object.defineProperty(mediaProto, "pause", {
    configurable: true,
    writable: true,
    value: noop,
  });

  Object.defineProperty(mediaProto, "addTextTrack", {
    configurable: true,
    writable: true,
    value: () => ({
      mode: "disabled",
      addCue: noop,
      removeCue: noop,
    }),
  });

  Object.defineProperty(mediaProto, "canPlayType", {
    configurable: true,
    writable: true,
    value: () => "probably",
  });
}
