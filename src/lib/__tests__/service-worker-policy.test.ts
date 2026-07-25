import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type FetchHandler = (event: {
  request: Request;
  respondWith: (response: Promise<unknown>) => void;
}) => void;

function loadFetchHandler() {
  const listeners = new Map<string, unknown>();
  const source = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
  const serviceWorker = {
    location: { origin: "https://nexrun.test" },
    addEventListener: (type: string, handler: unknown) => listeners.set(type, handler),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };

  runInNewContext(source, {
    self: serviceWorker,
    URL,
    caches: {
      open: vi.fn(),
      keys: vi.fn(),
      match: vi.fn(),
    },
    fetch: vi.fn(async () => ({ ok: false })),
    Promise,
  });

  const handler = listeners.get("fetch");
  if (typeof handler !== "function") throw new Error("Service worker fetch handler was not registered.");
  return handler as FetchHandler;
}

describe("service worker cache policy", () => {
  it("does not intercept private dashboard or RSC requests", () => {
    const handler = loadFetchHandler();
    const privateRespond = vi.fn();
    const rscRespond = vi.fn();

    handler({
      request: new Request("https://nexrun.test/dashboard", { headers: { Accept: "text/html" } }),
      respondWith: privateRespond,
    });
    handler({
      request: new Request("https://nexrun.test/events", { headers: { RSC: "1" } }),
      respondWith: rscRespond,
    });

    expect(privateRespond).not.toHaveBeenCalled();
    expect(rscRespond).not.toHaveBeenCalled();
  });

  it("keeps public navigation eligible for offline caching", () => {
    const handler = loadFetchHandler();
    const respondWith = vi.fn();

    handler({
      request: new Request("https://nexrun.test/events", { headers: { Accept: "text/html" } }),
      respondWith,
    });

    expect(respondWith).toHaveBeenCalledOnce();
  });
});
