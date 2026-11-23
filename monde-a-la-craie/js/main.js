// Le Monde à la craie : chargement, progression, passage d'un écran à l'autre.
import { chargerMonde } from './carte.js';
import { fiche, prochainSavoir } from './savoirs.js';
import { charger, sauver, cle, cleRecord, versPartage, depuisPartage } from './progres.js';
import { dansNiveau, niveauValide, niveauDe } from './niveaux.js';
import { ZONES_IDS, besoinEtape, nouvellesEtapes, tourFait, pourcentage } from './regles.js';
import { histoire } from './histoire.js';
import { langue, choisirLangue } from './textes.js';
import { musique, pauseMusique } from './sons.js';
import { brancherSon } from './reglage-son.js';
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

const ECRANS = { accueil, partie, decouvrir };
// La musique de chaque écran (l'histoire de Nina passe sur l'accueil : celle du voyage).
const MUSIQUES = { accueil: 'voyage', partie: 'manche', decouvrir: 'decouvrir' };
// Les savoirs sont un plus : sans eux (fichier absent), le jeu marche comme avant.
const [monde, savoirs] = await Promise.all([chargerMonde('data/monde.json'),
  fetch('data/savoirs.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}))]);
const savoirsVus = new Map();
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
    // La pause de Ludiworld : plus de musique ni de voix.
    Ludi.onPause(() => { pauseMusique(true); globalThis.speechSynthesis?.cancel(); });
  }
}
const dansLudi = !!(Ludi && Ludi.inLauncher());
const etat = charger(joueur);
// Une vieille sauvegarde gardait le son et la voix (coupés parfois) : on la réécrit sans eux, le son vient de Ludiworld.
try { const brut = JSON.parse(localStorage.getItem(cle(joueur)) || '{}'); if ('son' in brut || 'voix' in brut) sauver(joueur, etat); } catch { /* stockage bloqué */ }
if (Ludi) {
  // Une progression plus récente venue d'un autre appareil (par le compte du parent) remplace celle-ci, sauf les réglages de l'appareil.
  Ludi.onRestore(d => { if (depuisPartage(etat, d)) { sauver(joueur, etat); direEtat(); } });
  // Une progression d'avant ce changement : on la confie aussi à Ludiworld, sans écraser une plus récente venue d'ailleurs.
  if (etat.connus.size || Object.keys(etat.meilleurs).length) Ludi.save(versPartage(etat), { existante: true });
}
// Le son : musique, bruitages et voix, réglés par Ludiworld (ou sur cet appareil, ouvert seul). Tout est allumé au départ.
brancherSon();
choisirLangue(etat.langue || langue);

// Le tour du monde : les pays Facile de chaque continent (un tampon aux trois quarts), et tous les pays interrogés (« complet »).
const FACILES = Object.fromEntries(ZONES_IDS.map(z => [z, []]));
const TOUS = [];
for (const f of monde) {
  const p = f.properties;
  if (!p.quiz) continue;
  TOUS.push(p.code);
  if (niveauDe(p.code) === 'facile' && FACILES[p.zone]) FACILES[p.zone].push(p.code);
}
// Ce que le jeu dit à Ludiworld de sa progression : fini quand le tour du monde est fait, complet = la part du monde connue (tous niveaux).
function direEtat() {
  if (!Ludi) return;
  if (etat.voyage.fini) Ludi.fini();
  Ludi.complet(pourcentage(TOUS, etat.connus));
}
direEtat();

let quitter = () => {};
const app = {
  monde, savoirs, etat, joueur, rand, dansLudi,
  get langue() { return langue; },
  ecran: document.getElementById('ecran'),
  hud: document.getElementById('hud'),
  // Ce que le jeu dit à Ludiworld (et au kit, ouvert seul).
  evenement(nom, d) {
    if (nom === 'reglages') return reglagesAppli(d);
    if (!Ludi) return;
    if (nom === 'question') Ludi.skill('geographie.pays', proprietes.get(d.code).fr, d.premierCoup);
    if (nom === 'fin') {
      Ludi.progress('zone-' + d.zone, Math.round(d.pourcentage * 100));
      Ludi.score('chrono-' + cleRecord(d.zone, d.niveau), Math.round(d.secondes * 10) / 10, { better: 'lower' });
      Ludi.checkpoint('fin-de-manche');
    }
  },
  encoreUneManche() { return !finDuTemps; },

  // ---------- le tour du monde de Nina ----------
  partConnue() { return pourcentage(TOUS, etat.connus); },
  besoinEtape(zone) { return besoinEtape(FACILES[zone], etat.connus); },
  // Ajoute au carnet les tampons gagnés. Rend les nouveaux tampons, et vrai si le tour du monde vient d'être fait.
  majVoyage() {
    const v = etat.voyage, nouvelles = nouvellesEtapes(FACILES, etat.connus, v.etapes);
    v.etapes.push(...nouvelles);
    const finiMaintenant = !v.fini && tourFait(v.etapes);
    if (finiMaintenant) v.fini = true;
    if (nouvelles.length) app.sauver();
    direEtat();
    return { nouvelles, finiMaintenant };
  },
  // ?sanshistoire : les tests des autres écrans, sans l'intro ni la fin qui viennent toutes seules.
  histoireAuto: !params.has('sanshistoire'),
  tamponsNeufs: [],   // gagnés pendant une manche : l'accueil les tamponne en arrivant
  histoire(nom) { return histoire(nom, { sansVideo: params.has('vite') || params.has('sansvideo') }); },

  nom(code) { const p = proprietes.get(code); return p ? p[langue] : ''; },
  // Avec le pays de rattachement pour un territoire : « Groenland (Danemark) ».
  nomComplet(code) { const p = proprietes.get(code); return p ? (p.de ? `${p[langue]} (${p.de[langue]})` : p[langue]) : ''; },
  // Ce qu'on sait d'un pays (Découvrir), et un seul savoir à la fois après une erreur.
  fiche(code) { return fiche(savoirs, code, langue); },
  savoir(code) { return prochainSavoir(savoirs, code, langue, savoirsVus); },
  zoneDe(code) { const p = proprietes.get(code); return p && p.zone; },
  // Les pays interrogés d'une zone : tous, ou seulement ceux d'un niveau.
  paysDeZone(id, niveau = 'difficile') {
    return monde.filter(f => f.properties.quiz && (id === 'monde' || f.properties.zone === id) && dansNiveau(f.properties.code, niveau))
      .map(f => ({ code: f.properties.code, rang: f.properties.rang }));
  },
  niveau(zone) { return niveauValide(etat.niveaux[zone]); },
  sauver() { sauver(joueur, etat); if (Ludi) Ludi.save(versPartage(etat)); },

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
    musique(MUSIQUES[nom]);
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
