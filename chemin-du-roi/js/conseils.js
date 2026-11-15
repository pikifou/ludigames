// Les conseils des amis pendant une vraie partie, sans DOM.
// Le but n'est pas de bien jouer à la place de l'enfant, mais de l'empêcher de tout perdre sur une étourderie,
// et de lui montrer un très bon coup qu'il vient de laisser passer.
import { coupsLegaux, jouer, attaquee, enEchec, etat, type, VALEUR } from './echecs.js';

// Ce que rapporte une prise au camp qui la joue : la pièce prise, moins sa propre pièce si elle peut être reprise.
export function gainPrise(pos, m) {
  if (!m.prise) return -Infinity;
  const apres = jouer(pos, m);
  const perdu = attaquee(apres, m.vers, apres.trait) ? VALEUR[type(m.piece)] : 0;
  return VALEUR[type(m.prise)] - perdu;
}

// Le meilleur coup immédiat du camp qui a le trait : un mat, ou la prise qui rapporte le plus. { m, gain, mat } ou null.
export function meilleureMenace(pos) {
  let best = null;
  for (const m of coupsLegaux(pos)) {
    const apres = jouer(pos, m);
    if (enEchec(apres) && etat(apres) === 'mat') return { m, gain: 100, mat: true };
    const g = gainPrise(pos, m);
    if (g > 0 && g > (best?.gain ?? 0)) best = { m, gain: g };
  }
  return best;
}

const poids = x => (x ? x.gain : 0);
const GROS = 3; // à partir d'un cavalier ou d'un fou : ça vaut la peine d'en parler.

// Le coup m (joué depuis avant) laisse-t-il l'adversaire mater, ou gagner gros, alors qu'un autre coup l'évitait ?
// Renvoie la menace de l'adversaire, ou null.
export function erreur(avant, m) {
  const menace = meilleureMenace(jouer(avant, m));
  if (!menace || (!menace.mat && menace.gain < GROS)) return null;
  const evitable = coupsLegaux(avant).some(a => poids(meilleureMenace(jouer(avant, a))) < menace.gain);
  return evitable ? menace : null;
}

// Un très bon coup était possible (un mat, ou une prise qui rapporte gros) et m ne l'a pas joué : renvoie ce coup, sinon null.
export function occasionManquee(avant, m) {
  const o = meilleureMenace(avant);
  if (!o || (!o.mat && o.gain < GROS)) return null;
  const apres = jouer(avant, m);
  if (o.mat) return enEchec(apres) && etat(apres) === 'mat' ? null : o;
  return gainPrise(avant, m) >= o.gain ? null : o;
}
