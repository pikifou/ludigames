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
    if (q === null || this.bloque || code == null || this.trouvesSet.has(code)) return { resultat: 'ignore' };
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

// ---------- le tour du monde de Nina ----------
// Une étape (un tampon dans le carnet) par continent : on la gagne quand on connaît les trois quarts des pays du niveau Facile
// de ce continent (Europe 11 sur 14, Afrique et Asie 9 sur 12, les deux Amériques 5 sur 6, Océanie 3 sur 4).
// Les six tampons : le tour du monde est fait (42 pays sur les 54 du Facile, environ 78 %). Un tampon gagné ne s'enlève jamais.
export const SEUIL_ETAPE = 0.75;

// Combien de pays connus il faut sur un continent, et combien il en manque. facilesDeZone : les codes Facile du continent.
export function besoinEtape(facilesDeZone, connus) {
  const besoin = Math.ceil(facilesDeZone.length * SEUIL_ETAPE);
  const faits = facilesDeZone.filter(c => connus.has(c)).length;
  return { besoin, faits, manque: Math.max(0, besoin - faits) };
}

// Les étapes gagnées maintenant, en plus de celles déjà dans le carnet (dans l'ordre des continents).
// faciles : { zone: [codes Facile] }. etapes : les continents déjà tamponnés, dans l'ordre où ils l'ont été.
export function nouvellesEtapes(faciles, connus, etapes) {
  return ZONES_IDS.filter(z => !etapes.includes(z) && faciles[z] && faciles[z].length && besoinEtape(faciles[z], connus).manque === 0);
}

export function tourFait(etapes) { return ZONES_IDS.every(z => etapes.includes(z)); }
