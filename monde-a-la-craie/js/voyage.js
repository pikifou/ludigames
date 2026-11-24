// Le carnet de voyage de Nina : un tampon par continent, dessiné avec la vraie forme du continent (les données de la carte).
// Un tampon gagné : encre pleine, penché, avec une coche. Pas encore : un rond en pointillés, le continent pâle.
import { ZONES, cadrePoints } from './zones.js';
import { t } from './textes.js';
import { MEDAILLES } from './regles.js';
import { NIVEAUX } from './niveaux.js';

const d3 = globalThis.d3;
const formes = new Map();   // zone -> le tracé de son continent dans un carré de 40 (calculé une fois)

function formeDe(monde, zone) {
  if (!formes.has(zone.id)) {
    const projection = zone.projection().fitExtent([[5, 5], [35, 35]], cadrePoints(zone.cadre));
    const path = d3.geoPath(projection).digits(1);
    formes.set(zone.id, monde.filter(f => f.properties.zone === zone.id && f.geometry).map(f => path(f) || '').join(''));
  }
  return formes.get(zone.id);
}

// Un tampon : la forme du continent dans un rond (ou un rond en pointillés tant qu'il n'est pas gagné).
export function tampon(monde, zone, gagne, langue, classe = '') {
  const nom = zone[langue];
  return `<span class="tampon${gagne ? ' gagne' : ''} ${classe}" data-continent="${zone.id}" role="img" aria-label="${t(gagne ? 'tamponGagne' : 'tamponAGagner', { z: nom })}">
    <svg viewBox="0 0 40 40" aria-hidden="true"><circle class="bord" cx="20" cy="20" r="18.5"/>
      <clipPath id="tampon-${zone.id}${classe ? '-' + classe : ''}"><circle cx="20" cy="20" r="17"/></clipPath>
      <path class="forme" d="${formeDe(monde, zone)}" clip-path="url(#tampon-${zone.id}${classe ? '-' + classe : ''})"/>
      ${gagne ? '<path class="coche" d="M27 30.5l3.2 3.2 6-7"/>' : ''}</svg></span>`;
}

// Une médaille d'épreuve : sa couleur, et une, deux ou trois étoiles (bronze, argent, or) pour la distinguer sans les couleurs.
// type null : la place d'une médaille pas encore gagnée (un rond en pointillés).
const ETOILES = { 1: [20], 2: [14.5, 25.5], 3: [11, 20, 29] };
function etoile(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1));
  }
  return `<polygon class="etoile" points="${pts.join(' ')}"/>`;
}
export function medaille(type, classe = '') {
  if (!MEDAILLES.includes(type)) {
    return `<span class="medaille vide ${classe}" role="img" aria-label="${t('pasDeMedaille')}"><svg viewBox="0 0 40 48" aria-hidden="true">
      <circle class="disque" cx="20" cy="28" r="15"/></svg></span>`;
  }
  const n = MEDAILLES.indexOf(type) + 1;
  const etoiles = ETOILES[n].map((x, i) => etoile(x, n === 3 && i === 1 ? 26.5 : 29, n === 3 ? 4.6 : 5.4)).join('');
  return `<span class="medaille ${type} ${classe}" role="img" aria-label="${t('medaille_' + type)}"><svg viewBox="0 0 40 48" aria-hidden="true">
    <path class="ruban" d="M11 2h7l4 13h-7zM29 2h-7l-4 13h7z"/>
    <circle class="disque" cx="20" cy="28" r="15"/><circle class="bord-int" cx="20" cy="28" r="11.5"/>${etoiles}</svg></span>`;
}

// La bande du carnet sur l'accueil : Nina, les six tampons, et où on en est.
export function carnet(app) {
  const v = app.etat.voyage, n = v.etapes.length;
  const tampons = ZONES.map(z => tampon(app.monde, z, v.etapes.includes(z.id), app.langue)).join('');
  const etat = v.fini
    ? `<span class="marque-fini"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${t('fini')}</span>
       <span class="complet">${t('mondeConnu', { p: Math.round(app.partConnue() * 100) })}</span>`
    : `<span class="etapes">${t('tourDuMonde', { n })}</span>`;
  return `<button class="carnet${v.fini ? ' fini' : ''}" data-action="carnet" aria-label="${t('carnetTitre')}">
    <img class="nina" src="img/histoire/nina.webp" alt="" width="48" height="48">
    <span class="carnet-corps"><span class="tampons">${tampons}</span><span class="carnet-etat">${etat}</span></span></button>`;
}

// Le carnet ouvert : chaque continent, son tampon, ses trois médailles (Facile, Moyen, Difficile : un, deux, trois traits),
// et ce qu'il reste à faire pour le tampon : connaître des pays pour ouvrir l'épreuve Facile, puis la passer.
export function pageCarnet(app) {
  const v = app.etat.voyage;
  const lignes = ZONES.map(z => {
    const gagne = v.etapes.includes(z.id), e = app.epreuve(z.id, 'facile');
    const etat = gagne ? t('carnetGagne') : e.ouverte ? t('carnetOuverte') : t(e.manque > 1 ? 'carnetManque' : 'carnetManqueUn', { n: e.manque });
    const medailles = NIVEAUX.map((n, i) => `<span class="case-medaille">${medaille(app.epreuve(z.id, n).medaille, 'petite')}
      <span class="traits" aria-label="${t(n)}">${'|'.repeat(i + 1)}</span></span>`).join('');
    return `<li>${tampon(app.monde, z, gagne, app.langue, 'grand')}<span class="craie lisible">${z[app.langue]}</span>
      <small class="lisible">${etat}</small><span class="medailles">${medailles}</span></li>`;
  }).join('');
  return `<p class="grand craie lisible">${t('carnetTitre')}</p>
    <p class="carnet-consigne lisible">${t(v.fini ? 'carnetFini' : 'carnetConsigne')}</p>
    <ul class="carnet-liste">${lignes}</ul>
    <div class="boutons"><button class="bouton-craie plein" data-action="fermer">${t('retour')}</button></div>
    <button class="lien-craie" data-action="revoir-intro">${t('revoirDepart')}</button>
    ${v.fini ? `<button class="lien-craie" data-action="revoir-fin">${t('revoirRetour')}</button>` : ''}`;
}

// Le trajet sur la carte du monde : un fil de craie d'un continent tamponné à l'autre, dans l'ordre du voyage, et Nina au dernier.
// points : { zone: [x, y] } en px dans l'écran ; ouLabel(zone) : le rectangle de l'étiquette du continent, s'il est sur la carte.
export function trajet(svg, etapes, points) {
  const p = etapes.map(z => points[z]).filter(Boolean);
  let d = '';
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1], [x1, y1] = p[i];
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
    // une courbe qui monte un peu, comme un trajet d'avion sur une carte
    const cx = (x0 + x1) / 2 + dy / l * l * 0.18, cy = (y0 + y1) / 2 - Math.abs(dx / l) * l * 0.22;
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  svg.innerHTML = d ? `<path d="${d}"/>` : '';
}
