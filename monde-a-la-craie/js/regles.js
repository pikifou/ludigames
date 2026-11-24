// Les règles du jeu, sans affichage : choix des pays d'une manche, déroulé d'une manche, progression.

export const TAILLE_MANCHE = 12;
export const REVISIONS = 3;           // pays déjà connus reposés dans une manche, pour réviser
export const SEUIL_MONDE = 0.5;       // un niveau du « monde entier » s'ouvre quand ce niveau est connu à 50 % sur chaque continent
export const DUREE_ERREUR = 1500;     // ms pendant lesquelles le bon pays est montré après une erreur
export const ZONES_IDS = ['europe', 'afrique', 'asie', 'amerique-nord', 'amerique-sud', 'oceanie'];

function melanger(liste, rand) {
  const l = liste.slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
}

// pays : { code, rang }[] (rang 1 = le plus grand), ceux du niveau choisi. Les grands pays pas encore connus d'abord, plus quelques révisions.
export function choisirManche(pays, connus, rand = Math.random) {
  const nouveaux = pays.filter(p => !connus.has(p.code)).sort((a, b) => a.rang - b.rang).map(p => p.code);
  const revus = melanger(pays.filter(p => connus.has(p.code)).map(p => p.code), rand);
  const nbRevus = Math.min(REVISIONS, revus.length);
  const choisis = nouveaux.slice(0, TAILLE_MANCHE - nbRevus);
  choisis.push(...revus.slice(0, TAILLE_MANCHE - choisis.length));
  // Pas assez de pays connus pour les révisions : d'autres nouveaux.
  for (const c of nouveaux) if (choisis.length < TAILLE_MANCHE && !choisis.includes(c)) choisis.push(c);
  return melanger(choisis, rand);
}

// Une manche : on pose les questions dans l'ordre ; un pays raté revient une fois en fin de manche.
// Après une erreur, la manche attend reprendre() (fin de l'animation) : une seule horloge, celle de l'écran.
export class Manche {
  constructor(codes) {
    this.file = codes.slice();
    this.total = codes.length;     // 12, ou moins quand le niveau choisi a moins de pays
    this.rates = new Set();
    this.trouvesSet = new Set();
    this.resultats = new Map();   // code -> vrai si trouvé du premier coup
    this.trouves = 0;              // pays trouvés (du premier coup ou non)
    this.faites = 0;               // questions terminées (trouvées ou montrées)
    this.bloque = false;
  }
  reprendre() { this.bloque = false; }
  get question() { return this.file.length ? this.file[0] : null; }
  get finie() { return this.file.length === 0; }

  toucher(code) {
    const q = this.question;
    // Un pays déjà trouvé se touche comme un autre (ADR-004) : on ne trouve plus le dernier par élimination.
    if (q === null || this.bloque || code == null) return { resultat: 'ignore' };
    this.file.shift();
    if (code === q) {
      this.trouvesSet.add(q); this.trouves++; this.faites++;
      this.resultats.set(q, !this.rates.has(q));
      return { resultat: 'juste' };
    }
    this.bloque = true;
    if (this.rates.has(q)) { this.faites++; this.resultats.set(q, false); }   // raté deux fois : montré, on continue
    else { this.rates.add(q); this.file.push(q); }
    return { resultat: 'faux', bon: q };
  }
}

export function pourcentage(zonePays, connus) {
  if (!zonePays.length) return 0;
  return zonePays.filter(c => connus.has(c)).length / zonePays.length;
}

export function mondeDebloque(pourcentages) {
  return ZONES_IDS.every(z => (pourcentages[z] || 0) >= SEUIL_MONDE);
}

// ---------- l'épreuve (ADR-005, ADR-006) ----------
// Les manches entraînent. L'épreuve d'un continent à un niveau s'ouvre quand les trois quarts de ses pays de ce niveau sont connus
// (en Facile : Europe 11 sur 14, Afrique et Asie 9 sur 12, les deux Amériques 5 sur 6, Océanie 3 sur 4).
// On y cherche tous les pays du niveau, chacun une fois. L'or sans erreur, l'argent avec une ou deux, le bronze au-delà :
// finir donne toujours une médaille, et on peut la refaire pour viser mieux. Une médaille ne redescend jamais.
export const SEUIL_EPREUVE = 0.75;
export const SEUIL_ETAPE = SEUIL_EPREUVE;   // ancien nom
export const MEDAILLES = ['bronze', 'argent', 'or'];   // de la moins bonne à la meilleure

