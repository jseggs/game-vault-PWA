// The original Game Vault (served from this folder) has been retired in favour of v3/.
// Devices that installed it still have its offline worker. This replacement deletes the
// old cache, removes itself, and reloads any open page so it reaches the redirect to v3/.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('game-vault-dx-')).map(key => caches.delete(key)));
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    await Promise.all(windows.map(client => client.navigate(client.url).catch(() => null)));
    await self.registration.unregister();
  })());
});
