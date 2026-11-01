// La progression, gardée sur l'appareil. Dans Ludiworld, une progression par enfant (rangée sous son prénom).

const BASE = 'monde-a-la-craie.v1';

export function cle(joueur) {
  return joueur ? BASE + '.' + encodeURIComponent(joueur) : BASE;
}

function etatVide() {
  return { connus: new Set(), meilleurs: {}, voix: false, son: true, langue: null };   // langue null : celle de l'appareil
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
    if (typeof d.voix === 'boolean') e.voix = d.voix;
    if (typeof d.son === 'boolean') e.son = d.son;
    if (d.langue === 'fr' || d.langue === 'en') e.langue = d.langue;
  } catch { /* stockage illisible : progression vide */ }
  return e;
}

// resultats : Map code -> vrai si trouvé du premier coup. temps : secondes de la manche.
export function enregistrerManche(etat, zone, resultats, temps) {
  for (const [code, ok] of resultats) {
    if (ok) etat.connus.add(code); else etat.connus.delete(code);
  }
  const avant = etat.meilleurs[zone];
  const record = !(avant <= temps);
  if (record) etat.meilleurs[zone] = temps;
  return { record };
}

export function sauver(joueur, etat, stockage = stockageParDefaut()) {
  try {
    stockage && stockage.setItem(cle(joueur), JSON.stringify({
      connus: [...etat.connus], meilleurs: etat.meilleurs, voix: etat.voix, son: etat.son, langue: etat.langue,
    }));
  } catch { /* stockage plein ou bloqué : tant pis, le jeu continue */ }
}
