// NexRun Service Worker — offline-capable caching
const CACHE_VERSION = "v4";
const STATIC_CACHE = `nexrun-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `nexrun-runtime-${CACHE_VERSION}`;

const PUBLIC_RUNTIME_PREFIXES = [
  "/events",
  "/become-organizer",
  "/privacy",
  "/terms",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/",
];

function isPublicRuntimePath(pathname) {
  return pathname === "/" || PUBLIC_RUNTIME_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/events",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and API/tRPC requests
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Static Next.js assets: cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Never persist authenticated, account-specific, verification, order, or
  // RSC responses. Private routes remain network-only and are handled by the
  // browser without service-worker interception.
  if (!isPublicRuntimePath(url.pathname) || request.headers.get("RSC") === "1") {
    return;
  }

  // Public HTML navigation pages: network-first, then cache/offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match("/offline.html"))
        )
    );
    return;
  }

  // Everything else: network-first with runtime cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
