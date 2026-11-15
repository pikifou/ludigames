import test from 'node:test';
import assert from 'node:assert/strict';
import { depuisFen, versFen, perft, coupsLegaux, jouer, etat, caseDe, choisirCoup } from '../chemin-du-roi/js/echecs.js';

const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const KIWI = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -';

test('FEN aller-retour', () => {
  assert.equal(versFen(depuisFen(DEPART)), DEPART);
  assert.equal(versFen(depuisFen(KIWI)), KIWI);
});

test('perft depuis le départ', () => {
  const p = depuisFen(DEPART);
  assert.equal(perft(p, 1), 20);
  assert.equal(perft(p, 2), 400);
  assert.equal(perft(p, 3), 8902);
});

test('perft kiwipete (roques, prise en passant, promotions)', () => {
  const p = depuisFen(KIWI);
  assert.equal(perft(p, 1), 48);
  assert.equal(perft(p, 2), 2039);
});

test('perft position 3 (en passant et clouages)', () => {
  const p = depuisFen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -');
  assert.equal(perft(p, 1), 14);
  assert.equal(perft(p, 2), 191);
  assert.equal(perft(p, 3), 2812);
});

test('une pièce seule, sans roi, bouge librement', () => {
  const p = depuisFen('8/8/8/8/3R4/8/8/8 w - -');
  assert.equal(coupsLegaux(p).length, 14);
});

test('mat du couloir et pat', () => {
  const p = depuisFen('6k1/5ppp/8/8/8/8/8/R5K1 w - -');
  const m = coupsLegaux(p).find(c => c.vers === caseDe('a8'));
  assert.equal(etat(jouer(p, m)), 'mat');
  assert.equal(etat(depuisFen('7k/5Q2/6K1/8/8/8/8/8 b - -')), 'pat');
});

test("l'adversaire voit un mat en un", () => {
  const p = depuisFen('6k1/5ppp/8/8/8/8/8/R5K1 w - -');
  const m = choisirCoup(p, { prof: 1 });
  assert.equal(m.vers, caseDe('a8'));
});

test("l'adversaire prend une dame offerte", () => {
  const p = depuisFen('4k3/8/8/3q4/8/8/8/3RK3 w - -');
  const m = choisirCoup(p, { prof: 2 });
  assert.equal(m.vers, caseDe('d5'));
});
