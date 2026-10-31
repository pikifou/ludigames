// Le Monde à la craie : chargement, progression, passage d'un écran à l'autre.
import { chargerMonde } from './carte.js';
import { charger, sauver } from './progres.js';
import { langue } from './textes.js';
import { sonActif } from './sons.js';
import { t } from './textes.js';
import { accueil } from './ecrans/accueil.js';
import { partie } from './ecrans/partie.js';
import { decouvrir } from './ecrans/decouvrir.js';

const params = new URLSearchParams(location.search);

// ?graine=n : tirages reproductibles (tests) ; ?vite : sans animations (tests).
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const rand = params.has('graine') ? mulberry32(+params.get('graine')) : Math.random;
if (params.has('vite')) document.documentElement.classList.add('vite');
document.documentElement.lang = langue;

const ECRANS = { accueil, partie, decouvrir };
const monde = await chargerMonde('data/monde.json');
const proprietes = new Map(monde.map(f => [f.properties.code, f.properties]));
// Ludiworld : le kit, et le prénom de l'enfant (il arrive juste après le démarrage, par un message de Ludiworld).
const Ludi = window.Ludi;
let joueur = null, finDuTemps = false;
if (Ludi) {
  Ludi.init({ game: 'monde-a-la-craie' });
  if (Ludi.inLauncher()) {
    document.documentElement.classList.add('dans-ludi');
    for (let i = 0; i < 20 && !Ludi.player(); i++) await new Promise(r => setTimeout(r, 50));
    joueur = Ludi.player() ? Ludi.player().name : null;
    Ludi.onWrapUp(minutes => { if (minutes === 0) finDuTemps = true; });   // c'est l'heure : pas de nouvelle manche
  }
}
const dansLudi = !!(Ludi && Ludi.inLauncher());
const etat = charger(joueur);
sonActif(etat.son);

let quitter = () => {};
const app = {
  monde, etat, joueur, langue, rand,
  ecran: document.getElementById('ecran'),
  hud: document.getElementById('hud'),
  // Ce que le jeu dit à Ludiworld (et au kit, ouvert seul).
  evenement(nom, d) {
    if (nom === 'reglages') return reglagesAppli(d);
    if (!Ludi) return;
    if (nom === 'question') Ludi.skill('geographie.pays', proprietes.get(d.code).fr, d.premierCoup);
    if (nom === 'fin') {
      Ludi.progress('zone-' + d.zone, Math.round(d.pourcentage * 100));
      Ludi.score('chrono-' + d.zone, Math.round(d.secondes * 10) / 10, { better: 'lower' });
      Ludi.checkpoint('fin-de-manche');
    }
  },
  encoreUneManche() { return !finDuTemps; },

  nom(code) { const p = proprietes.get(code); return p ? p[langue] : ''; },
  // Avec le pays de rattachement pour un territoire : « Groenland (Danemark) ».
  nomComplet(code) { const p = proprietes.get(code); return p ? (p.de ? `${p[langue]} (${p.de[langue]})` : p[langue]) : ''; },
  zoneDe(code) { const p = proprietes.get(code); return p && p.zone; },
  paysDeZone(id) {
    return monde.filter(f => f.properties.quiz && (id === 'monde' || f.properties.zone === id))
      .map(f => ({ code: f.properties.code, rang: f.properties.rang }));
  },
  sauver() { sauver(joueur, etat); },

  // Une carte neuve à chaque écran (ses gestes ne s'empilent pas sur ceux de l'écran d'avant).
  nouvelleCarte() {
    const ancien = document.getElementById('carte'), svg = ancien.cloneNode(false);
    ancien.replaceWith(svg);
    return svg;
  },

  aller(nom, zone) {
    quitter();
    const hud = app.hud.cloneNode(false);   // sans les écouteurs de l'écran d'avant
    app.hud.replaceWith(hud);
    app.hud = hud;
    window.jeu.ecran = nom;
    quitter = ECRANS[nom](app, zone) || (() => {});
  },
};

// Ouvert seul : plein écran et installation dans les réglages. Dans Ludiworld, c'est Ludiworld qui décide.
let installation = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installation = e; });
function reglagesAppli(conteneur) {
  if (dansLudi || !conteneur) return;
  if (document.fullscreenEnabled) conteneur.insertAdjacentHTML('beforeend', `<button class="bouton-craie" data-action="plein-ecran">${t('pleinEcran')}</button>`);
  if (installation) conteneur.insertAdjacentHTML('beforeend', `<button class="bouton-craie" data-action="installer">${t('installer')}</button>`);
  conteneur.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.action;
    if (a === 'plein-ecran') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
    if (a === 'installer' && installation) { installation.prompt(); installation = null; e.target.remove(); }
  });
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

window.jeu = { app, pret: false };
// La police de craie d'abord : la place des noms se mesure avec elle.
try { await Promise.all([document.fonts.load('800 20px "Baloo 2"'), document.fonts.load('700 20px "Baloo 2"')]); } catch { /* police absente : tant pis */ }
app.aller('accueil');
window.jeu.pret = true;
