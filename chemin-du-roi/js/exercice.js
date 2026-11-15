// Un exercice : une position, un but, et la façon de juger chaque coup. Sans DOM.
import { depuisFen, jouer, coupsLegaux, etat, enEchec, attaquee, caseDe, nomCase, type, couleur, VALEUR } from './echecs.js';

// Les buts où l'on joue plusieurs coups seul (les pièces noires ne bougent pas).
export const SEUL = ['etoiles', 'prendre'];

const noirs = pos => pos.b.filter(p => p && couleur(p) === 'b').length;

function rendreLeTrait(pos) { return { ...pos, trait: 'w', ep: null }; }

// Le plus petit nombre de coups pour finir un exercice « seul » (recherche en largeur),
// et le premier coup d'un chemin le plus court (pour l'indice).
export function cheminLePlusCourt(def, depart = depuisFen(def.fen), etoiles = (def.etoiles || []).map(caseDe)) {
  const fini = (pos, reste) => (def.type === 'etoiles' ? reste === 0 : noirs(pos) === 0);
  const tous = (1 << etoiles.length) - 1;
  let file = [{ pos: depart, reste: tous, premier: null }];
  const vus = new Set([depart.b.join() + tous]);
  for (let n = 1; n <= 14 && file.length; n++) {
    const suite = [];
    for (const { pos, reste, premier } of file) {
      for (const m of coupsLegaux(rendreLeTrait(pos))) {
        const p2 = jouer(rendreLeTrait(pos), m);
        let r2 = reste;
        etoiles.forEach((s, i) => { if (m.vers === s) r2 &= ~(1 << i); });
        if (fini(p2, r2)) return { n, premier: premier || m };
        const cle = p2.b.join() + r2;
        if (!vus.has(cle) && vus.size < 60000) { vus.add(cle); suite.push({ pos: p2, reste: r2, premier: premier || m }); }
      }
    }
    file = suite;
  }
  return { n: null, premier: null };
}

export const coupsMinimum = def => cheminLePlusCourt(def).n;

// La note d'une prise : ce qu'on gagne, moins la pièce qu'on perd si la case est attaquée.
export function notePrise(pos, m) {
  if (!m.prise) return -Infinity;
  const apres = jouer(pos, m);
  const perdu = attaquee(apres, m.vers, 'b') ? VALEUR[type(m.piece)] : 0;
  return VALEUR[type(m.prise)] - perdu;
}

export class Exercice {
  constructor(def) {
    this.def = def;
    this.pos = depuisFen(def.fen);
    this.etoiles = (def.etoiles || []).map(caseDe);
    this.coups = 0;
    this.erreurs = 0;
    this.fini = false;
    if (SEUL.includes(def.type)) this.minimum = def.minimum ?? coupsMinimum(def);
  }

  // Les coups que l'enfant peut essayer depuis une case.
  coupsDepuis(sq) {
    if (this.fini) return [];
    const pos = SEUL.includes(this.def.type) ? rendreLeTrait(this.pos) : this.pos;
    return coupsLegaux(pos, sq);
  }

