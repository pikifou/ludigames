// Prépare la carte du Monde à la craie : node tools/carte.js
// Source : Natural Earth 1:50 m (domaine public) via world-atlas, corrigée pour suivre un atlas scolaire français.
// Écrit monde-a-la-craie/data/monde.json (TopoJSON, objet « pays ») et copie les bibliothèques dans monde-a-la-craie/lib/.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import vm from 'node:vm';

const racine = new URL('../', import.meta.url);
const cache = new URL('tools/.cache/', racine);
const jeu = new URL('monde-a-la-craie/', racine);
const SOURCES = {
  'countries-50m.json': 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
  'codes.json': 'https://cdn.jsdelivr.net/npm/i18n-iso-countries@7.14.0/codes.json',
  'd3-array.min.js': 'https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js',
  'd3-geo.min.js': 'https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js',
  'topojson-client.min.js': 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js',
};
const LIBS = ['d3-array.min.js', 'd3-geo.min.js', 'topojson-client.min.js'];

async function telecharger() {
  mkdirSync(cache, { recursive: true });
  for (const [f, url] of Object.entries(SOURCES)) {
    if (existsSync(new URL(f, cache))) continue;
    const r = await fetch(url);
    if (!r.ok) throw new Error(url + ' : ' + r.status);
    writeFileSync(new URL(f, cache), Buffer.from(await r.arrayBuffer()));
  }
}

function charger() {
  const ctx = { d3: {} }; ctx.self = ctx; ctx.globalThis = ctx;
  for (const f of LIBS) vm.runInNewContext(readFileSync(new URL(f, cache), 'utf8'), ctx);
  return ctx;
}

// Nom par défaut (CLDR, via Intl), puis petites corrections d'usage.
const NOMS = { fr: new Intl.DisplayNames(['fr'], { type: 'region' }), en: new Intl.DisplayNames(['en'], { type: 'region' }) };
function nomParDefaut(code, langue) {
  let n = NOMS[langue].of(code).replace(/’/g, "'");
  if (langue === 'en') n = n.replace(/ & /g, ' and ').replace(/^St\. /, 'Saint ');
  return n;
}

// Les morceaux d'outre-mer collés à la France dans Natural Earth deviennent des territoires.
const OUTRE_MER = [['GF', [-53, 4]], ['GP', [-61.5, 16.2]], ['MQ', [-61, 14.65]], ['RE', [55.5, -21.1]], ['YT', [45.15, -12.8]]];

