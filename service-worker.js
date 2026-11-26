/* Creación CUPISSA: aplicación en línea, sin almacenar datos ni credenciales. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => new Response('<!doctype html><html lang="es"><meta name="viewport" content="width=device-width"><title>Creación CUPISSA</title><body><h2>Sin conexión</h2><p>Conéctate a Internet para crear productos.</p><button onclick="location.reload()">Reintentar</button></body></html>', {headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