  // Joue un coup et dit ce qui se passe : { ok, fini, annule, raison, etoile }.
  jouer(m) {
    const d = this.def, avant = this.pos;
    const apres = jouer(SEUL.includes(d.type) ? rendreLeTrait(avant) : avant, m);
    const rate = raison => { this.erreurs++; return { ok: false, annule: true, raison, apres }; };
    this.coups++;
    switch (d.type) {
      case 'etoiles':
      case 'prendre': {
        this.pos = apres;
        const etoile = this.etoiles.includes(m.vers);
        this.etoiles = this.etoiles.filter(s => s !== m.vers);
        this.fini = d.type === 'etoiles' ? this.etoiles.length === 0 : noirs(apres) === 0;
        return { ok: true, fini: this.fini, etoile };
      }
      case 'mat': {
        const e = etat(apres);
        if (e === 'mat') return this.reussi(apres);
        return rate(e === 'echec' ? 'echec-pas-mat' : e === 'pat' ? 'pat' : 'pas-mat');
      }
      case 'echec':
        return enEchec(apres) ? this.reussi(apres) : rate('pas-echec');
      case 'parer': {
        const roi = type(m.piece) === 'k';
        if (d.facon === 'roi' && !roi) return rate('bouge-le-roi');
        if (d.facon === 'prendre' && !m.prise) return rate('prends-l-attaquant');
        if (d.facon === 'bloquer' && (roi || m.prise)) return rate('bloque');
        return this.reussi(apres);
      }
      case 'sauver': {
        const cible = caseDe(d.cible);
        if (m.de !== cible) return rate('pas-la-bonne-piece');
        if (attaquee(apres, m.vers, 'b')) return rate('encore-attaquee');
        return this.reussi(apres);
      }
      case 'prise': {
        if (!m.prise) return rate('pas-de-prise');
        const meilleure = Math.max(...coupsLegaux(avant).map(c => notePrise(avant, c)));
        const n = notePrise(avant, m);
        if (n < meilleure) return rate(attaquee(apres, m.vers, 'b') ? 'piege' : 'plus-gros');
        return this.reussi(apres);
      }
      case 'coup': {
        const nom = nomCase(m.de) + nomCase(m.vers);
        return d.coups.includes(nom) ? this.reussi(apres) : rate('autre-coup');
      }
      default:
        throw new Error('but inconnu : ' + d.type);
    }
  }

  // Un bon coup à montrer en indice (ou null).
  indice() {
    if (this.fini) return null;
    if (SEUL.includes(this.def.type)) return cheminLePlusCourt(this.def, this.pos, this.etoiles).premier;
    for (const m of coupsLegaux(this.pos)) {
      const essai = new Exercice(this.def);
      essai.pos = this.pos;
      if (essai.jouer(m).ok) return m;
    }
    return null;
  }

  reussi(apres) { this.pos = apres; this.fini = true; return { ok: true, fini: true }; }

  // De 1 à 3 étoiles.
  note() {
    if (SEUL.includes(this.def.type)) {
      // Un coup de plus que le minimum, c'est encore parfait : on a le droit d'essayer.
      if (this.minimum == null || this.coups <= this.minimum + 1) return 3;
      return this.coups <= this.minimum + 3 ? 2 : 1;
    }
    return this.erreurs === 0 ? 3 : this.erreurs === 1 ? 2 : 1;
  }
}

// ---------- Les parties contre un ami ----------
// fin : 'mat' (vraie partie), 'course' (le premier pion arrivé au bout gagne), 'tout' (prendre toutes les pièces).
export function finDePartie(pos, fin) {
  const b = pos.b;
  if (fin === 'course') {
    if (b.slice(56).some(p => p && couleur(p) === 'w')) return { gagnant: 'w', raison: 'arrive' };
    if (b.slice(0, 8).some(p => p && couleur(p) === 'b')) return { gagnant: 'b', raison: 'arrive' };
    if (!b.some(p => p === 'p')) return { gagnant: 'w', raison: 'plus-de-pions' };
    if (!b.some(p => p === 'P')) return { gagnant: 'b', raison: 'plus-de-pions' };
  }
  if (fin === 'tout') {
    if (!b.some(p => p && couleur(p) === 'b')) return { gagnant: 'w', raison: 'tout-pris' };
    if (!b.some(p => p && couleur(p) === 'w')) return { gagnant: 'b', raison: 'tout-pris' };
  }
  const e = etat(pos);
  if (e === 'mat') return { gagnant: pos.trait === 'w' ? 'b' : 'w', raison: 'mat' };
  if (e === 'pat') {
    if (fin === 'mat') return { gagnant: null, raison: 'pat' };
    // Plus aucun coup possible : celui qui a le plus de pièces gagne.
    const compte = c => b.filter(p => p && couleur(p) === c).reduce((s, p) => s + (VALEUR[type(p)] || 0), 0);
    const w = compte('w'), n = compte('b');
    return { gagnant: w > n ? 'w' : n > w ? 'b' : null, raison: 'bloque' };
  }
  if (fin === 'mat') {
    const reste = b.filter(p => p && type(p) !== 'k');
    if (!reste.length) return { gagnant: null, raison: 'rois-seuls' };
  }
  return null;
}
