var CACHE = "harmonium-v2";
var FILES = [
  "./",
  "index.html",
  "style.css",
  "notation.js",
  "app.js",
  "lessons.js",
  "learn.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) {
          return caches.delete(k);
        }
      }));
    })
  );
  self.clients.claim();
});

/* Network first, so updates show up.
   If offline, use the saved copy. */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") { return; }
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) {
        c.put(e.request, copy);
      });
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
