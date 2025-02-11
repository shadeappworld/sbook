const CACHE_NAME = 'shade-book-cache-v13';
const FILES_TO_CACHE = [
    '/index.html',
    '/style.css',
    '/script.js'
];

// Install the service worker and cache files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching files...');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Intercept network requests and serve from cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Periodic background sync to trigger notifications
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'daily-task-reminder') {
        event.waitUntil(showDailyReminder());
    }
});

// Function to show a daily reminder
async function showDailyReminder() {
    const title = 'Shade Book Reminder';
    const options = {
        body: 'Don’t forget to check your tasks and notes today!',
        icon: '/yuh.jpg',
        badge: '/yuh.jpg'
    };
    self.registration.showNotification(title, options);
}
