// Les Défis de Barnabé : fabrique les positions des défis, vérifiées par le moteur du jeu.
// node tools/defis.js  →  defis-de-barnabe/js/defis.js (toujours le même résultat : le hasard est réglé).
//
// Deux sortes de positions :
// - « simples » : peu de pièces, posées au hasard puis gardées seulement si elles ont la bonne forme ;
// - « de partie » : tirées de parties jouées par le moteur depuis le début, pour mettre l'enfant face à de vraies situations.
import { writeFileSync } from 'node:fs';
import { depuisFen, versFen, jouer, coupsLegaux, etat, enEchec, attaquee, type, couleur, VALEUR, choisirCoup } from '../defis-de-barnabe/js/echecs.js';
import { notePrise, fourchette, menaceDeMat } from '../defis-de-barnabe/js/exercice.js';
import { juger } from './juge-defis.js';

// ---------- Le hasard réglé ----------
let graine = 20261123;
const alea = () => { graine |= 0; graine = (graine + 0x6d2b79f5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const entre = (a, b) => a + Math.floor(alea() * (b - a + 1));
const parmi = l => l[Math.floor(alea() * l.length)];

// ---------- Les outils ----------
const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const noirs = pos => pos.b.map((p, i) => (p && couleur(p) === 'b' ? i : -1)).filter(i => i >= 0);
const blancs = pos => pos.b.map((p, i) => (p && couleur(p) === 'w' ? i : -1)).filter(i => i >= 0);
const voisins = (a, b) => Math.abs((a & 7) - (b & 7)) <= 1 && Math.abs((a >> 3) - (b >> 3)) <= 1;
const contre = (pos, couleurAdverse) => ({ ...pos, trait: couleurAdverse, ep: null });
const matEnUn = pos => coupsLegaux(pos).filter(m => etat(jouer(pos, m)) === 'mat');
const meilleuresPrises = pos => {
  const c = coupsLegaux(pos).filter(m => m.prise);
  if (!c.length) return { best: -Infinity, coups: [] };
  const best = Math.max(...c.map(m => notePrise(pos, m)));
  return { best, coups: c.filter(m => notePrise(pos, m) === best) };
};
// Une position « propre » : les blancs ont le trait, personne n'est en échec (sauf si on le veut), les noirs ne pourraient pas prendre le roi.
function propre(pos, { echecOk = false } = {}) {
  if (!echecOk && enEchec(pos, 'w')) return false;
  if (enEchec(pos, 'b')) return false;
  if (etat(pos) !== 'normal' && etat(pos) !== 'echec') return false;
  return true;
}

// Pose des pièces au hasard : { w: ['K', 'R'], b: ['k', 'n'] }, avec des contraintes de case facultatives.
function poser(pieces, contraintes = {}) {
  for (let essai = 0; essai < 200; essai++) {
    const b = new Array(64).fill(null);
    let ok = true;
    for (const p of [...pieces.w, ...pieces.b]) {
      const zone = contraintes[p] || null;
      let sq, n = 0;
      do { sq = zone ? parmi(zone) : entre(0, 63); n++; } while ((b[sq] || (type(p) === 'p' && (sq < 8 || sq > 55))) && n < 50);
      if (b[sq]) { ok = false; break; }
      b[sq] = p;
    }
    if (!ok) continue;
    const K = b.indexOf('K'), k = b.indexOf('k');
    if (K >= 0 && k >= 0 && voisins(K, k)) continue;
    return { b, trait: 'w', roques: '', ep: null };
  }
  return null;
}

// Des positions de vraies parties : le moteur joue les deux camps, un peu au hasard.
function positionsDeParties(n, plies = [8, 44]) {
  const out = [];
  for (let g = 0; g < n; g++) {
    let pos = depuisFen(DEPART);
    const niveauB = { prof: 1, hasard: 0.3, bruit: 140 }, niveauN = { prof: 1, hasard: 0.45, bruit: 160 };
    const fin = entre(plies[0], plies[1]);
    for (let i = 0; i < fin && etat(pos) !== 'mat' && etat(pos) !== 'pat'; i++) {
      const m = choisirCoup(pos, pos.trait === 'w' ? niveauB : niveauN, alea);
      if (!m) break;
      pos = jouer(pos, m.promo ? { ...m, promo: pos.trait === 'w' ? 'Q' : 'q' } : m);
      if (pos.trait === 'w' && i >= plies[0] - 1) out.push({ pos, partie: g });
    }
  }
  return out;
}

// Garde les positions qui passent le test, une par partie au plus, et les trie de la plus simple à la plus chargée.
function choisir(cands, test, n, cle = x => x) {
  const vus = new Set(), parties = new Set(), out = [];
  for (const c of cands) {
    if (out.length >= n * 4) break;
    const pos = c.pos || c;
    if (c.partie !== undefined && parties.has(c.partie)) continue;
    const fen = versFen(pos);
    if (vus.has(fen)) continue;
    const r = test(pos);
    if (!r) continue;
    vus.add(fen); if (c.partie !== undefined) parties.add(c.partie);
    out.push({ fen, ...r, _n: pos.b.filter(Boolean).length + coupsLegaux(pos).length / 10 });
  }
  if (out.length < n) throw new Error(`pas assez de positions : ${out.length} / ${n}`);
  // Un échantillon régulier, du plus simple au plus chargé.
  out.sort((a, b) => a._n - b._n);
  const pris = Array.from({ length: n }, (_, i) => out[Math.round(i * (out.length - 1) / Math.max(1, n - 1))]);
  return pris.map(({ _n, ...x }) => cle(x));
}

function simples(fabrique, test, n, essais = 60000) {
  const cands = [];
  for (let i = 0; i < essais && cands.length < n * 6; i++) {
    const pos = fabrique();
    if (pos && test(pos)) cands.push(pos);
  }
  return choisir(cands, test, n);
}

// ---------- L'arbitre ----------
// Une forme ne suffit pas : le coup demandé doit aussi être un bon coup (tools/juge-defis.js).
// Sans ça, on demandait de prendre un cavalier pendant qu'un pion noir allait faire dame.
const jugements = new Map();
function arbitre(test, options = {}) {
  return pos => {
    const r = test(pos);
    if (!r) return false;
    const fen = versFen(pos), cle = fen + JSON.stringify(r) + JSON.stringify(options);
    if (!jugements.has(cle)) jugements.set(cle, juger({ fen, ...r }, options));
    return jugements.get(cle) ? false : r;
  };
}

// ---------- Les formes de défis ----------
const PIECES = ['Q', 'R', 'B', 'N'];
const LOURDES = ['q', 'r', 'b', 'n'];

// Une seule bonne prise, qui gagne quelque chose ; les autres prises (s'il y en a) perdent.
function testPrise(minGain = 1, autresPrises = 0) {
  return pos => {
    if (!propre(pos)) return false;
    if (matEnUn(pos).length) return false;
    const { best, coups } = meilleuresPrises(pos);
    if (best < minGain || coups.length !== 1) return false;
    const toutes = coupsLegaux(pos).filter(m => m.prise);
    if (toutes.length - 1 < autresPrises) return false;
    return { type: 'prise' };
  };
}

// Une pièce blanche attaquée (qui serait perdue), au moins une case sûre, mais pas toutes.
function testSauver() {
  return pos => {
    if (!propre(pos)) return false;
    if (matEnUn(pos).length) return false;
    const adv = contre(pos, 'b');
    const menacees = blancs(pos).filter(sq => type(pos.b[sq]) !== 'k' && type(pos.b[sq]) !== 'p' &&
      coupsLegaux(adv).some(m => m.vers === sq && notePrise(adv, m) > 0));
    if (menacees.length !== 1) return false;
    const sq = menacees[0];
    // Pas de prise gratuite plus intéressante pour les blancs : le bon réflexe, c'est de sauver.
    if (meilleuresPrises(pos).best >= VALEUR[type(pos.b[sq])]) return false;
    const coups = coupsLegaux(pos, sq);
    const surs = coups.filter(m => !attaquee(jouer(pos, m), m.vers, 'b'));
    if (!surs.length || surs.length > coups.length * 0.7 || coups.length < 3) return false;
    return { type: 'sauver', cible: 'abcdefgh'[sq & 7] + ((sq >> 3) + 1) };
  };
}

// Faire échec : quelques coups le font, pas trop.
function testEchec(max = 3) {
  return pos => {
    if (!propre(pos)) return false;
    const c = coupsLegaux(pos), e = c.filter(m => enEchec(jouer(pos, m)));
    if (!e.length || e.length > max || c.length < 8) return false;
    return { type: 'echec' };
  };
}

// Sortir d'échec en prenant la pièce qui attaque.
function testParerPrendre() {
  return pos => {
    if (!enEchec(pos, 'w') || enEchec(pos, 'b')) return false;
    const c = coupsLegaux(pos);
    if (c.length < 3) return false;
    const prises = c.filter(m => m.prise);
    if (!prises.length || prises.length > 2 || c.length - prises.length < 2) return false;
    return { type: 'parer', facon: 'prendre' };
  };
}

// Un mat en un coup (un ou deux coups le font).
function testMat(max = 2) {
  return pos => {
    if (!propre(pos)) return false;
    const c = coupsLegaux(pos), m = matEnUn(pos);
    if (!m.length || m.length > max || c.length < 6) return false;
    return { type: 'mat' };
  };
}

// Une fourchette : un ou deux coups la font, pas de prise gratuite à côté, pas de mat.
function testFourchette(piece = null) {
  return pos => {
    if (!propre(pos)) return false;
    if (matEnUn(pos).length) return false;
    if (meilleuresPrises(pos).best >= 1) return false;
    const f = coupsLegaux(pos).filter(m => fourchette(pos, m));
    if (!f.length || f.length > 2) return false;
    if (piece && !f.every(m => type(m.piece) === piece)) return false;
    return { type: 'fourchette' };
  };
}

// Les noirs menacent de faire mat : un à trois coups l'empêchent.
function testParade() {
  return pos => {
    if (!propre(pos)) return false;
    if (matEnUn(pos).length) return false;
    if (!menaceDeMat(contre(pos, 'b'))) return false;
    const c = coupsLegaux(pos);
    const bons = c.filter(m => !menaceDeMat(jouer(pos, m)));
    if (!bons.length || bons.length > 3 || c.length < 8) return false;
    if (bons.some(m => m.prise && notePrise(pos, m) > 0)) return false;
    return { type: 'parade' };
  };
}

// ---------- Les fabriques de positions simples ----------
const rangs = r => Array.from({ length: 8 }, (_, f) => r * 8 + f);
const fab = {
  prise1: () => poser({ w: ['K', parmi(PIECES)], b: ['k', parmi(LOURDES)] }),
  prise2: () => poser({ w: ['K', parmi(PIECES), parmi(['P', 'N', 'B'])], b: ['k', parmi(LOURDES), parmi(LOURDES), 'p'] }),
  sauver1: () => poser({ w: ['K', parmi(['Q', 'R', 'B', 'N'])], b: ['k', parmi(['p', 'n', 'b', 'r'])] }),
  sauver2: () => poser({ w: ['K', parmi(['Q', 'R']), parmi(['B', 'N', 'P'])], b: ['k', parmi(['n', 'b', 'p']), parmi(['r', 'n', 'p'])] }),
  echec1: () => poser({ w: ['K', parmi(['Q', 'R', 'B', 'N'])], b: ['k', 'p'] }),
  parer: () => { const p = poser({ w: ['K', parmi(['R', 'B', 'N', 'Q']), 'P'], b: ['k', parmi(['q', 'r', 'b', 'n'])] }); return p; },
  matDame: () => poser({ w: ['K', 'Q'], b: ['k'] }, { k: [...rangs(7), ...rangs(0), 0, 8, 16, 24, 32, 40, 48, 56, 7, 15, 23, 31, 39, 47, 55, 63] }),
  matTour: () => poser({ w: ['K', 'R', parmi(['R', 'B', 'N'])], b: ['k', 'p', 'p'] }, { k: rangs(7), p: rangs(6) }),
  fourchetteN: () => poser({ w: ['K', 'N'], b: ['k', parmi(['q', 'r']), parmi(['r', 'b', 'p'])] }),
  fourchetteX: () => poser({ w: ['K', parmi(['Q', 'P', 'N', 'B', 'R']), 'P'], b: ['k', parmi(['q', 'r']), parmi(['r', 'n', 'b']), 'p'] }),
  parade: () => {
    // Un roi blanc au fond, derrière ses pions : le mat du couloir menace.
    const K = parmi([5, 6, 7, 1, 2]);
    const b = new Array(64).fill(null);
    b[K] = 'K';
    for (const d of [7, 8, 9]) { const s = K + d; if (s >= 8 && s < 16 && Math.abs((s & 7) - (K & 7)) <= 1 && alea() < 0.92) b[s] = 'P'; }
    const libres = () => { let s; do s = entre(16, 63); while (b[s]); return s; };
    b[libres()] = parmi(['r', 'q', 'r']);
    if (alea() < 0.5) b[libres()] = parmi(['r', 'b', 'n']);
    b[libres()] = parmi(['R', 'Q', 'B', 'N', 'R']);
    if (alea() < 0.6) b[libres()] = parmi(['N', 'B', 'P']);
    let k; do k = entre(48, 63); while (b[k]); b[k] = 'k';
    for (const s of [k - 9, k - 8, k - 7]) if (s >= 40 && !b[s] && alea() < 0.6 && Math.abs((s & 7) - (k & 7)) <= 1) b[s] = 'p';
    return { b, trait: 'w', roques: '', ep: null };
  },
  // La même chose, avec plus de pièces autour : comme en fin de partie.
  parade2: () => {
    const pos = fab.parade();
    const b = pos.b;
    const libres = () => { let s; do s = entre(8, 55); while (b[s]); return s; };
    for (const p of [parmi(['P', 'P', 'N', 'B']), parmi(['p', 'p', 'n', 'b']), parmi(['P', 'p'])]) b[libres()] = p;
    return pos;
  },
};

// ---------- Les bouteilles ----------
console.time('défis');
const parties = positionsDeParties(2600);
console.log(parties.length, 'positions de parties');
const N = 5;
const DEFIS = {
  'plage-1': simples(fab.prise1, arbitre(testPrise(1)), N),
  'plage-2': simples(fab.prise2, arbitre(testPrise(2, 1), { autresProtegees: 1 }), N),
  'plage-3': choisir(parties, arbitre(testPrise(2)), N),
  'port-1': simples(fab.sauver1, arbitre(testSauver()), N),
  'port-2': simples(fab.sauver2, arbitre(testSauver()), N),
  'port-3': choisir(parties, arbitre(testSauver()), N),
  'dunes-1': simples(fab.echec1, arbitre(testEchec(2)), N),
  'dunes-2': simples(fab.parer, arbitre(testParerPrendre()), N),
  'dunes-3': choisir(parties, arbitre(testEchec(2)), N),
  'rochers-1': simples(fab.matDame, arbitre(testMat(2)), N),
  'rochers-2': simples(fab.matTour, arbitre(testMat(1)), N),
  'rochers-3': choisir(parties, arbitre(testMat(2)), N),
  'cabanes-1': simples(fab.fourchetteN, arbitre(testFourchette('n')), N),
  'cabanes-2': simples(fab.fourchetteX, arbitre(testFourchette()), N),
  'cabanes-3': choisir(parties, arbitre(testFourchette()), N),
  'jetee-1': simples(fab.parade, arbitre(testParade()), N),
  'jetee-2': simples(fab.parade2, arbitre(testParade()), N),
};
// La dernière bouteille mélange tout, dans de vraies parties.
const deja = new Set(Object.values(DEFIS).flat().map(d => d.fen));
const reste = parties.filter(p => !deja.has(versFen(p.pos)));
DEFIS['jetee-3'] = [
  ...choisir(reste.slice(0, 7000), arbitre(testPrise(3)), 1), ...choisir(reste.slice(7000, 14000), arbitre(testSauver()), 1),
  ...choisir(reste.slice(14000), arbitre(testFourchette()), 1), ...choisir(reste.slice(3000, 12000), arbitre(testMat(2)), 1), ...simples(fab.parade2, arbitre(testParade()), 1),
];
console.timeEnd('défis');

const texte = `// Fabriqué par tools/defis.js : ne pas modifier à la main.\n// Les positions des défis, rangées par bouteille. Les blancs (Léo) ont toujours le trait.\nexport const DEFIS = ${JSON.stringify(DEFIS, null, 1)};\n`;
writeFileSync(new URL('../defis-de-barnabe/js/defis.js', import.meta.url), texte);
for (const [k, v] of Object.entries(DEFIS)) console.log(k, v.length, v.map(d => d.fen.split(' ')[0].replace(/\d/g, '').length).join(' '));
