// Les petits savoirs sur les pays (data/savoirs.json) : une capitale et trois choses à retenir par pays.
export const CAPITALE = { fr: 'Capitale : ', en: 'Capital: ' };

// Tout ce qu'on sait d'un pays, dans une langue : { capitale, faits: [{ e, texte, img? }] }, ou null.
// capitale null : capitale disputée (Israël, Palestine), on n'en montre pas.
// img : { src, l, h, auteur, licence, source }, une image trouvée sur Wikimedia Commons (pour quelques pays seulement).
export function fiche(savoirs, code, langue) {
  const s = code && savoirs[code];
  if (!s) return null;
  return { capitale: s.capitale ? s.capitale[langue] : null, faits: s.faits.map(f => f.img ? { e: f.e, texte: f[langue], img: f.img } : { e: f.e, texte: f[langue] }) };
}

// Un seul savoir à la fois : ceux qui ont une image d'abord, puis les autres, puis la capitale, puis on recommence.
// vus : Map code -> nombre de savoirs déjà montrés pour ce pays.
export function prochainSavoir(savoirs, code, langue, vus) {
  const f = fiche(savoirs, code, langue);
  if (!f) return null;
  const faits = [...f.faits.filter(x => x.img), ...f.faits.filter(x => !x.img)];
  const liste = f.capitale ? [...faits, { e: '⭐', texte: CAPITALE[langue] + f.capitale }] : faits;
  const n = vus.get(code) || 0;
  vus.set(code, n + 1);
  return liste[n % liste.length];
}

// Le texte d'une licence (null : domaine public, il n'y en a pas).
export function lienLicence(licence) {
  if (licence === 'CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  const m = /^CC BY(-SA)? (\d\.\d)$/.exec(licence);
  return m ? `https://creativecommons.org/licenses/by${m[1] ? '-sa' : ''}/${m[2]}/` : null;
}

// La page des crédits : les pays qui ont des images, dans l'ordre alphabétique de la langue.
export function creditsImages(savoirs, nomDe, langue) {
  return Object.keys(savoirs)
    .map(code => ({ code, nom: nomDe(code), images: savoirs[code].faits.filter(f => f.img).map(f => ({
      e: f.e, texte: f[langue], auteur: f.img.auteur, licence: f.img.licence, source: f.img.source,
      fichier: decodeURIComponent(f.img.source.split('File:')[1]).replaceAll('_', ' ') })) }))
    .filter(p => p.images.length)
    .sort((a, b) => a.nom.localeCompare(b.nom, langue));
}
