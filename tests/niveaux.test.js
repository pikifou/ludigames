// Les trois niveaux : node --test tests/niveaux.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { monde } from './geo.js';
import { NIVEAUX, LISTES, niveauDe, dansNiveau, niveauValide } from '../monde-a-la-craie/js/niveaux.js';

const { pays } = monde();
const interroges = new Map(pays.filter(f => f.properties.quiz).map(f => [f.properties.code, f.properties]));

test('les listes ne parlent que de pays interrogés, chacun une seule fois', () => {
  const tous = [...LISTES.facile, ...LISTES.moyen];
  for (const c of tous) assert.ok(interroges.has(c), c);
  assert.equal(new Set(tous).size, tous.length, 'un pays dans deux listes');
});

test("l'Europe : 14 pays faciles, 15 de plus en moyen, le reste en difficile", () => {
  const europe = [...interroges.values()].filter(p => p.zone === 'europe').map(p => p.code);
  const compte = n => europe.filter(c => dansNiveau(c, n)).length;
  assert.deepEqual([compte('facile'), compte('moyen'), compte('difficile')], [14, 29, 46]);
  assert.equal(niveauDe('FR'), 'facile');
  assert.equal(niveauDe('MD'), 'moyen');
  for (const c of ['VA', 'CY', 'MC', 'AD']) assert.equal(niveauDe(c), 'difficile', c);
});

test('chaque continent a des pays à chaque niveau, et plus à chaque niveau', () => {
  for (const z of ['europe', 'afrique', 'asie', 'amerique-nord', 'amerique-sud', 'oceanie']) {
    const codes = [...interroges.values()].filter(p => p.zone === z).map(p => p.code);
    const n = NIVEAUX.map(niv => codes.filter(c => dansNiveau(c, niv)).length);
    assert.ok(n[0] >= 4 && n[0] < n[1] && n[1] < n[2], `${z} : ${n}`);
  }
});

test('niveauValide : un niveau inconnu redevient facile', () => {
  assert.equal(niveauValide('moyen'), 'moyen');
  assert.equal(niveauValide('expert'), 'facile');
  assert.equal(niveauValide(undefined), 'facile');
});
