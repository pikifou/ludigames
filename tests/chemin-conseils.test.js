import test from 'node:test';
import assert from 'node:assert/strict';
import { erreur, occasionManquee, meilleureMenace } from '../chemin-du-roi/js/conseils.js';
import { depuisFen, coupsLegaux, caseDe } from '../chemin-du-roi/js/echecs.js';

const coup = (pos, de, vers) => coupsLegaux(pos).find(m => m.de === caseDe(de) && m.vers === caseDe(vers));

test('la dame posée devant un cavalier : erreur signalée', () => {
  const p = depuisFen('4k3/8/8/8/2n5/8/8/3QK3 w - -');
  const e = erreur(p, coup(p, 'd1', 'd2'));
  assert.ok(e, 'il faut prévenir');
  assert.equal(e.m.vers, caseDe('d2'));
  assert.equal(e.gain, 6);
});

test('un coup sûr : pas de remarque', () => {
  const p = depuisFen('4k3/8/8/8/2n5/8/8/3QK3 w - -');
  assert.equal(erreur(p, coup(p, 'd1', 'a4')), null);
});

test('laisser un mat en un : erreur signalée', () => {
  // Le cavalier gardait a1 : s'il part, la tour noire fait le mat du couloir.
  const p = depuisFen('r5k1/8/8/8/8/8/2N2PPP/6K1 w - -');
  const e = erreur(p, coup(p, 'c2', 'd4'));
  assert.ok(e && e.mat);
});

test('une perte inévitable : on ne harcèle pas', () => {
  // Fourchette du cavalier : le roi est en échec, la tour a1 est perdue quoi qu'on fasse.
  const p = depuisFen('4k3/8/8/8/8/8/2n5/R3K3 w - -');
  for (const m of coupsLegaux(p)) assert.equal(erreur(p, m), null);
});

test('une prise gratuite laissée de côté : occasion signalée', () => {
  const p = depuisFen('4k3/8/8/8/2n5/8/8/2R1K3 w - -');
  const o = occasionManquee(p, coup(p, 'e1', 'f1'));
  assert.ok(o && o.m.vers === caseDe('c4'));
  assert.equal(occasionManquee(p, coup(p, 'c1', 'c4')), null);
});

test('un mat en un laissé de côté : occasion signalée', () => {
  const p = depuisFen('6k1/5ppp/8/8/8/8/8/R5K1 w - -');
  assert.ok(occasionManquee(p, coup(p, 'g1', 'f2'))?.mat);
  assert.equal(occasionManquee(p, coup(p, 'a1', 'a8')), null);
  assert.ok(meilleureMenace(p).mat);
});

test('les conseils restent rapides au milieu d\'une partie', () => {
  const p = depuisFen('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -');
  const t = Date.now();
  for (const m of coupsLegaux(p)) { erreur(p, m); occasionManquee(p, m); }
  assert.ok(Date.now() - t < 3000, `trop lent : ${Date.now() - t} ms pour tous les coups`);
});
