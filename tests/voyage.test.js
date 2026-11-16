// Le tour du monde de Nina : node --test tests/voyage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { SEUIL_ETAPE, besoinEtape, nouvellesEtapes, tourFait, ZONES_IDS } from '../monde-a-la-craie/js/regles.js';
import { LISTES, niveauDe } from '../monde-a-la-craie/js/niveaux.js';
import { charger, sauver, versPartage, depuisPartage, enregistrerManche } from '../monde-a-la-craie/js/progres.js';
import { readFileSync } from 'node:fs';

function memoire() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

// Les pays Facile de chaque continent, d'après la vraie carte du jeu.
const monde = JSON.parse(readFileSync(new URL('../monde-a-la-craie/data/monde.json', import.meta.url), 'utf8'));
const geometries = monde.objects ? Object.values(monde.objects)[0].geometries : monde.features;
const FACILES = {};
for (const g of geometries) {
  const p = g.properties;
  if (p.quiz && niveauDe(p.code) === 'facile') (FACILES[p.zone] ??= []).push(p.code);
}

test('chaque continent a des pays Facile, et le seuil d’étape est atteignable', () => {
  for (const z of ZONES_IDS) assert.ok(FACILES[z] && FACILES[z].length >= 4, z);
  assert.equal(Object.values(FACILES).flat().length, LISTES.facile.length);
  assert.equal(SEUIL_ETAPE, 0.75);
  // Ce qu'il faut connaître : Europe 11/14, Afrique et Asie 9/12, Amériques 5/6, Océanie 3/4.
  const besoin = Object.fromEntries(ZONES_IDS.map(z => [z, besoinEtape(FACILES[z], new Set()).besoin]));
  assert.deepEqual(besoin, { europe: 11, afrique: 9, asie: 9, 'amerique-nord': 5, 'amerique-sud': 5, oceanie: 3 });
  assert.equal(Object.values(besoin).reduce((a, b) => a + b), 42);
});

test('une étape se gagne aux trois quarts des pays Facile du continent', () => {
  const oc = FACILES.oceanie;
  assert.deepEqual(nouvellesEtapes(FACILES, new Set(oc.slice(0, 2)), []), []);
  assert.deepEqual(nouvellesEtapes(FACILES, new Set(oc.slice(0, 3)), []), ['oceanie']);
  assert.equal(besoinEtape(oc, new Set(oc.slice(0, 1))).manque, 2);
  // déjà tamponnée : pas une deuxième fois
  assert.deepEqual(nouvellesEtapes(FACILES, new Set(oc), ['oceanie']), []);
});

test('des pays connus hors du Facile ne comptent pas pour le tampon', () => {
  assert.deepEqual(nouvellesEtapes(FACILES, new Set(['FM', 'MH', 'NR', 'TV', 'KI', 'PW']), []), []);
});

test('les six tampons : tour du monde fait', () => {
  const tout = new Set(Object.values(FACILES).flat());
  const e = nouvellesEtapes(FACILES, tout, []);
  assert.deepEqual(e, ZONES_IDS);
  assert.ok(tourFait(e));
  assert.ok(!tourFait(e.slice(1)));
});

test('le voyage est gardé, et un tampon ne s’enlève pas quand on oublie un pays', () => {
  const s = memoire();
  const etat = charger('Lou', s);
  assert.deepEqual(etat.voyage, { etapes: [], intro: false, fini: false });
  etat.voyage.etapes.push('oceanie'); etat.voyage.intro = true;
  for (const c of FACILES.oceanie) etat.connus.add(c);
  enregistrerManche(etat, 'oceanie', new Map([[FACILES.oceanie[0], false]]), 30, 'facile');   // un pays oublié
  sauver('Lou', etat, s);
  const relu = charger('Lou', s);
  assert.deepEqual(relu.voyage.etapes, ['oceanie']);
  assert.equal(relu.voyage.intro, true);
});

test('un voyage abîmé est ignoré sans erreur', () => {
  const s = memoire();
  s.setItem('monde-a-la-craie.v1', JSON.stringify({ connus: [], voyage: { etapes: ['lune', 3, 'asie'], intro: 'oui', fini: 1 } }));
  const e = charger(null, s);
  assert.deepEqual(e.voyage, { etapes: ['asie'], intro: false, fini: false });
});

test('d’un appareil à l’autre, les tampons s’additionnent et la fin reste faite', () => {
  const ici = charger(null, memoire());
  ici.voyage.etapes.push('europe'); ici.voyage.intro = true;
  const ailleurs = { connus: ['FR'], meilleurs: {}, niveaux: {}, voyage: { etapes: ['asie', 'europe'], intro: false, fini: true } };
  assert.ok(depuisPartage(ici, ailleurs));
  assert.deepEqual(ici.voyage.etapes, ['europe', 'asie']);
  assert.equal(ici.voyage.intro, true);
  assert.equal(ici.voyage.fini, true);
  assert.deepEqual(versPartage(ici).voyage.etapes, ['europe', 'asie']);
  // une progression d'avant le voyage (sans voyage) passe toujours
  assert.ok(depuisPartage(ici, { connus: ['FR'] }));
  assert.deepEqual(ici.voyage.etapes, ['europe', 'asie']);
});
