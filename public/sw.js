/* Service worker: guarda la app en el teléfono para que abra sin internet.
   Sube el número de versión cada vez que cambies index.html. */
const VERSION = 'gp-ventas-v52';
const BASICOS = [
  './',
  './index.html',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
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
  const req = e.request;
  const url = req.url;
  // Firestore y Google manejan su propio almacenamiento sin conexión: no interceptar.
  if (req.method !== 'GET' ||
      url.includes('firestore.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('firebaseinstallations')) return;

  // El HTML, el JS y el CSS se piden a la red primero, así una versión nueva
  // llega en la primera recarga (antes tardaba dos). Si no hay red, se usa la copia.
  const esCodigo = req.mode === 'navigate' ||
    /\.(?:html|js|css)(?:\?|$)/.test(url);

  if (esCodigo) {
    e.respondWith(
      fetch(req).then(r => {
        if (r && r.status === 200) {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => caches.match(req).then(g => g || caches.match('./index.html')))
    );
    return;
  }

  // El resto (iconos, imágenes, fuentes): copia primero, y se actualiza de fondo.
  e.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(r => {
        if (r && r.status === 200) {
          const copia = r.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return r;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
