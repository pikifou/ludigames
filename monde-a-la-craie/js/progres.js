// La progression, gardée sur l'appareil. Dans Ludiworld, une progression par enfant (rangée sous son prénom).

import { NIVEAUX } from './niveaux.js';

const BASE = 'monde-a-la-craie.v1';

export function cle(joueur) {
  return joueur ? BASE + '.' + encodeURIComponent(joueur) : BASE;
}

function etatVide() {
  // langue null : celle de l'appareil. niveaux : le dernier niveau choisi pour chaque zone.
  return { connus: new Set(), meilleurs: {}, niveaux: {}, voix: false, son: true, langue: null };
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
    const d = JSON.parse(brut);
    if (Array.isArray(d.connus)) e.connus = new Set(d.connus.filter(c => typeof c === 'string'));
    if (d.meilleurs && typeof d.meilleurs === 'object') {
      for (const [z, t] of Object.entries(d.meilleurs)) if (typeof t === 'number' && t > 0) e.meilleurs[z] = t;
    }
    if (d.niveaux && typeof d.niveaux === 'object') {
      for (const [z, n] of Object.entries(d.niveaux)) if (NIVEAUX.includes(n)) e.niveaux[z] = n;
    }
    if (typeof d.voix === 'boolean') e.voix = d.voix;
    if (typeof d.son === 'boolean') e.son = d.son;
    if (d.langue === 'fr' || d.langue === 'en') e.langue = d.langue;
  } catch { /* stockage illisible : progression vide */ }
  return e;
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
      connus: [...etat.connus], meilleurs: etat.meilleurs, niveaux: etat.niveaux, voix: etat.voix, son: etat.son, langue: etat.langue,
    }));
  } catch { /* stockage plein ou bloqué : tant pis, le jeu continue */ }
}
