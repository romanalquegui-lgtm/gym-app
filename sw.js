// ═══════════════════════════════════════════════════════════════════════
// Service Worker — Gym Tracker Pro v13
//
// Cachea la app (HTML, CSV, iconos) para que funcione sin conexión y
// cumpla los requisitos de instalación de Chrome en Android.
//
// v12: el timer YA NO depende de que este Service Worker le avise para
// completarse — eso era el bug real detrás de "a veces no suena / no
// finaliza" (ver el bloque de comentarios sobre el timer en el HTML).
// Aquí solo queda como aviso complementario de mejor esfuerzo (notificación
// nativa útil con la pantalla apagada). Se añade el mensaje PING: no hace
// nada por sí mismo, pero recibirlo reinicia el contador de inactividad
// que usa el navegador para decidir cuándo apagar este Service Worker.
//
// v13: sin cambios en este archivo salvo la versión de caché (el arreglo
// del cálculo de volumen/1RM es puramente de la app, en el HTML).
// ═══════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'gym-tracker-v13';
const CORE_ASSETS = [
    './index.html',
    './ejercicios.csv',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS))
            .catch(err => console.warn('No se pudo pre-cachear todo:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Estrategia: cache-first con actualización en segundo plano (stale-while-revalidate).
// Así la app abre al instante y offline, y se auto-actualiza cuando hay red.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetch(event.request).then(response => {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                }
                return response;
            }).catch(() => cached);
            return cached || network;
        })
    );
});

// ── Aviso de descanso terminado (complementario, de mejor esfuerzo) ────────
let timerTimeout = null;

self.addEventListener('message', (event) => {
    const { type, endTimestamp } = event.data || {};

    // No hace falta hacer nada: recibir CUALQUIER mensaje ya reinicia el
    // contador de inactividad del navegador para este Service Worker.
    if (type === 'PING') return;

    if (type === 'START_TIMER') {
        if (timerTimeout) clearTimeout(timerTimeout);
        const remaining = endTimestamp - Date.now();
        if (remaining <= 0) return;

        timerTimeout = setTimeout(async () => {
            try {
                await self.registration.showNotification('💪 Gym Tracker', {
                    body: '¡Descanso terminado! A por la siguiente serie.',
                    icon: 'icon-192.png',
                    badge: 'icon-192.png',
                    tag: 'gym-timer',
                    renotify: true,
                    requireInteraction: false,
                    vibrate: [200, 100, 200, 100, 400],
                    silent: false
                });
            } catch (e) {}

            const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
            clients.forEach(client => client.postMessage({ type: 'TIMER_DONE' }));
        }, remaining);
    }

    if (type === 'STOP_TIMER') {
        if (timerTimeout) { clearTimeout(timerTimeout); timerTimeout = null; }
    }
});
