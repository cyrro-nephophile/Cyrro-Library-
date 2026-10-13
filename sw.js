// Service worker: pemasangan ke layar utama, notifikasi push, dan klik notifikasi.
// Semua permintaan halaman tetap diteruskan ke jaringan (tanpa cache), jadi skor selalu terbaru.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){ e.respondWith(fetch(e.request)); });

self.addEventListener('push', function(e){
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(data.title || 'C-Library', {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: data.url || './index.html' }
  }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(self.clients.openWindow(url));
});
