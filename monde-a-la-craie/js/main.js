// Le Monde à la craie : chargement, progression, passage d'un écran à l'autre.
import { chargerMonde } from './carte.js';
import { charger, sauver } from './progres.js';
import { langue } from './textes.js';
import { sonActif } from './sons.js';
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
const joueur = null;
const etat = charger(joueur);
sonActif(etat.son);

let quitter = () => {};
const app = {
  monde, etat, joueur, langue, rand,
  ecran: document.getElementById('ecran'),
  hud: document.getElementById('hud'),
  evenement() {},

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

window.jeu = { app, pret: false };
// La police de craie d'abord : la place des noms se mesure avec elle.
try { await Promise.all([document.fonts.load('800 20px "Baloo 2"'), document.fonts.load('700 20px "Baloo 2"')]); } catch { /* police absente : tant pis */ }
app.aller('accueil');
window.jeu.pret = true;
