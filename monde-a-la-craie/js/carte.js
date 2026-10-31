// La carte à la craie : dessin d'une zone en SVG, zoom (pincer, molette, glisser), toucher, marques sur les pays.
// d3 (d3-geo) et topojson sont chargés avant les modules, en scripts classiques (lib/).
import { ANCRES, cadrePoints } from './zones.js';
import { paysTouche, PETIT } from './toucher.js';

const d3 = globalThis.d3, topojson = globalThis.topojson;
const NS = 'http://www.w3.org/2000/svg';
const ZOOM_MAX = 8;
const TAP_DISTANCE = 10, TAP_DUREE = 500;   // au-delà : c'est un geste, pas un toucher
const ROND = 7;                              // px : rond de craie autour d'un tout petit pays

export async function chargerMonde(url) {
  const topo = await (await fetch(url)).json();
  return topojson.feature(topo, topo.objects.pays).features;
}

function el(nom, attrs = {}, parent) {
  const e = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

// La plus grande forme d'un pays : c'est là qu'on écrit son nom.
function plusGrandePartie(f) {
  if (!f.geometry || f.geometry.type !== 'MultiPolygon') return f;
  let max = -1, best = null;
  for (const coords of f.geometry.coordinates) {
    const p = { type: 'Polygon', coordinates: coords }, a = d3.geoArea(p);
    if (a > max) { max = a; best = p; }
  }
  return best;
}

const FILTRE = `<filter id="craie" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" result="b"/>
  <feDisplacementMap in="SourceGraphic" in2="b" scale="1.6" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" result="g"/>
  <feColorMatrix in="g" type="luminanceToAlpha" result="ga0"/>
  <feComponentTransfer in="ga0" result="ga"><feFuncA type="linear" slope="5" intercept="-3.2"/></feComponentTransfer>
  <feComposite in="d" in2="ga" operator="out"/>
</filter>`;

// marges : place laissée autour de la carte (le nom à trouver en haut, les boutons en bas), en px.
export function creerCarte(svg, monde, zone, marges = {}) {
  const m = { haut: 12, bas: 12, gauche: 12, droite: 12, ...marges };
  svg.innerHTML = '';
  el('defs', {}, svg).innerHTML = FILTRE;
  const vue = el('g', { class: 'vue' }, svg);
  const terres = el('g', { class: 'terres' }, vue);
  const ronds = el('g', { class: 'ronds' }, vue);
  const marquesG = el('g', { class: 'marques' }, vue);

  const pays = monde.map(f => ({ f, code: f.properties.code, partie: plusGrandePartie(f),
    path: f.geometry ? el('path', { class: 'pays', 'data-code': f.properties.code }, terres) : null }));
  const parCode = new Map(pays.map(p => [p.code, p]));
  const marques = new Map();   // code -> { etat, couleur, texte }
  let W = 0, H = 0, rect = null, projection = null, k = 1, tx = 0, ty = 0, rappel = () => {};

  const carte = {
    zone,
    get zoom() { return k; },
    zoneVisible: null,
    surToucher(fn) { rappel = fn; },

    recadrer() {
      rect = svg.getBoundingClientRect();
      W = rect.width; H = rect.height;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const ext = [[m.gauche, m.haut], [Math.max(m.gauche + 10, W - m.droite), Math.max(m.haut + 10, H - m.bas)]];
      projection = zone.projection().fitExtent(ext, cadrePoints(zone.cadre));
      const path = d3.geoPath(projection);
      for (const p of pays) {
        if (p.path) p.path.setAttribute('d', path(p.f) || '');
        const point = p.f.properties.point;
        if (point) {
          const [x, y] = projection(point); p.bornes = [[x, y], [x, y]]; p.centre = [x, y];
        } else {
          p.bornes = path.bounds(p.f);
          p.centre = ANCRES[p.code] ? projection(ANCRES[p.code]) : path.centroid(p.partie);
        }
        p.rayon = Math.max(p.bornes[1][0] - p.bornes[0][0], p.bornes[1][1] - p.bornes[0][1]) / 2;
      }
      carte.zoneVisible = { x0: rect.left + ext[0][0], y0: rect.top + ext[0][1], x1: rect.left + ext[1][0], y1: rect.top + ext[1][1] };
      carte.vueEntiere();
    },

    vueEntiere() { k = 1; tx = 0; ty = 0; appliquer(); },

    // Position à l'écran (coordonnées de la page) de l'endroit où l'on écrit le nom d'un pays.
    ancreEcran(code) {
      const p = parCode.get(code);
      return [rect.left + tx + p.centre[0] * k, rect.top + ty + p.centre[1] * k];
    },

    // Le pays sous un point de l'écran (coordonnées du SVG), avec les règles des petits pays.
    paysEn(x, y) {
      const versCarte = q => [(q[0] - tx) / k, (q[1] - ty) / k];
      const cibles = pays.map(p => ({
        code: p.code,
        centre: [tx + p.centre[0] * k, ty + p.centre[1] * k],
        rayon: p.rayon * k,
        contient: q => {
          if (!p.f.geometry) return false;
          const [mx, my] = versCarte(q), b = p.bornes;
          if (mx < b[0][0] || mx > b[1][0] || my < b[0][1] || my > b[1][1]) return false;
          const lonlat = projection.invert([mx, my]);
          return !!lonlat && isFinite(lonlat[0]) && d3.geoContains(p.f, lonlat);
        },
      }));
      return paysTouche([x, y], cibles);
    },

    // etat : 'vide' | 'trouve' | 'erreur' | 'montre' ; couleur 1 à 4 pour un pays trouvé.
    etat(code, etat, couleur = 1) {
      const d = marques.get(code) || {};
      marques.set(code, { ...d, etat, couleur });
      dessinerMarques();
    },
    ecrire(code, texte) {
      const d = marques.get(code) || { etat: 'vide' };
      marques.set(code, { ...d, texte });
      dessinerMarques();
    },
    effacer() { marques.clear(); dessinerMarques(); },
    detruire() { window.removeEventListener('resize', surRedim); },
  };

  function appliquer() {
    const maxX = 0, minX = W - W * k, maxY = 0, minY = H - H * k;
    tx = Math.min(maxX, Math.max(minX, tx)); ty = Math.min(maxY, Math.max(minY, ty));
    vue.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
    dessinerRonds();
    dessinerMarques();
  }

  // Un rond de craie autour des pays trop petits pour être vus (et qu'on peut quand même toucher).
  function dessinerRonds() {
    ronds.innerHTML = '';
    for (const p of pays) {
      if (p.rayon * k >= PETIT) continue;
      el('circle', { cx: p.centre[0], cy: p.centre[1], r: ROND / k, class: 'rond' + (p.f.properties.quiz ? '' : ' territoire'), 'data-code': p.code }, ronds);
    }
  }

  function dessinerMarques() {
    marquesG.innerHTML = '';
    for (const p of pays) {
      const d = marques.get(p.code);
      const classes = ['pays'];
      if (d && d.etat === 'trouve') classes.push('trouve', 'c' + d.couleur);
      if (d && d.etat === 'erreur') classes.push('erreur');
      if (d && d.etat === 'montre') classes.push('montre');
      if (p.path) p.path.setAttribute('class', classes.join(' '));
      const rond = ronds.querySelector(`[data-code="${p.code}"]`);
      if (rond) rond.setAttribute('class', 'rond' + (d && d.etat === 'trouve' ? ' trouve c' + d.couleur : '') + (p.f.properties.quiz ? '' : ' territoire'));
      if (!d) continue;
      const [x, y] = p.centre, u = 1 / k;
      if (d.etat === 'erreur') {
        const s = 9 * u;
        el('path', { class: 'croix', d: `M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}` }, marquesG);
      }
      if (d.etat === 'montre') {
        const b = p.bornes, rx = Math.max((b[1][0] - b[0][0]) / 2 + 10 * u, 22 * u), ry = Math.max((b[1][1] - b[0][1]) / 2 + 10 * u, 22 * u);
        el('ellipse', { class: 'entoure', cx: (b[0][0] + b[1][0]) / 2, cy: (b[0][1] + b[1][1]) / 2, rx, ry }, marquesG);
      }
      if (d.texte) {
        const t = el('text', { class: 'nom-pays', x, y: y - (d.etat === 'erreur' ? 14 : 0) * u, 'font-size': 18 * u, 'stroke-width': 4 * u }, marquesG);
        t.textContent = d.texte;
      }
    }
  }

  function zoomAutour(px, py, facteur) {
    const k2 = Math.min(ZOOM_MAX, Math.max(1, k * facteur));
    tx = px - (px - tx) * k2 / k; ty = py - (py - ty) * k2 / k; k = k2;
    appliquer();
  }

  // Gestes : un doigt qui bouge déplace, deux doigts zooment ; seul un toucher bref et immobile répond.
  const doigts = new Map();
  let geste = null;
  const local = e => [e.clientX - rect.left, e.clientY - rect.top];
  const ecart = () => { const [a, b] = [...doigts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  const milieu = () => { const [a, b] = [...doigts.values()]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };

  svg.addEventListener('pointerdown', e => {
    try { svg.setPointerCapture(e.pointerId); } catch { /* évènement de test */ }
    doigts.set(e.pointerId, local(e));
    if (doigts.size === 1) geste = { t: performance.now(), depart: local(e), bouge: false, multi: false };
    else if (geste) { geste.multi = true; geste.ecart = ecart(); geste.milieu = milieu(); }
  });
  svg.addEventListener('pointermove', e => {
    if (!doigts.has(e.pointerId) || !geste) return;
    const avant = doigts.get(e.pointerId), ici = local(e);
    doigts.set(e.pointerId, ici);
    if (doigts.size === 1) {
      if (Math.hypot(ici[0] - geste.depart[0], ici[1] - geste.depart[1]) > TAP_DISTANCE) geste.bouge = true;
      if (geste.bouge) { tx += ici[0] - avant[0]; ty += ici[1] - avant[1]; appliquer(); }
    } else if (doigts.size === 2) {
      const e2 = ecart(), m2 = milieu();
      tx += m2[0] - geste.milieu[0]; ty += m2[1] - geste.milieu[1];
      zoomAutour(m2[0], m2[1], e2 / (geste.ecart || e2));
      geste.ecart = e2; geste.milieu = m2;
    }
  });
  const fin = e => {
    if (!doigts.has(e.pointerId)) return;
    doigts.delete(e.pointerId);
    if (doigts.size || !geste) return;
    const g = geste; geste = null;
    if (e.type === 'pointerup' && !g.bouge && !g.multi && performance.now() - g.t < TAP_DUREE) rappel(carte.paysEn(...local(e)));
  };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', fin);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAutour(x, y, e.deltaY < 0 ? 1.25 : 0.8);
  }, { passive: false });

  let attente = 0;
  function surRedim() { cancelAnimationFrame(attente); attente = requestAnimationFrame(() => carte.recadrer()); }
  window.addEventListener('resize', surRedim);

  carte.recadrer();
  return carte;
}
