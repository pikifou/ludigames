// Règles des manches : node --test tests/regles.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { TAILLE_MANCHE, REVISIONS, choisirManche, Manche, Epreuve, medaillePour, meilleure, besoinEpreuve, pourcentage, mondeDebloque } from '../monde-a-la-craie/js/regles.js';

const zone = Array.from({ length: 20 }, (_, i) => ({ code: 'P' + (i + 1), rang: i + 1 }));
const rang = c => +c.slice(1);
function hasard(graine = 1) { let s = graine; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

test('choisirManche : 12 codes distincts', () => {
  const m = choisirManche(zone, new Set(), hasard());
  assert.equal(m.length, TAILLE_MANCHE);
  assert.equal(new Set(m).size, 12);
});

test("choisirManche : les plus grands non connus d'abord", () => {
  const m = choisirManche(zone, new Set(), hasard());
  assert.deepEqual(m.map(rang).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('choisirManche : au plus 3 révisions', () => {
  const connus = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
  const m = choisirManche(zone, connus, hasard());
  assert.equal(m.filter(c => connus.has(c)).length, REVISIONS);
  assert.deepEqual(m.filter(c => !connus.has(c)).map(rang).sort((a, b) => a - b), [7, 8, 9, 10, 11, 12, 13, 14, 15]);
});

test('choisirManche : zone presque connue, on complète avec des connus', () => {
  const connus = new Set(zone.slice(0, 18).map(p => p.code));
  const m = choisirManche(zone, connus, hasard());
  assert.equal(m.length, 12);
  assert.ok(m.includes('P19') && m.includes('P20'));
});

test("choisirManche : l'ordre est mélangé", () => {
  const m = choisirManche(zone, new Set(), hasard(3));
  assert.notDeepEqual(m.map(rang), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

const codes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

test('Manche : juste colorie et avance', () => {
  const m = new Manche(codes);
  assert.equal(m.question, 'A');
  assert.deepEqual(m.toucher('A'), { resultat: 'juste' });
  assert.equal(m.trouves, 1);
  assert.equal(m.question, 'B');
});

test('Manche : faux renvoie le bon code', () => {
  const m = new Manche(codes);
  assert.deepEqual(m.toucher('B'), { resultat: 'faux', bon: 'A' });
});

test("Manche : après une erreur, tout toucher est ignoré jusqu'à reprendre() (fin de l'animation)", () => {
  const m = new Manche(codes);
  m.toucher('Z');
  assert.equal(m.toucher(m.question).resultat, 'ignore');
  assert.equal(m.toucher('B').resultat, 'ignore');
  m.reprendre();
  assert.equal(m.toucher(m.question).resultat, 'juste');
});

test('Manche : un raté revient une fois en fin de manche', () => {
  const m = new Manche(codes);
  m.toucher('Z'); m.reprendre();
  const vus = [];
  while (!m.finie) { vus.push(m.question); m.toucher(m.question); }
  assert.deepEqual(vus, [...codes.slice(1), 'A']);
});

test('Manche : raté deux fois, il est montré et la manche continue', () => {
  const m = new Manche(['A', 'B']);
  m.toucher('Z'); m.reprendre();
  m.toucher('B'); m.reprendre();
  assert.equal(m.question, 'A');
  assert.deepEqual(m.toucher('Z'), { resultat: 'faux', bon: 'A' });
  assert.ok(m.finie);
  assert.equal(m.trouves, 1);
  assert.equal(m.faites, 2);
});

test('Manche : toucher la mer est ignoré ; un pays déjà trouvé est une erreur (pas d’élimination, ADR-004)', () => {
  const m = new Manche(codes);
  m.toucher('A');
  assert.equal(m.toucher(null).resultat, 'ignore');
  assert.equal(m.question, 'B');
  assert.deepEqual(m.toucher('A'), { resultat: 'faux', bon: 'B' });
});

test('Épreuve : chaque pays une fois, une erreur compte et ne revient pas', () => {
  const e = new Epreuve(['A', 'B', 'C', 'D'], hasard(2));
  assert.equal(e.total, 4);
  const vus = [];
  const q1 = e.question; vus.push(q1);
  assert.equal(e.toucher('Z').resultat, 'faux');
  assert.equal(e.toucher(e.question).resultat, 'ignore', 'attend la fin de l’animation');
  e.reprendre();
  while (!e.finie) { vus.push(e.question); e.toucher(e.question); }
  assert.deepEqual([...vus].sort(), ['A', 'B', 'C', 'D']);
  assert.equal(e.erreurs, 1);
  assert.equal(e.trouves, 3);
  assert.equal(e.resultats.get(q1), false);
  assert.equal(e.medaille, 'argent');
});

test('Épreuve : les médailles (or sans erreur, argent 1 ou 2, bronze au-delà) et la meilleure des deux', () => {
  assert.deepEqual([0, 1, 2, 3, 20].map(medaillePour), ['or', 'argent', 'argent', 'bronze', 'bronze']);
  assert.equal(meilleure('bronze', 'or'), 'or');
  assert.equal(meilleure('argent', 'bronze'), 'argent');
  assert.equal(meilleure(undefined, 'bronze'), 'bronze');
});

test('Épreuve : ouverte aux trois quarts des pays connus', () => {
  const c = ['A', 'B', 'C', 'D'];
  assert.equal(besoinEpreuve(c, new Set(['A', 'B'])).manque, 1);
  assert.equal(besoinEpreuve(c, new Set(['A', 'B', 'C'])).manque, 0);
});

test('Manche : finie après 12 pays', () => {
  const m = new Manche(codes);
  for (const c of codes) m.toucher(c);
  assert.ok(m.finie);
  assert.equal(m.question, null);
  assert.equal(m.toucher('A').resultat, 'ignore');
});

test('Manche : resultats, faux pour un pays raté puis trouvé', () => {
  const m = new Manche(codes);
  m.toucher('Z'); m.reprendre();
  while (!m.finie) m.toucher(m.question);
  assert.equal(m.resultats.get('A'), false);
  assert.equal(m.resultats.get('B'), true);
  assert.equal(m.resultats.size, 12);
});

test('pourcentage', () => {
  assert.equal(pourcentage(['A', 'B', 'C', 'D'], new Set(['A', 'X'])), 0.25);
  assert.equal(pourcentage([], new Set()), 0);
});

test('choisirManche : moins de 12 pays au niveau choisi, la manche les prend tous', () => {
  const m = choisirManche(zone.slice(0, 4), new Set(), hasard());
  assert.equal(m.length, 4);
  assert.equal(new Manche(m).total, 4);
});

test('mondeDebloque', () => {
  const z = { europe: 0.6, afrique: 0.6, asie: 0.6, 'amerique-nord': 0.6, 'amerique-sud': 0.6, oceanie: 0.49 };
  assert.equal(mondeDebloque(z), false);
  assert.equal(mondeDebloque({ ...z, oceanie: 0.5 }), true);
  assert.equal(mondeDebloque({ europe: 1 }), false);
});

test('Chemin : les niveaux un par un ; un tampon d’avant les épreuves vaut le niveau Facile (ADR-008)', async () => {
  const { niveauOuvertContinent, prochainNiveau, niveauSuivant } = await import('../monde-a-la-craie/js/regles.js');
  assert.equal(niveauOuvertContinent('europe', 'facile', {}), true);
  assert.equal(niveauOuvertContinent('europe', 'moyen', {}), false);
  assert.equal(niveauOuvertContinent('europe', 'moyen', { 'europe-facile': 'bronze' }), true);
  assert.equal(niveauOuvertContinent('europe', 'difficile', { 'europe-facile': 'or' }), false);
  assert.equal(niveauOuvertContinent('europe', 'difficile', { 'europe-facile': 'or', 'europe-moyen': 'argent' }), true);
  assert.equal(niveauOuvertContinent('europe', 'moyen', {}, ['europe']), true, 'tampon sans médaille');
  assert.equal(prochainNiveau('europe', {}), 'facile');
  assert.equal(prochainNiveau('europe', {}, ['europe']), 'moyen');
  assert.equal(prochainNiveau('europe', { 'europe-facile': 'or', 'europe-moyen': 'or', 'europe-difficile': 'bronze' }), null);
  assert.equal(niveauSuivant('facile'), 'moyen');
  assert.equal(niveauSuivant('difficile'), null);
});
