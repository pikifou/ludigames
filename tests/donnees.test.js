// Les données de la carte : node --test tests/donnees.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { d3, monde } from './geo.js';

const { pays } = monde();
const onu = JSON.parse(readFileSync(new URL('../tools/onu.json', import.meta.url), 'utf8'));
const par = Object.fromEntries(pays.map(f => [f.properties.code, f]));
const p = c => par[c] && par[c].properties;
const ZONES = ['europe', 'afrique', 'asie', 'amerique-nord', 'amerique-sud', 'oceanie'];

test('les 193 membres de l\'ONU sont interrogés', () => {
  assert.equal(onu.length, 193);
  assert.equal(new Set(onu).size, 193);
  for (const c of onu) assert.ok(p(c) && p(c).quiz, c);
});

test('pays interrogés en plus : Kosovo, Palestine, Taïwan, Vatican, et aucun autre', () => {
  for (const c of ['XK', 'PS', 'TW', 'VA']) assert.ok(p(c) && p(c).quiz, c);
  const autres = pays.filter(f => f.properties.quiz && !onu.includes(f.properties.code)).map(f => f.properties.code).sort();
  assert.deepEqual(autres, ['PS', 'TW', 'VA', 'XK']);
});

test('chaque pays interrogé a une zone, un nom fr et en, une forme ou un point', () => {
  for (const f of pays.filter(f => f.properties.quiz)) {
    const q = f.properties;
    assert.ok(ZONES.includes(q.zone), q.code + ' zone ' + q.zone);
    assert.ok(q.fr && q.en, q.code + ' noms');
    assert.ok(f.geometry || q.point, q.code + ' forme');
  }
});

test('les zones', () => {
  const attendu = { RU: 'europe', TR: 'asie', CY: 'europe', GE: 'asie', AM: 'asie', AZ: 'asie', KZ: 'asie',
    MX: 'amerique-nord', CU: 'amerique-nord', PA: 'amerique-nord', EG: 'afrique', AU: 'oceanie', PG: 'oceanie' };
  for (const [c, z] of Object.entries(attendu)) assert.equal(p(c).zone, z, c);
  for (const z of ZONES) assert.ok(pays.filter(f => f.properties.quiz && f.properties.zone === z).length >= 12, z);
});

test('la Crimée est en Ukraine', () => {
  assert.ok(d3.geoContains(par.UA, [34.1, 45.0]));
  assert.ok(!d3.geoContains(par.RU, [34.1, 45.0]));
});

test('Somaliland et Chypre du Nord fusionnés, aucune forme sans code', () => {
  assert.ok(pays.every(f => f.properties.code));
  assert.ok(d3.geoContains(par.SO, [45, 9.5]));
  assert.ok(d3.geoContains(par.CY, [33.6, 35.25]));
});

test('Sahara occidental et Groenland sont des territoires', () => {
  assert.equal(p('EH').quiz, false);
  assert.equal(p('EH').zone, 'afrique');
  assert.equal(p('EH').de, undefined);
  assert.equal(p('GL').quiz, false);
  assert.equal(p('GL').de.fr, 'Danemark');
});

test('noms d\'usage', () => {
  const noms = { CD: 'République démocratique du Congo', CG: 'Congo', PS: 'Palestine', VA: 'Vatican', MM: 'Birmanie',
    TL: 'Timor oriental', GB: 'Royaume-Uni', CI: "Côte d'Ivoire" };
  for (const [c, n] of Object.entries(noms)) assert.equal(p(c).fr, n, c);
});

test('Tuvalu est un point interrogé', () => {
  assert.ok(p('TV').quiz);
  assert.equal(p('TV').point.length, 2);
});

test('rang : de 1 à n dans chaque zone, la Russie est la plus grande d\'Europe', () => {
  for (const z of ZONES) {
    const rangs = pays.filter(f => f.properties.quiz && f.properties.zone === z).map(f => f.properties.rang).sort((a, b) => a - b);
    assert.deepEqual(rangs, rangs.map((_, i) => i + 1), z);
  }
  assert.equal(p('RU').rang, 1);
  assert.equal(p('AU').rang, 1, "Australie la plus grande d'Océanie");
  assert.equal(p('CN').rang, 1);
  assert.equal(p('BR').rang, 1);
});

test('noms courants', () => {
  assert.equal(p('VN').fr, 'Vietnam');
  assert.equal(p('TR').en, 'Turkey');
  assert.equal(p('SX').fr, 'Sint Maarten');
  assert.equal(p('VC').en, 'Saint Vincent and the Grenadines');
});
