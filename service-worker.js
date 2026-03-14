// service-worker.js - Epic Converter LUAN ⚡
const CACHE_NAME = 'luan-converter-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
  // Agrega './logo.png' cuando tengas el archivo
];

const API_URLS = [
  'https://ve.dolarapi.com/v1/dolares',
  'https://open.er-api.com/v6/latest/EUR'
];

// 📦 INSTALACIÓN: Cachea archivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 🧹 ACTIVACIÓN: Limpia cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('🗑️ Eliminando caché vieja:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 🌐 FETCH: Estrategia híbrida inteligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 🔹 APIs de tasas: Network-first con fallback a caché (datos frescos)
  if (API_URLS.some(api => request.url.includes(api))) {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          // Si hay respuesta nueva, actualiza caché
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          return networkRes;
        })
        .catch(() => {
          // Si no hay red, devuelve lo último cacheado
          return caches.match(request);
        })
    );
    return;
  }

  // 🔹 Assets estáticos: Cache-first (rápido y offline)
  if (request.destination === 'image' || 
      request.url.endsWith('.css') || 
      request.url.endsWith('.js')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // 🔹 Navegación HTML: Stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkRes) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkRes.clone()));
          return networkRes;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 🔹 Default: Intenta red, fallback a caché
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// 🔔 Notificación de actualización disponible (opcional)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
