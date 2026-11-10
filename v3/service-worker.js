const CACHE_NAME = 'game-vault-v3-arcade-v7';
const APP_SHELL = [
  './',
  './index.html',
  './cabinet.css',
  './bgg-images.js',
  './manifest.webmanifest',
  './assets/ui-icons.svg',
  './assets/logo-192.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/dinos/trex.png',
  './assets/dinos/velociraptor.png',
  './assets/dinos/ankylosaurus.png',
  './assets/dinos/brachiosaurus.png',
  './assets/dinos/pterodactyl.png',
  './assets/dinos/spinosaurus.png',
  './assets/dinos/stegosaurus.png',
  './assets/dinos/triceratops.png',
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
    await Promise.all(keys.filter(key => key.startsWith('game-vault-v3-')).filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
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
    if (request.mode === 'navigate') return caches.match('./index.html');
    return new Response('', {status: 504, statusText: 'Offline'});
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(event.request));
});
