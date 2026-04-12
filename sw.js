// ═══════════════════════════════════════════
// NEXUS Service Worker — Offline + Cache
// ═══════════════════════════════════════════
const CACHE_NAME = 'nexus-v2.0';
const FIREBASE_HOSTS = ['firebasejs', 'googleapis.com', 'gstatic.com'];

// Assets to precache on install
const PRECACHE = [
  '/',
  '/index.html',
  '/nexus.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: cache core assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first for Firebase, Cache-first for static ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase, Fonts, Google APIs → always network (no cache)
  if(FIREBASE_HOSTS.some(h => url.includes(h))) {
    event.respondWith(fetch(event.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Static assets → cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(!response || response.status !== 200 || response.type === 'opaque') return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => caches.match('/index.html')); // fallback to app shell
    })
  );
});

// ── Background Sync: retry failed Firestore writes ──
self.addEventListener('sync', event => {
  if(event.tag === 'nexus-sync') {
    // Firestore handles its own offline queue — just notify
    console.log('[SW] Background sync triggered');
  }
});

// ── Push Notifications ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'NEXUS', {
      body: data.body || 'You have a new reminder',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'nexus',
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: '✓ Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if(event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for(const client of cls) {
        if(client.url.includes(self.location.origin) && 'focus' in client)
          return client.focus();
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
