const SW_VERSION = "base25-pro-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
// Network remains the source of truth for live rankings and match records.
// Add carefully scoped offline caching later without serving stale competition data.
