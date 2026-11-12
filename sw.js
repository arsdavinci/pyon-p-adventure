const CACHE_NAME = "pyon-p-adventure-v26";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./bgm.js",
  "./fx.js",
  "./story.js",
  "./chat.js",
  "./gimmicks.js",
  "./shop.js",
  "./handheld.js",
  "./manifest.json",
  "./assets/moonians-logo.png",
  "./assets/moonians-logo-English.png",
  "./assets/select-ui-generated2.png?v=select-ui-generated2-v2",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/gb-frame-top.webp",
  "./assets/gb-frame-mid.webp",
  "./assets/gb-frame-bot.webp",
  "./assets/gb-controls.webp",
  "./assets/gb-cap-a.webp",
  "./assets/gb-cap-b.webp",
  "./assets/gb-cap-x.webp",
  "./assets/gb-cap-y.webp",
  "./assets/gb-cap-dpad.webp",
  "./assets/gb-cap-select.webp",
  "./assets/gb-cap-start.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === location.origin && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".html") || url.pathname.endsWith("/"))) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const copy = response.clone();
        if (url.origin === location.origin && response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
