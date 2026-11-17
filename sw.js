const CACHE_NAME = "pyon-p-adventure-v186";
// 絵・声は、公開のたびに消さない別の入れ物にとっておく（前は公開するたびに、遊ぶ人が全部ダウンロードし直していた）。
// 同じ名前で絵をさしかえても、下の「うらで新しいか聞く」しくみで、次に開いたときに新しい絵になる。
// ぜんぶ捨ててやり直したいときだけ、この番号を上げる
const ASSET_CACHE = "pyon-p-assets-v1";
// この起動中に、もう「新しいか」を聞いた絵（何度も聞かない）
const revalidated = new Set();
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./bgm.js",
  "./fx.js",
  "./voice.js",
  "./story.js",
  "./stagetalk.js",
  "./chat.js",
  "./tutorial.js",
  "./gimmicks.js",
  "./shop.js",
  "./lowres.js",
  "./settings.js",
  "./handheld.js",
  "./manifest.json",
  "./assets/moonians-logo.png",
  "./assets/moonians-logo-English.png",
  "./assets/m/moonians-logo.webp",
  "./assets/m/moonians-logo-English.webp",
  "./assets/m/select-ui-generated2.webp",
  "./assets/select-ui-generated2.png?v=select-ui-generated2-v2",
  "./assets/app-icon-192.png",
  "./assets/app-icon-512.png",
  "./assets/gb-frame-top.webp",
  "./assets/gb-frame-mid.webp",
  "./assets/gb-frame-bot.webp",
  "./assets/gb-controls.webp",
  "./assets/gb-land.webp",
  "./assets/gb-cap-a.webp",
  "./assets/gb-cap-b.webp",
  "./assets/gb-cap-x.webp",
  "./assets/gb-cap-y.webp",
  "./assets/gb-cap-dpad.webp",
  "./assets/gb-cap-select.webp",
  "./assets/gb-cap-start.webp",
  "./assets/avatar-pyonpy.webp"
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
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && key !== ASSET_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // 動画はキャッシュを通さない（iPhone は動画を少しずつ読みこむので、キャッシュから丸ごと返すと再生できない）
  if (url.pathname.endsWith(".mp4") || request.headers.has("range")) return;

  if (url.origin === location.origin && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".html") || url.pathname.endsWith(".json") || url.pathname.endsWith("/"))) {
    // ブラウザの一時保存（最大10分）も通さず、いつも最新をとりにいく
    // （声の一覧 manifest.json も。古い一覧のままだと、作り直した声が鳴らない）
    event.respondWith(
      fetch(request, { cache: "no-cache" }).then(response => {
        const copy = response.clone();
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // 絵・声：とってあればすぐ返す。うらで「新しくなった？」とだけ聞いて（変わっていなければ中身は送られてこない）、
  // 変わっていたら入れかえておく → 次に開いたときに新しい絵になる
  const sameOrigin = url.origin === location.origin;
  const refresh = () => fetch(request, { cache: "no-cache" }).then(response => {
    if (sameOrigin && response.ok) {
      const copy = response.clone();
      caches.open(ASSET_CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  });
  event.respondWith(
    caches.match(request).then(cached => {
      if (!cached) return refresh();
      if (sameOrigin && !revalidated.has(request.url)) {
        revalidated.add(request.url);
        event.waitUntil(refresh().catch(() => {}));
      }
      return cached;
    })
  );
});
