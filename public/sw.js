/* Service worker: guarda la app en el teléfono para que abra sin internet.
   Sube el número de versión cada vez que cambies index.html. */
const VERSION = 'gp-ventas-v4';
const BASICOS = [
  './',
  './index.html',
  './manifest.json',
  './lib/jsQR.js',
  './lib/qrcode.js',
  './lib/jszip.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.allSettled(BASICOS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Firestore y Google manejan su propio almacenamiento sin conexión: no interceptar.
  if (e.request.method !== 'GET' ||
      url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('firebaseinstallations')) return;

  e.respondWith(
    caches.match(e.request).then(guardado => {
      const red = fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(e.request, copia));
        }
        return r;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