async function principal() {
  await telecharger();
  const { d3, topojson } = charger();
  const topo = JSON.parse(readFileSync(new URL('countries-50m.json', cache), 'utf8'));
  const codes = JSON.parse(readFileSync(new URL('codes.json', cache), 'utf8'));
  const table = JSON.parse(readFileSync(new URL('tools/pays.json', racine), 'utf8'));
  const num = Object.fromEntries(codes.map(([a2, , n]) => [n, a2]));

  // 1. Un code alpha-2 par forme ; les formes à fusionner sont mises de côté.
  const SANS_ID = { 'Kosovo': 'XK' };
  const FUSION = { 'Somaliland': 'SO', 'N. Cyprus': 'CY', 'Siachen Glacier': 'IN' };
  const SUPPRIMER = new Set(['Indian Ocean Ter.', 'Antarctica']);
  const formes = {}, aFusionner = {};
  for (const g of topo.objects.countries.geometries) {
    const nom = g.properties.name;
    if (SUPPRIMER.has(nom)) continue;
    if (FUSION[nom]) { (aFusionner[FUSION[nom]] ||= []).push(g); continue; }
    const code = num[g.id] || SANS_ID[nom];
    if (!code) throw new Error('forme sans code : ' + nom);
    // Deux formes pour un même code (Australie et îlots Ashmore-et-Cartier) : on les réunit plus bas.
    if (formes[code]) (aFusionner[code] ||= []).push(g); else formes[code] = g;
  }
  const polygones = g => g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  const contient = (arcs, point) => d3.geoContains(topojson.feature(topo, { type: 'Polygon', arcs }), point);
  const fusionner = (code, geoms) => {
    const m = topojson.mergeArcs(topo, geoms);
    formes[code] = { type: m.type, arcs: m.arcs, id: formes[code].id };
  };

  // 2. Somaliland, Chypre du Nord, glacier de Siachen : une seule forme avec leur pays.
  for (const [code, geoms] of Object.entries(aFusionner)) fusionner(code, [formes[code], ...geoms]);

  // 3. La Crimée passe de la Russie à l'Ukraine.
  const ru = polygones(formes.RU), i = ru.findIndex(p => contient(p, [34.1, 45.0]));
  if (i < 0) throw new Error('Crimée introuvable dans la Russie');
  const crimee = ru.splice(i, 1)[0];
  formes.RU = { type: 'MultiPolygon', arcs: ru, id: formes.RU.id };
  fusionner('UA', [formes.UA, { type: 'Polygon', arcs: crimee }]);

  // 4. Outre-mer français.
  // Chaque île hors d'Europe va au territoire le plus proche (la Guadeloupe compte plusieurs îles).
  const metropole = [], outreMer = {};
  for (const p of polygones(formes.FR)) {
    const c = d3.geoCentroid(topojson.feature(topo, { type: 'Polygon', arcs: p }));
    if (c[1] > 35) { metropole.push(p); continue; }
    const [code] = OUTRE_MER.reduce((m, o) => d3.geoDistance(c, o[1]) < d3.geoDistance(c, m[1]) ? o : m);
    (outreMer[code] ||= []).push(p);
  }
  for (const [code] of OUTRE_MER) {
    if (!outreMer[code]) throw new Error('pas de forme pour ' + code + ' dans la France');
    formes[code] = { type: 'MultiPolygon', arcs: outreMer[code] };
  }
  formes.FR = { type: 'MultiPolygon', arcs: metropole, id: formes.FR.id };

  // 5. Propriétés.
  const geometries = [];
  for (const [code, g] of Object.entries(formes)) {
    const t = table[code];
    if (!t) throw new Error('pas d\'entrée dans tools/pays.json pour ' + code);
    geometries.push({ type: g.type, arcs: g.arcs, properties: proprietes(code, t) });
  }
  for (const [code, t] of Object.entries(table)) {
    if (formes[code]) continue;
    if (!t.point) throw new Error(code + ' : ni forme ni point');
    geometries.push({ type: null, properties: proprietes(code, t) });
  }

  // 6. Rang de superficie dans chaque zone (1 = le plus grand), pour les pays interrogés.
  const aire = g => g.type ? d3.geoArea(topojson.feature(topo, g)) : 0;
  const zones = {};
  for (const g of geometries) if (g.properties.quiz) (zones[g.properties.zone] ||= []).push([aire(g), g]);
  for (const l of Object.values(zones)) l.sort((a, b) => b[0] - a[0]).forEach(([, g], k) => { g.properties.rang = k + 1; });

  geometries.sort((a, b) => a.properties.code.localeCompare(b.properties.code));
  const sortie = { type: 'Topology', bbox: topo.bbox, transform: topo.transform, arcs: topo.arcs,
    objects: { pays: { type: 'GeometryCollection', geometries } } };
  mkdirSync(new URL('data/', jeu), { recursive: true });
  writeFileSync(new URL('data/monde.json', jeu), JSON.stringify(sortie));

  mkdirSync(new URL('lib/', jeu), { recursive: true });
  for (const f of LIBS) copyFileSync(new URL(f, cache), new URL('lib/' + f, jeu));
  writeFileSync(new URL('lib/LICENSE', jeu), LICENCE);
  console.log(geometries.length + ' formes, ' + geometries.filter(g => g.properties.quiz).length + ' pays interrogés');
}

function proprietes(code, t) {
  const p = { code, fr: t.fr || nomParDefaut(code, 'fr'), en: t.en || nomParDefaut(code, 'en'), zone: t.zone, quiz: !!t.quiz };
  if (t.de) p.de = t.de;
  if (t.point) p.point = t.point;
  return p;
}

const LICENCE = `d3-array, d3-geo (https://d3js.org) : licence ISC, copyright Mike Bostock.
topojson-client (https://github.com/topojson/topojson-client) : licence ISC, copyright Mike Bostock.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby
granted, provided that the above copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE.

Carte : Natural Earth (https://www.naturalearthdata.com), domaine public, via world-atlas (licence ISC).
`;

principal().catch(e => { console.error(e.message); process.exit(1); });
