/* Service worker de FarmaSys: permite instalar la web como app y abrirla rápido.
   La API nunca se cachea (siempre red). Si no hay red, se muestra la última carcasa guardada. */
const VERSION = 'farmasys-v2';
const CARCASA = ['/', '/manifest.webmanifest', '/icono.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CARCASA).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); return resp; })));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((resp) => { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put('/', copia)); return resp; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
