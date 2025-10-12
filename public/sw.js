/* eslint-disable no-undef */
// Service Worker entry for GroupFeeder PWA.
// Uses Workbox CDN bundle to simplify common caching strategies.

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js')

if (typeof workbox !== 'undefined') {
  workbox.core.setCacheNameDetails({
    prefix: 'groupfeeder',
    suffix: 'v1',
  })

  workbox.core.skipWaiting()
  workbox.core.clientsClaim()

  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'document' ||
      request.destination === 'script' ||
      request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'groupfeeder-shell',
    }),
  )

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'groupfeeder-assets',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  )

  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'groupfeeder-api',
      networkTimeoutSeconds: 10,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  )
}

self.addEventListener('message', (event) => {
  if (!event.data || typeof event.data !== 'object') {
    return
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (event.data.type === 'UPDATE_BADGE') {
    const count = Number(event.data.count) || 0
    const registration = self.registration
    const workerNavigator = self.navigator

    if (registration && typeof registration.setAppBadge === 'function') {
      if (count > 0) {
        registration.setAppBadge(count).catch(() => {})
      } else {
        registration.clearAppBadge().catch(() => {})
      }
      return
    }

    if (workerNavigator && typeof workerNavigator.setAppBadge === 'function') {
      if (count > 0) {
        workerNavigator.setAppBadge(count).catch(() => {})
      } else if (typeof workerNavigator.clearAppBadge === 'function') {
        workerNavigator.clearAppBadge().catch(() => {})
      }
    }
  }
})
