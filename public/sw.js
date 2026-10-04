const CACHE_NAME = 'tavo-tv-v1'
const API_CACHE = 'tavo-tv-api-v1'

// Cache static assets on install
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only cache TV-related requests
  if (!url.pathname.startsWith('/tv/') && !url.pathname.startsWith('/api/tv/')) {
    return
  }

  // For API requests: stale-while-revalidate
  if (url.pathname.startsWith('/api/tv/data/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)

        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          })
          .catch(() => cached)

        return cached || fetchPromise
      }),
    )
    return
  }

  // For other TV assets: cache-first
  if (url.pathname.startsWith('/tv/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
            }
            return response
          })
        )
      }),
    )
  }
})
