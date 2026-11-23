// L'arbitre des Défis de Barnabé : un défi ne doit jamais demander un mauvais coup.
// Une recherche à 3 demi-coups, puis toutes les prises jusqu'au calme, en comptant seulement le matériel.
// Sert au générateur (tools/defis.js) et aux tests (tests/defis-contenu.test.js).
import { depuisFen, coupsLegaux, jouer, enEchec, attaquee, type, couleur, VALEUR } from '../defis-de-barnabe/js/echecs.js';
import { Exercice } from '../defis-de-barnabe/js/exercice.js';

const MAT = 100000;
const valeur = p => VALEUR[type(p)] * 100;

// Le matériel, du point de vue de celui qui a le trait.
function materiel(pos) {
  let s = 0;
  for (const p of pos.b) if (p) s += (couleur(p) === 'w' ? 1 : -1) * valeur(p);
  return pos.trait === 'w' ? s : -s;
}

const bruyant = m => m.prise || m.promo;
const ordre = (a, b) => ((b.prise ? valeur(b.prise) : 0) + (b.promo ? 800 : 0) - (b.prise ? valeur(b.piece) / 10 : 0))
  - ((a.prise ? valeur(a.prise) : 0) + (a.promo ? 800 : 0) - (a.prise ? valeur(a.piece) / 10 : 0));

// Le calme : on joue les prises (et les promotions) jusqu'à ce que plus rien ne tombe. En échec, on regarde tous les coups.
function calme(pos, alpha, beta, n) {
  const coups = coupsLegaux(pos);
  if (!coups.length) return enEchec(pos) ? -MAT + n : 0;
  const echec = enEchec(pos);
  if (!echec) {
    const reste = materiel(pos);
    if (reste >= beta) return reste;
    if (reste > alpha) alpha = reste;
  }
  if (n > 14) return alpha;
  const a = (echec ? coups : coups.filter(bruyant)).filter(m => !m.promo || type(m.promo) === 'q');
  a.sort(ordre);
  for (const m of a) {
    const v = -calme(jouer(pos, m), -beta, -alpha, n + 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function chercher(pos, prof, alpha, beta, n) {
  if (prof === 0) return calme(pos, alpha, beta, n);
  const coups = coupsLegaux(pos).filter(m => !m.promo || type(m.promo) === 'q');
  if (!coups.length) return enEchec(pos) ? -MAT + n : 0;
  coups.sort(ordre);
  for (const m of coups) {
    const v = -chercher(jouer(pos, m), prof - 1, -beta, -alpha, n + 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

// La note de chaque coup des blancs (en centipions de matériel ; un mat vaut presque MAT).
export function notes(pos, prof = 3) {
  return coupsLegaux(pos).filter(m => !m.promo || type(m.promo) === 'q')
    .map(m => ({ m, v: -chercher(jouer(pos, m), prof - 1, -Infinity, Infinity, 1) }));
}

// Juge un défi : renvoie null s'il est bon, sinon la raison (une phrase).
// - tous les coups que le jeu accepte sont aussi bons que le meilleur coup (à une demi-pièce près) ;
// - la fourchette gagne vraiment quelque chose ;
// - une prise « gratuite » ne fait pas reprendre la pièce, et les autres prises proposées sont vraiment protégées.
// Pour « faire échec », le but est de trouver un échec, pas le meilleur coup : on tolère un pion d'écart, pas plus.
export const MARGE = 50;
const MARGE_ECHEC = 150;
export function juger(def, { autresProtegees = 0 } = {}) {
  const pos = depuisFen(def.fen);
  const tout = notes(pos);
  const meilleur = Math.max(...tout.map(x => x.v));
  const acceptes = tout.filter(({ m }) => { const ex = new Exercice(def); return ex.jouer(m).ok; });
  if (!acceptes.length) return 'aucun coup accepté';
  const nom = m => 'abcdefgh'[m.de & 7] + ((m.de >> 3) + 1) + 'abcdefgh'[m.vers & 7] + ((m.vers >> 3) + 1);
  const mauvais = acceptes.filter(x => x.v < meilleur - (def.type === 'echec' ? MARGE_ECHEC : MARGE));
  if (mauvais.length) {
    const top = tout.find(x => x.v === meilleur);
    return `le jeu accepte ${mauvais.map(x => nom(x.m) + ' (' + x.v + ')').join(', ')} alors que ${nom(top.m)} vaut ${meilleur}`;
  }
  const avant = materiel(pos);
  if (def.type === 'fourchette' && Math.max(...acceptes.map(x => x.v)) < avant + 150) return 'la fourchette ne gagne rien';
  if (def.type === 'prise') {
    for (const { m } of acceptes) if (attaquee(jouer(pos, m), m.vers, 'b')) return 'la prise demandée se fait reprendre';
    const protegees = coupsLegaux(pos).filter(m => m.prise && attaquee(jouer(pos, m), m.vers, 'b'));
    if (protegees.length < autresProtegees) return 'pas d\'autre pièce protégée à éviter';
  }
  return null;
}
