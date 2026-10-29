
const VERSION = 'mychat-v6';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

const CDN_HOSTS = new Set([
  'esm.run',
  'cdn.jsdelivr.net'
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);

    // Save each main app file when available.
    // One missing file won't prevent the others from being saved.
    await Promise.all(APP_FILES.map(async file => {
      try {
        await cache.add(file);
      } catch (error) {
        // The file can be downloaded on a later visit.
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);

    for (const name of await caches.keys()) {
      if (name.startsWith('mychat-') && !keep.has(name)) {
        await caches.delete(name);
      }
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isCDN = CDN_HOSTS.has(url.hostname);

  // Ignore unrelated websites and API requests.
  if (!sameOrigin && !isCDN) return;

  // Handle normal app pages and files, not arbitrary data requests.
  const isPage = request.mode === 'navigate';
  const isAppAsset = sameOrigin && (
    isPage ||
    ['script', 'style', 'image', 'font', 'manifest', 'worker']
      .includes(request.destination)
  );

  // Cache CDN resources used by the app.
  const isCDNAsset = isCDN;

  if (!isAppAsset && !isCDNAsset) return;

  event.respondWith((async () => {
    const cacheName = sameOrigin ? SHELL_CACHE : RUNTIME_CACHE;
    const cache = await caches.open(cacheName);

    // For app pages, prefer the newest version from the internet.
    if (isPage) {
      try {
        const response = await fetch(request);

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return (
          await cache.match(request) ||
          await cache.match('./index.html') ||
          await cache.match('./')
        ) || Response.error();
      }
    }

    // For other resources, use saved copies first.
    const saved = await cache.match(request);
    if (saved) return saved;

    try {
      const response = await fetch(request);

      if (response.ok && response.type !== 'opaque') {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
