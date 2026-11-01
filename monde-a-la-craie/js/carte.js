// La carte à la craie : dessin d'une zone en SVG, zoom (pincer, molette, glisser), toucher, marques sur les pays.
// d3 (d3-geo) et topojson sont chargés avant les modules, en scripts classiques (lib/).
import { ANCRES, cadrePoints } from './zones.js';
import { paysTouche, PETIT, RAYON_PETIT, RAYON_MIN } from './toucher.js';

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

// Ce qu'on entoure pour montrer un pays : sa plus grande terre et les îles toutes proches,
// pas les îles lointaines (les Açores pour le Portugal, les Galápagos, Hawaï, les îles des Caraïbes pour les Pays-Bas).
function bornesProches(f, partie, path) {
  const b = path.bounds(partie);
  if (!b.flat().every(isFinite)) return path.bounds(f);
  if (!f.geometry || f.geometry.type !== 'MultiPolygon') return b;
  const marge = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) / 2;
  let [[x0, y0], [x1, y1]] = b;
  for (const coords of f.geometry.coordinates) {
    const c = path.bounds({ type: 'Polygon', coordinates: coords });
    if (!c.flat().every(isFinite)) continue;
    if (c[1][0] < b[0][0] - marge || c[0][0] > b[1][0] + marge || c[1][1] < b[0][1] - marge || c[0][1] > b[1][1] + marge) continue;
    x0 = Math.min(x0, c[0][0]); y0 = Math.min(y0, c[0][1]); x1 = Math.max(x1, c[1][0]); y1 = Math.max(y1, c[1][1]);
  }
  return [[x0, y0], [x1, y1]];
}

const TUILES = new Map();   // les tuiles du grain de la mer, par finesse d'écran

const FILTRE = `<filter id="craie" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" result="b"/>
  <feDisplacementMap in="SourceGraphic" in2="b" scale="1.6" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" result="g"/>
  <feColorMatrix in="g" type="luminanceToAlpha" result="ga0"/>
  <feComponentTransfer in="ga0" result="ga"><feFuncA type="linear" slope="5" intercept="-3.2"/></feComponentTransfer>
  <feComposite in="d" in2="ga" operator="out"/>
</filter>`;

