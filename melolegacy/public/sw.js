const SHELL_CACHE = 'melolegacy-shell-v2';
const ASSET_CACHE = 'melolegacy-assets-v2';
const CACHE_PREFIX = 'melolegacy-';
const CORE_FILES = ['/', '/manifest.webmanifest', '/icon.svg'];
const MAX_CACHED_ASSETS = 80;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(CORE_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, ASSET_CACHE].includes(key))
          .map(key => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

async function trimAssetCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_ASSETS) return;
  await Promise.all(keys.slice(0, keys.length - MAX_CACHED_ASSETS).map(key => cache.delete(key)));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.pathname === '/') {
          await caches.open(SHELL_CACHE).then(cache => cache.put('/', response.clone()));
        }
        return response;
      } catch {
        return caches.match('/');
      }
    })());
    return;
  }

  // Vite emits content-hashed production bundles under /assets/. Cache these
  // immutable same-origin files so a previously opened app can start offline.
  if (url.pathname.startsWith('/assets/') &&
      ['script', 'style', 'worker', 'font', 'image'].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
        await trimAssetCache(cache);
      }
      return response;
    })());
  }
});
