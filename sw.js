const CACHE_NAME = 'semia-capture-v3';
const ASSETS = [
    './capture.html',
    './style.css',
    './capture.js',
    './capture-stt-parakeet.js',
    './capture-stt.js',
    './capture-stt-whisper.js',
    './capture-stt-wlk.js',
    './capture-stt-simple.js',
    './capture-storage.js',
    './capture-lucide.js',
    './lucide.min.js',
    './EBML.min.js',
    './vosk.js',
    './whisper-worker.js',
    './favicon.svg',
    './ai/ai-utils.js',
    './ai/ai-providers.js',
    './ai/ai-minutes.js',
    './icons/icon48.png',
    './icons/icon128.png',
    './icons/icon512.png'
];

self.addEventListener('install', (event) => {
    console.log('[SW] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching assets...');
            return Promise.all(
                ASSETS.map(url => {
                    return cache.add(url).catch(err => console.warn(`[SW] Échec du cache pour ${url}:`, err));
                })
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activation...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./capture.html');
                }
            });
        })
    );
});
