// Les petits savoirs sur les pays : node --test tests/savoirs.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { monde } from './geo.js';
import { fiche, prochainSavoir } from '../monde-a-la-craie/js/savoirs.js';

const { pays } = monde();
const savoirs = JSON.parse(readFileSync(new URL('../monde-a-la-craie/data/savoirs.json', import.meta.url), 'utf8'));
const interroges = new Map(pays.filter(f => f.properties.quiz).map(f => [f.properties.code, f.properties]));

test('chaque pays interrogé d\'Europe a ses savoirs', () => {
  const europe = [...interroges.values()].filter(p => p.zone === 'europe').map(p => p.code);
  assert.equal(europe.length, 46);
  for (const c of europe) assert.ok(savoirs[c], c + ' sans savoirs');
});

test('les savoirs ne parlent que de pays interrogés', () => {
  for (const c of Object.keys(savoirs)) assert.ok(interroges.has(c), c);
});

test('une capitale et trois savoirs courts, en français et en anglais', () => {
  for (const [c, s] of Object.entries(savoirs)) {
    assert.ok(s.capitale.fr && s.capitale.en, c + ' : capitale');
    assert.equal(s.faits.length, 3, c);
    for (const f of s.faits) {
      assert.ok(f.e && f.fr && f.en, c);
      assert.ok(f.fr.length <= 110, `${c} : trop long pour un enfant (${f.fr.length}) ${f.fr}`);
      assert.ok(!/[—–]/.test(f.fr + f.en), c + ' : pas de tiret long');
      assert.ok(!/ [!?:;»]/.test(f.fr), c + ' : espace insécable avant la ponctuation haute ' + f.fr);
    }
  }
});

test('fiche : la capitale et les savoirs dans la langue demandée', () => {
  const s = { FR: { capitale: { fr: 'Paris', en: 'Paris' }, faits: [{ e: '🗼', fr: 'Tour', en: 'Tower' }, { e: 'a', fr: 'A', en: 'A' }, { e: 'b', fr: 'B', en: 'B' }] } };
  assert.deepEqual(fiche(s, 'FR', 'en'), { capitale: 'Paris', faits: [{ e: '🗼', texte: 'Tower' }, { e: 'a', texte: 'A' }, { e: 'b', texte: 'B' }] });
  assert.equal(fiche(s, 'GL', 'fr'), null);
  assert.equal(fiche(s, null, 'fr'), null);
});

test('prochainSavoir : les savoirs l\'un après l\'autre, puis la capitale, puis on recommence', () => {
  const s = { IT: { capitale: { fr: 'Rome', en: 'Rome' }, faits: [{ e: '1', fr: 'un', en: 'one' }, { e: '2', fr: 'deux', en: 'two' }, { e: '3', fr: 'trois', en: 'three' }] } };
  const vus = new Map();
  const suite = Array.from({ length: 5 }, () => prochainSavoir(s, 'IT', 'fr', vus));
  assert.deepEqual(suite.map(x => x.texte), ['un', 'deux', 'trois', 'Capitale : Rome', 'un']);
  assert.equal(suite[3].e, '⭐');
  assert.equal(prochainSavoir(s, 'IT', 'en', new Map([['IT', 3]])).texte, 'Capital: Rome');
  assert.equal(prochainSavoir(s, 'ES', 'fr', vus), null);
});
