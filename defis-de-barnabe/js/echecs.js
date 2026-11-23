// Les règles des échecs, sans DOM : positions, coups légaux, échec, mat, pat.
// Cases : 0 = a1, 7 = h1, 56 = a8. Pièces : majuscules blanches (KQRBNP), minuscules noires.
// Une position peut ne pas avoir de roi (exercices des premières pièces) : il n'y a alors jamais d'échec.

export const COLONNES = 'abcdefgh';
export const nomCase = i => COLONNES[i & 7] + ((i >> 3) + 1);
export const caseDe = n => COLONNES.indexOf(n[0]) + (Number(n[1]) - 1) * 8;
export const couleur = p => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
export const type = p => (p ? p.toLowerCase() : null);
export const adverse = c => (c === 'w' ? 'b' : 'w');

export function depuisFen(fen) {
  const [plateau, trait = 'w', roques = '-', ep = '-'] = fen.trim().split(/\s+/);
  const b = new Array(64).fill(null);
  plateau.split('/').forEach((ligne, r) => {
    let f = 0;
    for (const ch of ligne) {
      if (/\d/.test(ch)) f += Number(ch);
      else { b[(7 - r) * 8 + f] = ch; f++; }
    }
  });
  return { b, trait, roques: roques === '-' ? '' : roques, ep: ep === '-' ? null : caseDe(ep) };
}

export function versFen(pos) {
  const lignes = [];
  for (let r = 7; r >= 0; r--) {
    let s = '', vide = 0;
    for (let f = 0; f < 8; f++) {
      const p = pos.b[r * 8 + f];
      if (!p) vide++;
      else { if (vide) s += vide; vide = 0; s += p; }
    }
    if (vide) s += vide;
    lignes.push(s);
  }
  return `${lignes.join('/')} ${pos.trait} ${pos.roques || '-'} ${pos.ep == null ? '-' : nomCase(pos.ep)}`;
}

const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const DROIT = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CAVALIER = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const TOUS = [...DIAG, ...DROIT];

function dans(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }

// La case sq est-elle attaquée par une pièce de la couleur c ?
export function attaquee(pos, sq, c) {
  const b = pos.b, f0 = sq & 7, r0 = sq >> 3;
  const est = (f, r, types) => { const p = b[r * 8 + f]; return p && couleur(p) === c && types.includes(type(p)); };
  const sensPion = c === 'w' ? -1 : 1; // un pion blanc attaque vers le haut : il est en dessous
  for (const df of [-1, 1]) if (dans(f0 + df, r0 + sensPion) && est(f0 + df, r0 + sensPion, 'p')) return true;
  for (const [df, dr] of CAVALIER) if (dans(f0 + df, r0 + dr) && est(f0 + df, r0 + dr, 'n')) return true;
  for (const [df, dr] of TOUS) if (dans(f0 + df, r0 + dr) && est(f0 + df, r0 + dr, 'k')) return true;
  for (const [dirs, types] of [[DIAG, 'bq'], [DROIT, 'rq']]) {
    for (const [df, dr] of dirs) {
      let f = f0 + df, r = r0 + dr;
      while (dans(f, r)) {
        const p = b[r * 8 + f];
        if (p) { if (couleur(p) === c && types.includes(type(p))) return true; break; }
        f += df; r += dr;
      }
    }
  }
  return false;
}

export const roiDe = (pos, c) => pos.b.indexOf(c === 'w' ? 'K' : 'k');

export function enEchec(pos, c = pos.trait) {
  const k = roiDe(pos, c);
  return k >= 0 && attaquee(pos, k, adverse(c));
}

// Coups possibles sans regarder si son propre roi reste en échec.
export function coupsBruts(pos, depuis = null) {
  const coups = [], b = pos.b, c = pos.trait;
  const cases = depuis == null ? [...b.keys()] : [depuis];
  for (const sq of cases) {
    const p = b[sq];
    if (!p || couleur(p) !== c) continue;
    const t = type(p), f0 = sq & 7, r0 = sq >> 3;
    const ajoute = (to, extra = {}) => coups.push({ de: sq, vers: to, piece: p, prise: b[to] || null, ...extra });
    if (t === 'p') {
      const dir = c === 'w' ? 1 : -1, depart = c === 'w' ? 1 : 6, fin = c === 'w' ? 7 : 0;
      const pousse = (to) => {
        if ((to >> 3) === fin) for (const pr of 'qrbn') ajoute(to, { promo: c === 'w' ? pr.toUpperCase() : pr });
        else ajoute(to);
      };
      const r1 = r0 + dir;
      if (dans(f0, r1) && !b[r1 * 8 + f0]) {
        pousse(r1 * 8 + f0);
        const r2 = r0 + 2 * dir;
        if (r0 === depart && !b[r2 * 8 + f0]) ajoute(r2 * 8 + f0, { double: true });
      }
      for (const df of [-1, 1]) {
        if (!dans(f0 + df, r1)) continue;
        const to = r1 * 8 + f0 + df;
        if (b[to] && couleur(b[to]) !== c) pousse(to);
        else if (pos.ep === to) ajoute(to, { enPassant: true, prise: c === 'w' ? 'p' : 'P' });
      }
    } else if (t === 'n' || t === 'k') {
      for (const [df, dr] of t === 'n' ? CAVALIER : TOUS) {
        const f = f0 + df, r = r0 + dr;
        if (!dans(f, r)) continue;
        const to = r * 8 + f;
        if (!b[to] || couleur(b[to]) !== c) ajoute(to);
      }
      if (t === 'k') roques(pos, sq, ajoute);
    } else {
      const dirs = t === 'b' ? DIAG : t === 'r' ? DROIT : TOUS;
      for (const [df, dr] of dirs) {
        let f = f0 + df, r = r0 + dr;
        while (dans(f, r)) {
          const to = r * 8 + f;
          if (b[to]) { if (couleur(b[to]) !== c) ajoute(to); break; }
          ajoute(to);
          f += df; r += dr;
        }
      }
    }
  }
  return coups;
}

