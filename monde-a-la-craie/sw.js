// Service worker du Monde à la craie : tout le jeu est gardé à l'installation, il se joue hors ligne.
// VERSION est l'empreinte des fichiers du jeu : node tools/version.js la met à jour.
const VERSION = 'monde-a-la-craie-94e6ef1ef4';
const DRAPEAUX = [
  'ad', 'ae', 'af', 'ag', 'al', 'am', 'ao', 'ar', 'at', 'au', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj',
  'bn', 'bo', 'br', 'bs', 'bt', 'bw', 'by', 'bz', 'ca', 'cd', 'cf', 'cg', 'ch', 'ci', 'cl', 'cm', 'cn', 'co', 'cr', 'cu',
  'cv', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'er', 'es', 'et', 'fi', 'fj', 'fm', 'fr', 'ga',
  'gb', 'gd', 'ge', 'gh', 'gm', 'gn', 'gq', 'gr', 'gt', 'gw', 'gy', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'in', 'iq',
  'ir', 'is', 'it', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'kz', 'la', 'lb', 'lc', 'li',
  'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mr', 'mt', 'mu',
  'mv', 'mw', 'mx', 'my', 'mz', 'na', 'ne', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nz', 'om', 'pa', 'pe', 'pg', 'ph', 'pk',
  'pl', 'ps', 'pt', 'pw', 'py', 'qa', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm',
  'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sy', 'sz', 'td', 'tg', 'th', 'tj', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw',
  'tz', 'ua', 'ug', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vn', 'vu', 'ws', 'xk', 'ye', 'za', 'zm', 'zw',
];
const FICHIERS = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'ludi.js',
  'data/monde.json', 'data/savoirs.json',
  'lib/d3-array.min.js', 'lib/d3-geo.min.js', 'lib/topojson-client.min.js',
  'js/main.js', 'js/carte.js', 'js/zones.js', 'js/regles.js', 'js/progres.js', 'js/toucher.js', 'js/savoirs.js', 'js/niveaux.js',
  'js/textes.js', 'js/sons.js', 'js/voix.js', 'js/icones.js', 'js/reglage-son.js', 'js/lecture.js',
  'js/histoire.js', 'js/voyage.js',
  'js/ecrans/accueil.js', 'js/ecrans/partie.js', 'js/ecrans/decouvrir.js', 'js/ecrans/credits.js',
  'img/histoire/depart.webp', 'img/histoire/retour.webp', 'img/histoire/nina.webp',
  // L'arrivée de Nina sur chaque continent (le tampon de l'épreuve Facile).
  'img/histoire/etape-europe.webp', 'img/histoire/etape-afrique.webp', 'img/histoire/etape-asie.webp',
  'img/histoire/etape-amerique-nord.webp', 'img/histoire/etape-amerique-sud.webp', 'img/histoire/etape-oceanie.webp',
  // Le moment « l'épreuve est prête » de chaque continent (ADR-008).
  'img/histoire/prete-europe.webp', 'img/histoire/prete-afrique.webp', 'img/histoire/prete-asie.webp',
  'img/histoire/prete-amerique-nord.webp', 'img/histoire/prete-amerique-sud.webp', 'img/histoire/prete-oceanie.webp',
  'fonts/baloo2-500.woff2', 'fonts/baloo2-700.woff2', 'fonts/baloo2-800.woff2', 'fonts/lexend.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/favicon-64.png',
  // La musique (une par écran) : gardée pour jouer hors ligne.
  'musique/voyage.mp3', 'musique/manche.mp3', 'musique/decouvrir.mp3', 'musique/epreuve.mp3',
  // Les drapeaux de la note « Le savais-tu ? » (1,7 Mo) : sans eux, hors ligne, un pays jamais vu montrait une image cassée.
  ...DRAPEAUX.map(c => `img/drapeaux/${c}.svg`),
];

self.addEventListener('install', e => {
  // cache: 'reload' : des fichiers frais, jamais un mélange avec ceux gardés par le cache HTTP du navigateur.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  // Les petites vidéos de l'histoire : directement au réseau (lecture par morceaux), jamais gardées. Hors ligne, le jeu montre l'image.
  if (new URL(req.url).pathname.includes('/cine/')) return;
  e.respondWith(caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(rep => {
    if (rep.ok && new URL(req.url).pathname.startsWith(new URL('./', location).pathname)) c.put(req, rep.clone());
    return rep;
  }))));
});
