// Service worker du Monde à la craie : tout le jeu est gardé à l'installation, il se joue hors ligne.
// VERSION est l'empreinte des fichiers du jeu : node tools/version.js la met à jour.
const VERSION = 'monde-a-la-craie-52e04b97b0';
const FICHIERS = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'ludi.js',
  'data/monde.json',
  'lib/d3-array.min.js', 'lib/d3-geo.min.js', 'lib/topojson-client.min.js',
  'js/main.js', 'js/carte.js', 'js/zones.js', 'js/regles.js', 'js/progres.js', 'js/toucher.js',
  'js/textes.js', 'js/sons.js', 'js/voix.js', 'js/icones.js',
  'js/ecrans/accueil.js', 'js/ecrans/partie.js', 'js/ecrans/decouvrir.js',
  'fonts/baloo2-500.woff2', 'fonts/baloo2-700.woff2', 'fonts/baloo2-800.woff2', 'fonts/lexend.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/favicon-64.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('monde-a-la-craie-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// D'abord le cache (le jeu démarre tout de suite, même sans réseau), sinon le réseau.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(rep => {
    if (rep.ok && new URL(req.url).pathname.startsWith(new URL('./', location).pathname)) c.put(req, rep.clone());
    return rep;
  }))));
});
