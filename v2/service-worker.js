const CACHE_NAME = 'game-vault-cabinet-v5';
const APP_SHELL = [
  './',
  './index.html',
  './cabinet.css',
  './bgg-images.js',
  './manifest.webmanifest',
  '../app-icon-192.png',
  '../app-icon-512.png',
  '../app-icon-maskable-512.png',
  '../green-t-rex.png',
  '../powered-by-bgg-rgb.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('game-vault-cabinet-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, {cache: 'no-store'});
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('./index.html');
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(networkFirst(event.request));
});
