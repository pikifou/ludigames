// La progression, gardée sur l'appareil. Dans Ludiworld, une progression par enfant (rangée sous son prénom).

import { NIVEAUX } from './niveaux.js';

const BASE = 'monde-a-la-craie.v1';

export function cle(joueur) {
  return joueur ? BASE + '.' + encodeURIComponent(joueur) : BASE;
}

function etatVide() {
  // langue null : celle de l'appareil. niveaux : le dernier niveau choisi pour chaque zone.
  // voyage : le tour du monde de Nina (étapes gagnées dans l'ordre, intro vue, tour fait). Rien ne s'y enlève.
  // Le son (musique, bruitages, voix) n'est plus ici : Ludiworld le règle pour toute la maison (js/reglage-son.js).
  return { connus: new Set(), meilleurs: {}, niveaux: {}, langue: null, voyage: voyageVide() };
}
const voyageVide = () => ({ etapes: [], intro: false, fini: false });
const ZONES_VOYAGE = ['europe', 'afrique', 'asie', 'amerique-nord', 'amerique-sud', 'oceanie'];

// Ajoute un voyage gardé à celui-ci : les étapes s'additionnent, intro et fin ne s'effacent pas.
function fusionnerVoyage(v, d) {
  if (!d || typeof d !== 'object') return;
  if (Array.isArray(d.etapes)) for (const z of d.etapes) if (ZONES_VOYAGE.includes(z) && !v.etapes.includes(z)) v.etapes.push(z);
  if (d.intro === true) v.intro = true;
  if (d.fini === true) v.fini = true;
}

function stockageParDefaut() {
  try { return globalThis.localStorage; } catch { return undefined; }
}

// Stockage absent, bloqué ou abîmé : on repart de zéro, sans erreur.
export function charger(joueur, stockage = stockageParDefaut()) {
  const e = etatVide();
  try {
    const brut = stockage && stockage.getItem(cle(joueur));
    if (!brut) return e;
    appliquer(e, JSON.parse(brut));
  } catch { /* stockage illisible : progression vide */ }
  return e;
}

// Lit des données gardées (en les vérifiant) dans l'état. Ce qui manque ou est abîmé garde sa valeur.
function appliquer(e, d) {
  if (Array.isArray(d.connus)) e.connus = new Set(d.connus.filter(c => typeof c === 'string'));
  if (d.meilleurs && typeof d.meilleurs === 'object') {
    e.meilleurs = {};
    for (const [z, t] of Object.entries(d.meilleurs)) if (typeof t === 'number' && t > 0) e.meilleurs[z] = t;
  }
  if (d.niveaux && typeof d.niveaux === 'object') {
    e.niveaux = {};
    for (const [z, n] of Object.entries(d.niveaux)) if (NIVEAUX.includes(n)) e.niveaux[z] = n;
  }
  // voix et son d'une vieille sauvegarde : ignorés (un jeu ne reste jamais muet à cause d'eux).
  if (d.langue === 'fr' || d.langue === 'en') e.langue = d.langue;
  fusionnerVoyage(e.voyage, d.voyage);
  return e;
}

// Ce que Ludiworld garde dans le compte du parent : la progression, pas les réglages de l'appareil (langue).
export function versPartage(etat) {
  return { connus: [...etat.connus], meilleurs: etat.meilleurs, niveaux: etat.niveaux, voyage: etat.voyage };
}
// Une progression venue d'un autre appareil remplace celle-ci, sauf les réglages de l'appareil.
// Le voyage, lui, s'additionne : un tampon gagné ici ou là-bas reste gagné.
export function depuisPartage(etat, d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.connus)) return false;
  appliquer(etat, { connus: d.connus, meilleurs: d.meilleurs, niveaux: d.niveaux, voyage: d.voyage });
  return true;
}

// Un meilleur temps par zone et par niveau. Les temps d'avant les niveaux (clé « europe ») sont ceux du Difficile.
export function cleRecord(zone, niveau) { return niveau === 'difficile' ? zone : zone + '-' + niveau; }

// resultats : Map code -> vrai si trouvé du premier coup. temps : secondes de la manche.
export function enregistrerManche(etat, zone, resultats, temps, niveau = 'difficile') {
  for (const [code, ok] of resultats) {
    if (ok) etat.connus.add(code); else etat.connus.delete(code);
  }
  const k = cleRecord(zone, niveau), avant = etat.meilleurs[k];
  const record = !(avant <= temps);
  if (record) etat.meilleurs[k] = temps;
  return { record };
}

export function sauver(joueur, etat, stockage = stockageParDefaut()) {
  try {
    stockage && stockage.setItem(cle(joueur), JSON.stringify({
      connus: [...etat.connus], meilleurs: etat.meilleurs, niveaux: etat.niveaux, langue: etat.langue,
      voyage: etat.voyage,
    }));
  } catch { /* stockage plein ou bloqué : tant pis, le jeu continue */ }
}
