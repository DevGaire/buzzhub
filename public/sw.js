// BuzzHub service worker.
//
// Two jobs:
// 1. Web Push — show a notification on push, focus/navigate on click.
// 2. PWA shell — cache the offline page and upload-CDN media with a
//    stale-while-revalidate strategy. API calls and HTML responses are
//    always network-first so the user never sees stale auth or feed data.

const CACHE_VERSION = "v2";
const SHELL_CACHE = `buzzhub-shell-${CACHE_VERSION}`;
const MEDIA_CACHE = `buzzhub-media-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort: a 404 on /offline shouldn't block install.
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch(() => {}),
        ),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              (k.startsWith("buzzhub-shell-") && k !== SHELL_CACHE) ||
              (k.startsWith("buzzhub-media-") && k !== MEDIA_CACHE),
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle same-origin and our upload CDN. Everything else (Stream,
  // Google, etc.) bypasses the SW entirely.
  const isSelf = url.origin === self.location.origin;
  const isUtfs =
    url.hostname === "utfs.io" || url.hostname.endsWith(".ufs.sh");

  if (!isSelf && !isUtfs) return;

  // Never cache API responses or auth flows — they're per-user and
  // can leak data across sessions if cached.
  if (isSelf && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/login") || url.pathname.startsWith("/signup"))) {
    return;
  }

  // Uploaded media: stale-while-revalidate. The CDN already sets long
  // cache headers, but holding our own copy means an installed PWA opens
  // instantly while the network revalidates in the background.
  if (isUtfs) {
    event.respondWith(swr(MEDIA_CACHE, req));
    return;
  }

  // HTML pages: network-first, fall back to /offline on outright failure.
  if (req.mode === "navigate") {
    event.respondWith(networkFirstThenOffline(req));
    return;
  }

  // Static assets (CSS/JS/icons) from our origin: SWR.
  if (
    req.destination === "style" ||
    req.destination === "script" ||
    req.destination === "image" ||
    req.destination === "font"
  ) {
    event.respondWith(swr(SHELL_CACHE, req));
  }
});

async function swr(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.status === 200 && res.type !== "opaque") {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function networkFirstThenOffline(req) {
  try {
    const res = await fetch(req);
    return res;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match("/offline");
    return offline || new Response("Offline", { status: 503 });
  }
}

/* ── Web Push (unchanged from v1) ─────────────────────────────── */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "BuzzHub", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "BuzzHub";
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
