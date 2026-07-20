// 🛠️ Service Worker - Çevrimdışı Çalışma ve Hızlı Yükleme Desteği
const CACHE_NAME = 'siparis-takip-erp-v13';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/db.js',
  './js/users.js',
  './js/orders.js',
  './js/cari.js',
  './js/bank.js',
  './js/stock.js',
  './js/app.js',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // 🚀 Firebase API isteklerini ve Google izleme piksellerini Service Worker dışı bırak (CORS ve bağlantı hatalarını önler)
  if (url.includes('firestore.googleapis.com') || url.includes('google.com') || url.includes('gstatic.com')) {
    return;
  }

  if (!url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // 🛡️ Yönlendirme (redirect) hatasını çözmek için 'event.request' yerine doğrudan 'event.request.url' stringi ile fetch yapıyoruz.
      // Bu sayede tarayıcı otomatik olarak 'redirect: follow' moduna geçer ve hata fırlatmaz.
      return fetch(event.request.url).then(response => {
        if (response.redirected) {
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
          });
        }
        return response;
      });
    }).catch(() => {
      return fetch(event.request.url);
    })
  );
});
