// Basic Service Worker required for PWA installation on iOS
self.addEventListener('fetch', function(event) {
    // This can be expanded for offline support later
    event.respondWith(fetch(event.request));
});