// Combien de pays connus il faut pour ouvrir l'épreuve, et combien il en manque. codes : les pays du continent au niveau choisi.
export function besoinEpreuve(codes, connus) {
  const besoin = Math.ceil(codes.length * SEUIL_EPREUVE);
  const faits = codes.filter(c => connus.has(c)).length;
  return { besoin, faits, manque: Math.max(0, besoin - faits) };
}
export const besoinEtape = besoinEpreuve;   // ancien nom

export function medaillePour(erreurs) { return erreurs === 0 ? 'or' : erreurs <= 2 ? 'argent' : 'bronze'; }
// La meilleure de deux médailles (undefined : pas de médaille).
export function meilleure(a, b) { return MEDAILLES.indexOf(a) >= MEDAILLES.indexOf(b) ? a : b; }
export const cleEpreuve = (zone, niveau) => zone + '-' + niveau;

// ---------- le chemin d'un continent (ADR-008) ----------
// Les niveaux d'un continent s'ouvrent un par un : Facile tout de suite, Moyen avec la médaille de l'épreuve Facile
// (le tampon de Nina), Difficile avec la médaille de l'épreuve Moyen.
// Un tampon gagné avant les épreuves (etapes, sans médaille) vaut le niveau Facile réussi.
const ORDRE_NIVEAUX = ['facile', 'moyen', 'difficile'];
function reussi(zone, niveau, medailles, etapes) {
  return MEDAILLES.includes(medailles[cleEpreuve(zone, niveau)]) || (niveau === 'facile' && etapes.includes(zone));
}
export function niveauOuvertContinent(zone, niveau, medailles, etapes = []) {
  const i = ORDRE_NIVEAUX.indexOf(niveau);
  if (i <= 0) return i === 0;
  return reussi(zone, ORDRE_NIVEAUX[i - 1], medailles, etapes);
}
// Le niveau qui reste à réussir (le premier sans médaille ni tampon), ou null quand les trois sont réussis.
export function prochainNiveau(zone, medailles, etapes = []) {
  return ORDRE_NIVEAUX.find(n => !reussi(zone, n, medailles, etapes)) || null;
}
// Le niveau qui s'ouvre avec la médaille de celui-ci (null après Difficile).
export function niveauSuivant(niveau) { return ORDRE_NIVEAUX[ORDRE_NIVEAUX.indexOf(niveau) + 1] || null; }

// Une épreuve : chaque pays une fois, dans un ordre mélangé. Une erreur montre le bon pays, compte, et l'épreuve continue
// (le pays raté ne revient pas). Même façon de jouer qu'une manche : question, toucher(), reprendre(), finie.
export class Epreuve {
  constructor(codes, rand = Math.random) {
    this.file = melanger(codes, rand);
    this.total = codes.length;
    this.erreurs = 0;
    this.resultats = new Map();   // code -> vrai si trouvé du premier coup
    this.trouves = 0;
    this.faites = 0;
    this.bloque = false;
  }
  reprendre() { this.bloque = false; }
  get question() { return this.file.length ? this.file[0] : null; }
  get finie() { return this.file.length === 0; }
  get medaille() { return medaillePour(this.erreurs); }

  toucher(code) {
    const q = this.question;
    if (q === null || this.bloque || code == null) return { resultat: 'ignore' };
    this.file.shift();
    this.faites++;
    if (code === q) { this.trouves++; this.resultats.set(q, true); return { resultat: 'juste' }; }
    this.erreurs++; this.bloque = true; this.resultats.set(q, false);
    return { resultat: 'faux', bon: q };
  }
}

// ---------- le tour du monde de Nina ----------
// Une étape (un tampon dans le carnet) par continent : on la gagne avec une médaille, quelle qu'elle soit, à l'épreuve Facile
// de ce continent (ADR-006). Les six tampons : le tour du monde est fait. Un tampon gagné ne s'enlève jamais.

// Les étapes gagnées maintenant, en plus de celles déjà dans le carnet (dans l'ordre des continents).
// medailles : { 'europe-facile': 'or', … }. etapes : les continents déjà tamponnés, dans l'ordre où ils l'ont été.
export function nouvellesEtapes(medailles, etapes) {
  return ZONES_IDS.filter(z => !etapes.includes(z) && MEDAILLES.includes(medailles[cleEpreuve(z, 'facile')]));
}

export function tourFait(etapes) { return ZONES_IDS.every(z => etapes.includes(z)); }
