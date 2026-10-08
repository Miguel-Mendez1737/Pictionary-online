// Service worker mínimo: permite instalar la app y abre la interfaz aunque la
// red falle un momento. Siempre intenta la red primero, así cada cambio del
// servidor llega de inmediato. El tiempo real (Socket.io) nunca pasa por aquí.
const CACHE = 'pictionary-v26';
const FLAGS = 'garabato-banderas-v1'; // caché aparte: sobrevive a las actualizaciones
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/avatar.js', '/basta.js', '/parchis.js', '/trivia.js', '/cartas.js', '/app-info.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FLAGS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/socket.io')) return;
  // Banderas: primero lo guardado en el celular (no cambian), si no, de internet.
  if (url.pathname.startsWith('/flags/')) {
    event.respondWith(
      caches.open(FLAGS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        // Solo las páginas usan la portada como respaldo; una imagen que falla se reintenta en la app.
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('/') : Response.error())))
  );
});
