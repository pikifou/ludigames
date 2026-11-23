// Les Défis de Barnabé : chaque défi est une position légale, a une solution, et n'est pas résolu par n'importe quel coup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LECONS, CHAPITRES, AMIS, PERSONNAGES } from '../defis-de-barnabe/js/lecons.js';
import { DEFIS } from '../defis-de-barnabe/js/defis.js';
import { Exercice, fourchette, menaceDeMat, menaceAvant } from '../defis-de-barnabe/js/exercice.js';
import { depuisFen, coupsLegaux, enEchec, jouer } from '../defis-de-barnabe/js/echecs.js';
import { juger } from '../tools/juge-defis.js';

const defis = LECONS.flatMap(l => l.etapes.filter(s => s.ex).map(s => s.ex));

test('quatre-vingt-dix défis, cinq par bouteille, des identifiants uniques', () => {
  assert.equal(defis.length, 90);
  for (const l of LECONS.filter(l => !l.parties && l.etapes.some(s => s.ex))) assert.equal(l.etapes.filter(s => s.ex).length, 5, l.id);
  assert.equal(new Set(defis.map(d => d.id)).size, defis.length);
  assert.equal(Object.keys(DEFIS).length, 18);
});

test('chaque défi : les blancs jouent, le roi noir n\'est pas en échec, au moins un bon coup et au moins un coup qui rate', () => {
  for (const d of defis) {
    const pos = depuisFen(d.fen);
    assert.equal(pos.trait, 'w', d.id);
    assert.ok(!enEchec(pos, 'b'), d.id + ' : le roi noir est en échec');
    const coups = coupsLegaux(pos);
    let bons = 0;
    for (const m of coups) {
      const ex = new Exercice(d);
      if (ex.jouer(m).ok) bons++;
    }
    assert.ok(bons >= 1, d.id + ' : aucune solution');
    assert.ok(bons < coups.length, d.id + ' : tous les coups marchent');
    assert.ok(new Exercice(d).indice(), d.id + ' : pas d\'indice');
  }
});

test('les défis ont la forme annoncée', () => {
  for (const d of defis) {
    const pos = depuisFen(d.fen);
    if (d.type === 'fourchette') assert.ok(coupsLegaux(pos).some(m => fourchette(pos, m)), d.id);
    if (d.type === 'parade') {
      assert.ok(menaceAvant(d), d.id + ' : pas de menace à montrer');
      assert.ok(coupsLegaux(pos).some(m => !menaceDeMat(jouer(pos, m))), d.id);
    }
    if (d.type === 'parer') assert.ok(enEchec(pos, 'w'), d.id);
    if (d.type === 'sauver') assert.ok(d.cible, d.id);
  }
});

// Le retour de Julien (23 novembre) : un défi ne doit jamais demander un mauvais coup.
// L'arbitre cherche 3 demi-coups puis toutes les prises : chaque coup accepté vaut le meilleur coup,
// une prise « gratuite » ne se fait pas reprendre, une fourchette gagne quelque chose.
test("l'arbitre : chaque coup accepté est un bon coup, et la consigne dit vrai", () => {
  const fautes = defis.map(d => [d.id, juger(d, { autresProtegees: d.id.startsWith('plage-2') ? 1 : 0 })]).filter(([, r]) => r);
  assert.deepEqual(fautes, []);
});

test('la progression : peu de pièces d\'abord, de vraies parties ensuite', () => {
  const pieces = d => depuisFen(d.fen).b.filter(Boolean).length;
  for (const c of CHAPITRES.filter(c => c.id !== 'phare' && c.id !== 'jetee')) {
    const [b1, , b3] = c.lecons.map(l => l.etapes.filter(s => s.ex).map(s => s.ex));
    assert.ok(Math.max(...b1.map(pieces)) <= 5, c.id + ' : la première bouteille est simple');
    assert.ok(Math.min(...b3.map(pieces)) >= 12, c.id + ' : la troisième vient de vraies parties');
  }
});

test('on n\'affronte que Barnabé', () => {
  assert.deepEqual(AMIS.map(a => a.qui), ['sage']);
  assert.deepEqual(Object.keys(PERSONNAGES).sort(), ['enfant', 'sage']);
});
