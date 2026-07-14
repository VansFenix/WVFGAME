const CACHE = 'wvf-v2';

const BASE = self.location.pathname.replace(/\/sw\.js$/, '') || '';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      BASE + '/',
      BASE + '/index.html',
      BASE + '/manifest.json'
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
<<<<<<< HEAD
=======
  // Network-first for HTML, cache-first for static assets
>>>>>>> 2ff553607ce340620ac49c6fc9e8c358ccefc76f
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
<<<<<<< HEAD
      fetch(e.request).catch(() => caches.match(BASE + '/index.html'))
=======
      fetch(e.request).catch(() => caches.match(BASE + '/'))
>>>>>>> 2ff553607ce340620ac49c6fc9e8c358ccefc76f
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
