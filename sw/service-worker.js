// Filled in at build time with this build's exact files. See emberServiceWorker in vite.config.ts.
const CACHE = 'ember-__VERSION__'
const FILES = __FILES__

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// A new version waits here until the app says it's safe, so a session is never interrupted.
self.addEventListener('message', (event) => {
  if (event.data === 'apply-update') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  const target = request.mode === 'navigate' ? 'index.html' : request
  event.respondWith(caches.match(target, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)))
})
