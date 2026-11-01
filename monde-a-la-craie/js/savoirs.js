// Les petits savoirs sur les pays (data/savoirs.json) : une capitale et trois choses à retenir par pays.
export const CAPITALE = { fr: 'Capitale : ', en: 'Capital: ' };

// Tout ce qu'on sait d'un pays, dans une langue : { capitale, faits: [{ e, texte }] }, ou null.
export function fiche(savoirs, code, langue) {
  const s = code && savoirs[code];
  if (!s) return null;
  return { capitale: s.capitale[langue], faits: s.faits.map(f => ({ e: f.e, texte: f[langue] })) };
}

// Après une erreur, un seul savoir : les trois l'un après l'autre, puis la capitale, puis on recommence.
// vus : Map code -> nombre de savoirs déjà montrés pour ce pays.
export function prochainSavoir(savoirs, code, langue, vus) {
  const f = fiche(savoirs, code, langue);
  if (!f) return null;
  const liste = [...f.faits, { e: '⭐', texte: CAPITALE[langue] + f.capitale }];
  const n = vus.get(code) || 0;
  vus.set(code, n + 1);
  return liste[n % liste.length];
}
