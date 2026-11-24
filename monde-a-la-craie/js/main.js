// Le Monde à la craie : chargement, progression, passage d'un écran à l'autre.
import { chargerMonde } from './carte.js';
import { fiche, prochainSavoir } from './savoirs.js';
import { charger, sauver, cle, cleRecord, versPartage, depuisPartage } from './progres.js';
import { dansNiveau, niveauValide } from './niveaux.js';
import { ZONES_IDS, besoinEpreuve, nouvellesEtapes, tourFait, pourcentage, cleEpreuve, niveauOuvertContinent, prochainNiveau } from './regles.js';
import { histoire } from './histoire.js';
import { langue, choisirLangue } from './textes.js';
import { musique, pauseMusique } from './sons.js';
import { brancherSon } from './reglage-son.js';
import { brancherLecture } from './lecture.js';
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
// La musique de l'épreuve (ADR-008), un peu plus tendue, toujours douce.
const MUSIQUE_EPREUVE = 'epreuve';
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
    // La pause de Ludiworld : plus de musique ni de voix, et la manche en cours se met en pause (le chrono s'arrête).
    Ludi.onPause(() => { pauseMusique(true); globalThis.speechSynthesis?.cancel(); window.jeu?.app?.pauseLudi?.(); });
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
// La lecture à voix haute : on touche un texte pour l'entendre ; le réglage « Lecture » dit ce qui se lit de soi-même.
brancherLecture();
choisirLangue(etat.langue || langue);

// Tous les pays interrogés (« complet » : la part du monde connue).
const TOUS = monde.filter(f => f.properties.quiz).map(f => f.properties.code);
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
      if (!d.epreuve) Ludi.score('chrono-' + cleRecord(d.zone, d.niveau), Math.round(d.secondes * 10) / 10, { better: 'lower' });
      Ludi.checkpoint(d.epreuve ? 'fin-d-epreuve' : 'fin-de-manche');
    }
  },
  encoreUneManche() { return !finDuTemps; },
  pauseLudi: null,   // l'écran en cours met sa partie en pause quand Ludiworld le demande (la manche)

  // ---------- le tour du monde de Nina ----------
  partConnue() { return pourcentage(TOUS, etat.connus); },
  // L'épreuve d'un continent à un niveau : ouverte ou non, combien de pays connaître encore, la meilleure médaille.
  epreuve(zone, niveau) {
    if (!ZONES_IDS.includes(zone)) return null;   // pas d'épreuve sur le monde entier
    const codes = app.paysDeZone(zone, niveau).map(p => p.code), b = besoinEpreuve(codes, etat.connus);
    return { niveau, ouverte: b.manque === 0, manque: b.manque, besoin: b.besoin, faits: Math.min(b.faits, b.besoin), total: codes.length,
      medaille: etat.medailles[cleEpreuve(zone, niveau)] || null, niveauOuvert: niveauOuvertContinent(zone, niveau, etat.medailles, etat.voyage.etapes) };
  },
  // Le prochain but d'un continent : l'épreuve du premier niveau sans médaille (null quand les trois sont gagnées).
  but(zone) {
    const n = prochainNiveau(zone, etat.medailles, etat.voyage.etapes);
    return n ? app.epreuve(zone, n) : null;
  },
  // Une épreuve ouverte, pas encore réussie, dont le moment « l'épreuve est prête » n'a jamais été montré (ADR-008).
  annonceAFaire() {
    for (const z of ZONES_IDS) {
      const b = app.but(z);
      if (b && b.ouverte && !etat.voyage.annonces.includes(cleEpreuve(z, b.niveau))) return { zone: z, niveau: b.niveau };
    }
    return null;
  },
  // Le moment « l'épreuve est prête », en grande image. « Passer l'épreuve » la lance tout de suite.
  async annoncer(zone, niveau) {
    const k = cleEpreuve(zone, niveau);
    if (!etat.voyage.annonces.includes(k)) { etat.voyage.annonces.push(k); app.sauver(); }
    const e = app.epreuve(zone, niveau);
    const choix = await histoire('prete', { sansVideo: true, zone, langue, niveau, total: e.total, tampon: niveau === 'facile' });
    if (choix === 'go') { etat.niveaux[zone] = niveau; app.sauver(); app.aller('partie', zone, 'epreuve'); }
    return choix;
  },
  besoinEtape(zone) { return app.epreuve(zone, 'facile'); },
  // Ajoute au carnet les tampons gagnés. Rend les nouveaux tampons, et vrai si le tour du monde vient d'être fait.
  majVoyage() {
    const v = etat.voyage, nouvelles = nouvellesEtapes(etat.medailles, v.etapes);
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
  histoire(nom, zone) { return histoire(nom, { sansVideo: params.has('vite') || params.has('sansvideo'), zone, langue }); },

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
  // Le niveau choisi pour une zone. Sur un continent, seulement un niveau ouvert (sinon le prochain à réussir).
  niveau(zone) {
    const n = niveauValide(etat.niveaux[zone]);
    if (!ZONES_IDS.includes(zone) || niveauOuvertContinent(zone, n, etat.medailles, etat.voyage.etapes)) return n;
    return prochainNiveau(zone, etat.medailles, etat.voyage.etapes) || 'facile';
  },
  sauver() { sauver(joueur, etat); if (Ludi) Ludi.save(versPartage(etat)); },

  // Une carte neuve à chaque écran (ses gestes ne s'empilent pas sur ceux de l'écran d'avant).
  nouvelleCarte() {
    const ancien = document.getElementById('carte'), svg = ancien.cloneNode(false);
    ancien.replaceWith(svg);
    return svg;
  },

  aller(nom, zone, mode) {
    quitter();
    const hud = app.hud.cloneNode(false);   // sans les écouteurs de l'écran d'avant
    hud.classList.remove('mode-epreuve');   // le cadre doré n'appartient qu'à l'épreuve
    app.hud.replaceWith(hud);
    app.hud = hud;
    window.jeu.ecran = nom;
    musique(nom === 'partie' && mode === 'epreuve' ? MUSIQUE_EPREUVE : MUSIQUES[nom]);
    quitter = ECRANS[nom](app, zone, mode) || (() => {});
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
