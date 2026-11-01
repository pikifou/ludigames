// Les petits savoirs sur les pays : node --test tests/savoirs.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
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
    // Capitale disputée (Israël, Palestine) : pas de capitale plutôt qu'un choix politique.
    if (c === 'IL' || c === 'PS') assert.equal(s.capitale, null, c);
    else assert.ok(s.capitale.fr && s.capitale.en, c + ' : capitale');
    assert.equal(s.faits.length, 3, c);
    for (const f of s.faits) {
      assert.ok(f.e && f.fr && f.en, c);
      assert.ok(f.fr.length <= 110, `${c} : trop long pour un enfant (${f.fr.length}) ${f.fr}`);
      assert.ok(!/[—–]/.test(f.fr + f.en), c + ' : pas de tiret long');
      assert.ok(!/ [!?:;»]/.test(f.fr), c + ' : espace insécable avant la ponctuation haute ' + f.fr);
      assert.ok(!/'/.test(f.fr), c + ' : apostrophe typographique ' + f.fr);
      assert.ok(!/\p{Regional_Indicator}/u.test(f.e), c + ' : pas de drapeau (illisible sous Windows)');
    }
  }
});

test('fiche : la capitale et les savoirs dans la langue demandée', () => {
  const s = { FR: { capitale: { fr: 'Paris', en: 'Paris' }, faits: [{ e: '🗼', fr: 'Tour', en: 'Tower' }, { e: 'a', fr: 'A', en: 'A' }, { e: 'b', fr: 'B', en: 'B' }] } };
  assert.deepEqual(fiche(s, 'FR', 'en'), { capitale: 'Paris', faits: [{ e: '🗼', texte: 'Tower' }, { e: 'a', texte: 'A' }, { e: 'b', texte: 'B' }] });
  assert.equal(fiche(s, 'GL', 'fr'), null);
  assert.equal(fiche(s, null, 'fr'), null);
  const sansCapitale = { IL: { capitale: null, faits: s.FR.faits } };
  assert.equal(fiche(sansCapitale, 'IL', 'fr').capitale, null);
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

test('prochainSavoir : sans capitale, les trois savoirs tournent seuls', () => {
  const s = { PS: { capitale: null, faits: [{ e: '1', fr: 'un', en: 'one' }, { e: '2', fr: 'deux', en: 'two' }, { e: '3', fr: 'trois', en: 'three' }] } };
  const vus = new Map();
  assert.deepEqual(Array.from({ length: 4 }, () => prochainSavoir(s, 'PS', 'fr', vus).texte), ['un', 'deux', 'trois', 'un']);
});

// Les images des savoirs (bande « Le savais-tu ? ») : trouvées sur Wikimedia Commons, jamais générées, sous licence libre.
const jeu = new URL('../monde-a-la-craie/', import.meta.url);
const existe = chemin => { try { return statSync(new URL(chemin, jeu)).size > 0; } catch { return false; } };
const LIBRES = /^(Domaine public|CC0|CC BY(-SA)? \d\.\d)$/;

test('chaque pays interrogé a son drapeau', () => {
  for (const c of interroges.keys()) assert.ok(existe(`img/drapeaux/${c.toLowerCase()}.svg`), c + ' sans drapeau');
});

test('les premiers pays faciles d\'Europe ont une image pour chaque savoir', () => {
  for (const c of ['FR', 'ES', 'IT', 'DE', 'GB']) for (const f of savoirs[c].faits) assert.ok(f.img, `${c} : ${f.fr}`);
});

test('chaque image de savoir existe, avec son auteur, une licence libre et sa source', () => {
  for (const [c, s] of Object.entries(savoirs)) for (const f of s.faits) {
    if (!f.img) continue;
    assert.ok(existe(f.img.src), `${c} : ${f.img.src}`);
    assert.ok(f.img.auteur, `${c} : auteur`);
    assert.match(f.img.licence, LIBRES, `${c} : licence ${f.img.licence}`);
    assert.match(f.img.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${c} : source`);
  }
});

test('la fiche et le savoir suivant transmettent l\'image', () => {
  const img = { src: 'img/savoirs/fr-1.webp', auteur: 'A', licence: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:x.jpg' };
  const s = { FR: { capitale: { fr: 'Paris', en: 'Paris' }, faits: [{ e: '🗼', fr: 'Tour', en: 'Tower', img }, { e: 'a', fr: 'A', en: 'A' }, { e: 'b', fr: 'B', en: 'B' }] } };
  assert.deepEqual(fiche(s, 'FR', 'fr').faits[0], { e: '🗼', texte: 'Tour', img });
  assert.equal(fiche(s, 'FR', 'fr').faits[1].img, undefined);
  assert.deepEqual(prochainSavoir(s, 'FR', 'fr', new Map()).img, img);
});