function roques(pos, sq, ajoute) {
  const c = pos.trait, b = pos.b, ennemi = adverse(c);
  const base = c === 'w' ? 0 : 56;
  if (sq !== base + 4) return;
  const tour = c === 'w' ? 'R' : 'r';
  const droits = c === 'w' ? ['K', 'Q'] : ['k', 'q'];
  if (attaquee(pos, sq, ennemi)) return;
  if (pos.roques.includes(droits[0]) && b[base + 7] === tour && !b[base + 5] && !b[base + 6]
      && !attaquee(pos, base + 5, ennemi) && !attaquee(pos, base + 6, ennemi)) ajoute(base + 6, { roque: 'petit' });
  if (pos.roques.includes(droits[1]) && b[base] === tour && !b[base + 1] && !b[base + 2] && !b[base + 3]
      && !attaquee(pos, base + 3, ennemi) && !attaquee(pos, base + 2, ennemi)) ajoute(base + 2, { roque: 'grand' });
}

export function jouer(pos, m) {
  const b = pos.b.slice(), c = pos.trait;
  b[m.vers] = m.promo || b[m.de];
  b[m.de] = null;
  if (m.enPassant) b[m.vers + (c === 'w' ? -8 : 8)] = null;
  if (m.roque) {
    const base = c === 'w' ? 0 : 56;
    if (m.roque === 'petit') { b[base + 5] = b[base + 7]; b[base + 7] = null; }
    else { b[base + 3] = b[base]; b[base] = null; }
  }
  let roques = pos.roques;
  const retire = (s) => { roques = roques.replace(s, ''); };
  if (type(m.piece) === 'k') retire(c === 'w' ? 'K' : 'k'), retire(c === 'w' ? 'Q' : 'q');
  for (const [sq, droit] of [[0, 'Q'], [7, 'K'], [56, 'q'], [63, 'k']]) if (m.de === sq || m.vers === sq) retire(droit);
  return { b, trait: adverse(c), roques, ep: m.double ? (m.de + m.vers) / 2 : null };
}

export function coupsLegaux(pos, depuis = null) {
  return coupsBruts(pos, depuis).filter(m => !enEchec(jouer(pos, m), pos.trait));
}

// 'mat', 'pat', 'echec' ou 'normal', pour le camp qui a le trait.
export function etat(pos) {
  const aucun = coupsLegaux(pos).length === 0, echec = enEchec(pos);
  if (aucun) return echec ? 'mat' : 'pat';
  return echec ? 'echec' : 'normal';
}

export function perft(pos, n) {
  if (n === 0) return 1;
  let total = 0;
  for (const m of coupsLegaux(pos)) total += perft(jouer(pos, m), n - 1);
  return total;
}

// ---------- Les adversaires ----------
export const VALEUR = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CENTRE = [0, 1, 2, 3, 3, 2, 1, 0];

function evaluer(pos) {
  // Du point de vue des blancs.
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = pos.b[i];
    if (!p) continue;
    const t = type(p), signe = couleur(p) === 'w' ? 1 : -1;
    let v = VALEUR[t] * 100;
    if (t === 'n' || t === 'b') v += (CENTRE[i & 7] + CENTRE[i >> 3]) * 4;
    if (t === 'p') v += (couleur(p) === 'w' ? (i >> 3) - 1 : 6 - (i >> 3)) * 6 + CENTRE[i & 7] * 2;
    s += signe * v;
  }
  return s;
}

function chercher(pos, prof, alpha, beta) {
  if (prof === 0) return (pos.trait === 'w' ? 1 : -1) * evaluer(pos);
  const coups = coupsLegaux(pos);
  if (!coups.length) return enEchec(pos) ? -100000 - prof : 0;
  coups.sort((a, b) => (b.prise ? VALEUR[type(b.prise)] : -1) - (a.prise ? VALEUR[type(a.prise)] : -1));
  for (const m of coups) {
    const v = -chercher(jouer(pos, m), prof - 1, -beta, -alpha);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

// Choisit un coup. niveau : { prof (1 à 3), hasard (0 à 1 : part de coups au hasard), bruit (centipions) }.
export function choisirCoup(pos, niveau = {}, alea = Math.random) {
  const { prof = 2, hasard = 0, bruit = 0 } = niveau;
  const coups = coupsLegaux(pos);
  if (!coups.length) return null;
  // Un mat en un coup se voit toujours, sauf chez les plus distraits.
  if (hasard < 0.5) for (const m of coups) if (etat(jouer(pos, m)) === 'mat') return m;
  if (alea() < hasard) return coups[Math.floor(alea() * coups.length)];
  let meilleur = null, mv = -Infinity;
  for (const m of coups) {
    const v = -chercher(jouer(pos, m), prof - 1, -Infinity, Infinity) + (alea() - 0.5) * 2 * bruit;
    if (v > mv) { mv = v; meilleur = m; }
  }
  return meilleur;
}
