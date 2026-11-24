// Service worker des Défis de Barnabé : tout le jeu est gardé à l'installation, il se joue hors ligne.
// VERSION est l'empreinte des fichiers du jeu : node tools/version.js defis-de-barnabe la met à jour.
const VERSION = 'defis-de-barnabe-20d656e0ea';
const PERSOS = ['sage', 'enfant'];
const LIEUX = ['plage', 'port', 'dunes', 'rochers', 'cabanes', 'jetee', 'phare'];
const IMAGES = ['titre', 'titre-carre', 'carte', ...LIEUX.flatMap(l => [`fond-portrait-${l}`, `fond-paysage-${l}`]), 'histoire-1', 'histoire-2', 'histoire-fin', 'enfant-marche', 'enfant-pense', 'etoile', 'etoile-vide', 'bouteille',
  ...PERSOS, ...PERSOS.map(p => p + '-joie'), ...[1, 2, 3, 4, 5, 6, 7].map(n => 'medaille-' + n),
  ...['w', 'b'].flatMap(c => ['k', 'q', 'r', 'b', 'n', 'p'].map(t => c + t))];
const FICHIERS = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'ludi.js',
  'js/main.js', 'js/conseils.js', 'js/defis.js', 'js/echecs.js', 'js/exercice.js', 'js/lecons.js', 'js/plateau.js', 'js/sons.js', 'js/voix.js', 'js/reglage-son.js',
  'fonts/baloo2-500.woff2', 'fonts/baloo2-700.woff2', 'fonts/baloo2-800.woff2', 'fonts/lexend.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/favicon-64.png',
  ...IMAGES.map(n => `img/${n}.webp`),
  // La musique de la plage (le début) ; les autres se gardent quand on les entend.
  'musique/plage.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith('defis-de-barnabe-') && k !== VERSION).map(k => caches.delete(k))))
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
