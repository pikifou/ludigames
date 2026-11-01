// Progression gardée sur l'appareil : node --test tests/progres.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { cle, charger, enregistrerManche, sauver } from '../monde-a-la-craie/js/progres.js';

function memoire() { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }
const casse = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); } };

test('un prénom par clé', () => {
  assert.equal(cle(null), 'monde-a-la-craie.v1');
  assert.notEqual(cle('Lou'), cle('Joshua'));
  assert.notEqual(cle('Lou'), cle(null));
});

test('sauver puis charger rend le même état, rangé sous le prénom', () => {
  const s = memoire();
  const e = charger('Joshua', s);
  e.connus.add('FR'); e.voix = true;
  sauver('Joshua', e, s);
  const r = charger('Joshua', s);
  assert.ok(r.connus.has('FR'));
  assert.equal(r.voix, true);
  assert.equal(charger('Lou', s).connus.size, 0);
});

test('JSON abîmé : état vide, sans exception', () => {
  const s = memoire(); s.setItem(cle(null), '{pas du json');
  const e = charger(null, s);
  assert.equal(e.connus.size, 0);
  assert.equal(e.voix, false);
  assert.equal(e.son, true);
});

test('stockage qui lève une exception : état vide, sauver ne lève pas', () => {
  const e = charger(null, casse);
  assert.equal(e.connus.size, 0);
  assert.doesNotThrow(() => sauver(null, e, casse));
});

test('pas de stockage du tout : état vide', () => {
  assert.equal(charger(null, undefined).connus.size, 0);
});

test('enregistrerManche : connu ajouté si réussi du premier coup, retiré après un raté', () => {
  const e = charger(null, memoire());
  e.connus.add('ES');
  enregistrerManche(e, 'europe', new Map([['FR', true], ['ES', false]]), 40);
  assert.ok(e.connus.has('FR'));
  assert.ok(!e.connus.has('ES'));
});

test('enregistrerManche : record seulement si meilleur temps', () => {
  const e = charger(null, memoire());
  assert.deepEqual(enregistrerManche(e, 'europe', new Map(), 50), { record: true });
  assert.deepEqual(enregistrerManche(e, 'europe', new Map(), 60), { record: false });
  assert.equal(e.meilleurs.europe, 50);
  assert.deepEqual(enregistrerManche(e, 'europe', new Map(), 45.5), { record: true });
  assert.equal(e.meilleurs.europe, 45.5);
});

test("la langue choisie est gardée (sinon : celle de l'appareil)", () => {
  const s = memoire();
  assert.equal(charger(null, s).langue, null);
  const e = charger(null, s); e.langue = 'en'; sauver(null, e, s);
  assert.equal(charger(null, s).langue, 'en');
  s.setItem(cle(null), JSON.stringify({ langue: 'klingon' }));
  assert.equal(charger(null, s).langue, null);
});
