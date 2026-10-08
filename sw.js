/**
 * ========================================================================
 * SIMPEL-KU - SERVICE WORKER (PWA & OFFLINE CACHE)
 * BPS Provinsi Kalimantan Barat
 * ========================================================================
 */

const CACHE_NAME = 'simpelku-pwa-v3.1';
const STATIC_ASSETS = [
  './',
  'manifest.json',
  'img/logo_BPS.png',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable.png',
  'img/apple-touch-icon.png'
];

// Install: Cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Beberapa asset statis gagal dicache saat install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Menghapus cache usang:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// 1. Google Apps Script API calls -> Network Only (data live, jangan dicache di SW)
// 2. Navigasi HTML -> Network First with Cache Fallback
// 3. Asset Statis (Font, CDN, Gambar) -> Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass Google Apps Script & Google Drive requests (selalu live ke server)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('script.googleusercontent.com') ||
      url.hostname.includes('google.com') ||
      request.method !== 'GET') {
    return;
  }

  // Permintaan navigasi dokumen utama (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match('./');
        })
    );
    return;
  }

  // Asset Statis (Gambar, CDN Fonts/Icons) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
