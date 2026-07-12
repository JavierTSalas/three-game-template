// ponytail: pass-through service worker — exists so Android offers "install app";
// add real offline caching if we ever need it
self.addEventListener('fetch', () => {});