// marges : place laissée autour de la carte (le nom à trouver en haut, les boutons en bas), en px.
// Un objet, ou une fonction qui le rend (relue à chaque recadrage : la hauteur du titre change avec l'écran).
// options.ronds(proprietes) : les tout petits pays qui ont leur rond de craie (et qu'on peut toucher sans viser).
// options.estompe(proprietes) : les pays qu'on ne demande pas à ce niveau, dessinés plus pâles.
// options.zoom === false : carte fixe (l'accueil, où les continents sont écrits par-dessus).
export function creerCarte(svg, monde, zone, marges = {}, options = {}) {
  const zoomable = options.zoom !== false;
  const avecRond = options.ronds || (() => true);
  const estompe = options.estompe || (() => false);
  const lireMarges = () => ({ haut: 12, bas: 12, gauche: 12, droite: 12, ...(typeof marges === 'function' ? marges() : marges) });
  svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  defs.innerHTML = FILTRE;
  const vue = el('g', { class: 'vue' }, svg);
  const terres = el('g', { class: 'terres' }, vue);
  // La mer : une toile peinte une fois par recadrage (dégradé le long des côtes, grain de craie, terres découpées),
  // posée sous la carte et déplacée par une transformation CSS : glisser et zoomer ne la redessinent pas.
  for (const v of svg.parentNode.querySelectorAll(':scope > canvas.mer')) v.remove();
  const toile = document.createElement('canvas');
  let formesMer = null, peint = null, attenteMer = 0;   // peint : la vue { k, tx, ty } que la toile montre
  toile.className = 'mer';
  toile.setAttribute('aria-hidden', 'true');
  svg.parentNode.insertBefore(toile, svg);
  if (getComputedStyle(svg).position === 'static') svg.style.position = 'relative';   // la carte reste au-dessus de la mer
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
      const m = lireMarges();
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const ext = [[m.gauche, m.haut], [Math.max(m.gauche + 10, W - m.droite), Math.max(m.haut + 10, H - m.bas)]];
      projection = zone.projection().fitExtent(ext, cadrePoints(zone.cadre));
      const path = d3.geoPath(projection);
      for (const p of pays) {
        if (p.path) p.path.setAttribute('d', path(p.f) || '');
        const point = p.f.properties.point;
        if (point) {
          const [x, y] = path.centroid({ type: 'Point', coordinates: point }); p.bornes = [[x, y], [x, y]]; p.centre = [x, y];
        } else {
          p.bornes = path.bounds(p.f);
          p.centre = ANCRES[p.code] ? projection(ANCRES[p.code]) : path.centroid(p.partie);
        }
        p.entoure = point ? p.bornes : bornesProches(p.f, p.partie, path);
        // La taille d'un pays, c'est celle de sa plus grande terre : Kiribati, éparpillé sur tout le Pacifique, est « petit ».
        const b = point ? p.bornes : path.bounds(p.partie);
        p.rayon = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) / 2;
        p.visible = isFinite(p.centre[0]) && isFinite(p.centre[1]);   // sur l'autre face du globe : ni rond, ni toucher
      }
      // Le globe, rogné au cadre de la carte : sinon certaines projections (l'Europe) lui donnent des coordonnées immenses.
      // (Les pays, eux, ne se rognent pas : d3 en retournerait certains, qui couvriraient alors toute la carte.)
      projection.clipExtent([[-60, -60], [W + 60, H + 60]]);
      const globe = path({ type: 'Sphere' }) || '';
      projection.clipExtent(null);
      const cotes = pays.map(p => p.path ? p.path.getAttribute('d') : '').join('');
      formesMer = { sphere: new Path2D(globe), terre: new Path2D(cotes) };
      peint = null;   // la mer se repeint au prochain appliquer()
      carte.zoneVisible = { x0: rect.left + ext[0][0], y0: rect.top + ext[0][1], x1: rect.left + ext[1][0], y1: rect.top + ext[1][1] };
      carte.vueEntiere();
    },

    vueEntiere() { k = 1; tx = 0; ty = 0; appliquer(); },

    // Position à l'écran (coordonnées de la page) d'un point [longitude, latitude].
    ecranDe(lonlat) {
      const [x, y] = projection(lonlat);
      return [rect.left + tx + x * k, rect.top + ty + y * k];
    },

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
        rayon: avecRond(p.f.properties) && p.visible ? p.rayon * k : Infinity,   // sans rond, un petit pays se touche seulement dans son contour
        contient: q => {
          if (!p.f.geometry || !p.visible) return false;
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
    detruire() { window.removeEventListener('resize', surRedim); clearTimeout(attenteMer); toile.remove(); },
  };

  // La mer à la craie bleue, peinte pour la vue du moment (zoom k, décalage tx, ty) : un fond léger,
  // un liseré clair contre la côte puis une ombre qui montre que l'eau s'enfonce (les terres dessinées en petit et floutées),
  // et un grain de petits traits de craie couchés, de taille constante à l'écran et accrochés à la carte.
  function peindreMer() {
    if (!formesMer) return;
    const { sphere, terre } = formesMer;
    const e = Math.min(window.devicePixelRatio || 1, 2), L = Math.max(1, Math.round(W * e)), Hh = Math.max(1, Math.round(H * e));
    if (toile.width !== L || toile.height !== Hh) { toile.width = L; toile.height = Hh; }
    const ici = svg.getBoundingClientRect(), cadre = (toile.offsetParent || document.body).getBoundingClientRect();
    Object.assign(toile.style, { left: ici.left - cadre.left + 'px', top: ici.top - cadre.top + 'px', width: W + 'px', height: H + 'px' });
    const c = toile.getContext('2d'), bleu = '143, 211, 255', u = Math.max(0.6, Math.min(W, H) / 800);
    const carteVersEcran = (ctx, f) => ctx.setTransform(f * k, 0, 0, f * k, f * tx, f * ty);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, L, Hh);
    carteVersEcran(c, e);
    c.fillStyle = `rgba(${bleu}, .12)`;
    c.fill(sphere);
    c.save();
    c.clip(sphere);
    c.setTransform(e, 0, 0, e, 0, 0);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    // [réduction, flou en px à l'écran, couleur, force] : une ombre large qui s'éteint vers le large, puis un liseré clair et serré.
    for (const [reduit, rayon, couleur, force] of [[4, 18, '12, 22, 19', .7], [2, 3, bleu, .75]]) {
      const petite = document.createElement('canvas'), r = 1 / reduit;
      petite.width = Math.max(1, Math.ceil(W * r)); petite.height = Math.max(1, Math.ceil(H * r));
      const p = petite.getContext('2d');
      if ('filter' in p) p.filter = `blur(${rayon * u * r}px)`;   // sinon (vieux Safari), l'agrandissement seul adoucit le bord
      carteVersEcran(p, r); p.fillStyle = `rgb(${couleur})`; p.fill(terre);
      c.globalAlpha = force;
      c.drawImage(petite, 0, 0, petite.width / r, petite.height / r);
    }
    c.globalAlpha = 1;
    // Le grain : une tuile de petits traits répétée sur toute la mer, accrochée à la carte (elle suit les glisser),
    // de taille constante à l'écran. Des traits clairs, puis des creux où la craie n'a pas pris.
    const t = tuilesGrain(e, u);
    for (const [mode, tuile] of [['source-over', t.clair], ['destination-out', t.creux]]) {
      const motif = c.createPattern(tuile, 'repeat');
      motif.setTransform(new DOMMatrix().translate(tx, ty).scale(1 / e));
      c.globalCompositeOperation = mode; c.fillStyle = motif;
      c.fillRect(0, 0, W, H);
    }
    c.restore();
    // Les terres découpées : la mer s'arrête à la côte (les lacs, trous dans les pays, restent de l'eau).
    carteVersEcran(c, e);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    c.fill(terre);
    c.globalCompositeOperation = 'source-over';
    c.setTransform(1, 0, 0, 1, 0, 0);
    peint = { k, tx, ty };
    toile.style.transform = '';
    carte.toileMer = toile;
  }

  // Les deux tuiles du grain (dessinées une fois) : traits clairs, et creux à effacer.
  function tuilesGrain(e, u) {
    const cle = e + '/' + u;
    if (TUILES.has(cle)) return TUILES.get(cle);
    const S = Math.round(160 * u), bleu = '143, 211, 255';
    let graine = 7;
    const hasard = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
    const dessiner = teintes => {
      const t = document.createElement('canvas');
      t.width = t.height = Math.round(S * e);
      const c = t.getContext('2d');
      c.scale(e, e); c.lineCap = 'round'; c.lineWidth = 1.3 * u;
      for (const teinte of teintes) {
        c.strokeStyle = teinte; c.beginPath();
        for (let i = 0; i < S * S / 400; i++) {
          const x = hasard() * S, y = hasard() * S, l = (2 + hasard() * 5) * u, a = -0.45 + hasard() * 0.25;
          for (const [dx, dy] of [[0, 0], [-S, 0], [0, -S], [-S, -S]]) {   // les traits qui dépassent reviennent de l'autre côté
            c.moveTo(x + dx, y + dy); c.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l);
          }
        }
        c.stroke();
      }
      return t;
    };
    const t = { clair: dessiner([`rgba(${bleu}, .10)`, `rgba(${bleu}, .17)`]), creux: dessiner(['rgba(0, 0, 0, .35)', 'rgba(0, 0, 0, .55)']) };
    TUILES.set(cle, t);
    return t;
  }

  // Pendant un geste, la toile suit la carte (une transformation CSS, sans rien redessiner) ;
  // un instant après, on la repeint à la nouvelle échelle.
  function suivreMer() {
    clearTimeout(attenteMer);
    if (!peint) return peindreMer();
    if (peint.k === k && peint.tx === tx && peint.ty === ty) return;
    const f = k / peint.k;
    toile.style.transform = `translate(${tx - peint.tx * f}px, ${ty - peint.ty * f}px) scale(${f})`;
    attenteMer = setTimeout(peindreMer, 220);
  }

  function appliquer() {
    const maxX = 0, minX = W - W * k, maxY = 0, minY = H - H * k;
    tx = Math.min(maxX, Math.max(minX, tx)); ty = Math.min(maxY, Math.max(minY, ty));
    vue.setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`);
    suivreMer();
    dessinerRonds();
    dessinerMarques();
  }

  // Un rond de craie autour des pays trop petits pour être vus (et qu'on peut quand même toucher).
  function dessinerRonds() {
    ronds.innerHTML = '';
    for (const p of pays) {
      if (!p.visible || p.rayon * k >= PETIT || !avecRond(p.f.properties)) continue;
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
      if ((!d || d.etat === 'vide') && estompe(p.f.properties)) classes.push('estompe');
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
        const b = p.entoure, rx = Math.max((b[1][0] - b[0][0]) / 2 + 10 * u, 22 * u), ry = Math.max((b[1][1] - b[0][1]) / 2 + 10 * u, 22 * u);
        el('ellipse', { class: 'entoure', cx: (b[0][0] + b[1][0]) / 2, cy: (b[0][1] + b[1][1]) / 2, rx, ry }, marquesG);
      }
      if (d.texte) {
        const t = el('text', { class: 'nom-pays', x, y: y - (d.etat === 'erreur' ? 14 : 0) * u, 'font-size': 18 * u, 'stroke-width': 4 * u }, marquesG);
        t.textContent = d.texte;
      }
    }
  }

  function ambigu(x, y, code) {
    const ecran = p => [tx + p.centre[0] * k, ty + p.centre[1] * k];
    const d = p => { const [cx, cy] = ecran(p); return Math.hypot(x - cx, y - cy); };
    const petit = p => p.visible && p.rayon * k < PETIT && avecRond(p.f.properties);
    const vise = parCode.get(code);
    if (vise && petit(vise) && d(vise) <= RAYON_PETIT) return false;   // le rond touché : c'est voulu
    return pays.some(p => p.code !== code && petit(p) && d(p) <= RAYON_MIN);
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
      if (geste.bouge && zoomable) { tx += ici[0] - avant[0]; ty += ici[1] - avant[1]; appliquer(); }
    } else if (doigts.size === 2 && zoomable) {
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
    if (e.type !== 'pointerup' || g.bouge || g.multi || performance.now() - g.t >= TAP_DUREE) return;
    const [x, y] = local(e), code = carte.paysEn(x, y);
    // Le doigt est tombé près d'un tout petit pays sans viser son rond : on zoome au lieu de répondre.
    if (zoomable && k < ZOOM_MAX && ambigu(x, y, code)) { zoomAutour(x, y, 2.5); return; }
    rappel(code);
  };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', fin);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    if (!zoomable) return;
    const [x, y] = local(e);
    zoomAutour(x, y, e.deltaY < 0 ? 1.25 : 0.8);
  }, { passive: false });

  let attente = 0;
  function surRedim() { cancelAnimationFrame(attente); attente = requestAnimationFrame(() => carte.recadrer()); }
  window.addEventListener('resize', surRedim);

  carte.recadrer();
  return carte;
}
