import test from 'node:test';
import assert from 'node:assert/strict';
import { LECONS, AMIS, PERSONNAGES, DEPART } from '../chemin-du-roi/js/lecons.js';
import { Exercice, coupsMinimum, notePrise, finDePartie } from '../chemin-du-roi/js/exercice.js';
import { depuisFen, coupsLegaux, enEchec, jouer, etat, caseDe, attaquee, couleur, choisirCoup } from '../chemin-du-roi/js/echecs.js';

const exercices = LECONS.flatMap(l => l.etapes.filter(e => e.ex).map(e => ({ ...e.ex, lecon: l.id })));

test('ids uniques et personnages connus', () => {
  const ids = exercices.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of LECONS) assert.ok(PERSONNAGES[l.qui], l.id);
  for (const l of LECONS) for (const e of l.etapes) if (e.qui) assert.ok(PERSONNAGES[e.qui]);
  for (const a of AMIS) assert.ok(PERSONNAGES[a.qui]);
  for (const e of exercices) if (e.ami) assert.ok(PERSONNAGES[e.ami]);
});

test('aucune position où le camp qui ne joue pas est en échec', () => {
  for (const e of [...exercices, { id: 'depart', fen: DEPART }]) {
    const p = depuisFen(e.fen);
    assert.ok(!enEchec(p, 'b'), e.id + ' : le roi noir est déjà en échec');
    assert.ok(coupsLegaux(p).length > 0, e.id + ' : aucun coup');
  }
});

test('chaque exercice a une solution', () => {
  for (const e of exercices) {
    const p = depuisFen(e.fen);
    const coups = coupsLegaux(p);
    switch (e.type) {
      case 'etoiles':
        for (const s of e.etoiles) assert.ok(!p.b[caseDe(s)], `${e.id} : étoile sur une pièce`);
        // falls through
      case 'prendre': {
        const n = coupsMinimum(e);
        assert.ok(n != null && n <= 8, `${e.id} : pas de solution courte (${n})`);
        break;
      }
      case 'mat':
        assert.ok(coups.some(m => etat(jouer(p, m)) === 'mat'), e.id);
        break;
      case 'echec':
        assert.ok(coups.some(m => enEchec(jouer(p, m))), e.id);
        break;
      case 'parer': {
        assert.ok(enEchec(p), e.id + ' : le roi blanc doit être en échec');
        const ex = new Exercice(e);
        assert.ok(coups.some(m => { const x = new Exercice(e); return x.jouer(m).ok; }), e.id);
        assert.ok(ex);
        break;
      }
      case 'sauver': {
        const c = caseDe(e.cible);
        assert.ok(attaquee(p, c, 'b'), e.id + ' : la pièce doit être menacée');
        const bons = coups.filter(m => new Exercice(e).jouer(m).ok);
        const mauvais = coupsLegaux(p, c).filter(m => !new Exercice(e).jouer(m).ok);
        assert.ok(bons.length > 0 && mauvais.length > 0, e.id);
        break;
      }
      case 'prise': {
        const notes = coups.filter(m => m.prise).map(m => notePrise(p, m));
        const best = Math.max(...notes);
        assert.ok(notes.length >= 2, e.id + ' : au moins deux prises');
        assert.equal(notes.filter(n => n === best).length >= 1, true);
        assert.ok(notes.some(n => n < best), e.id + ' : il faut un mauvais choix possible');
        break;
      }
      case 'coup':
        assert.ok(e.coups.some(c => coups.some(m => m.de === caseDe(c.slice(0, 2)) && m.vers === caseDe(c.slice(2)))), e.id);
        break;
      case 'partie':
        assert.equal(finDePartie(p, e.fin), null, e.id);
        break;
      default:
        assert.fail('type inconnu ' + e.type);
    }
  }
});

test('un exercice d\'étoiles se termine et se note', () => {
  const e = new Exercice({ id: 't', type: 'etoiles', fen: '8/8/8/8/8/8/8/R7 w - -', etoiles: ['a6', 'h6'] });
  assert.equal(e.minimum, 2);
  let r = e.jouer(e.coupsDepuis(caseDe('a1')).find(m => m.vers === caseDe('a6')));
  assert.ok(r.etoile && !r.fini);
  r = e.jouer(e.coupsDepuis(caseDe('a6')).find(m => m.vers === caseDe('h6')));
  assert.ok(r.fini);
  assert.equal(e.note(), 3);
});

test('un mauvais coup de mat est annulé', () => {
  const e = new Exercice({ id: 'm', type: 'mat', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - -' });
  const r = e.jouer(e.coupsDepuis(caseDe('a1')).find(m => m.vers === caseDe('a7')));
  assert.ok(!r.ok && r.annule);
  assert.equal(e.pos.b[caseDe('a1')], 'R');
  assert.ok(e.jouer(e.coupsDepuis(caseDe('a1')).find(m => m.vers === caseDe('a8'))).fini);
  assert.equal(e.note(), 2);
});

test('les parties se terminent : un adversaire joue contre lui-même', () => {
  for (const e of exercices.filter(x => x.type === 'partie')) {
    let p = depuisFen(e.fen), fin = null, n = 0;
    while (!fin && n < 200) {
      const m = choisirCoup(p, { prof: 1, hasard: 0.3 });
      p = jouer(p, m.promo ? { ...m, promo: couleur(m.piece) === 'w' ? 'Q' : 'q' } : m);
      fin = finDePartie(p, e.fin); n++;
    }
    assert.ok(n > 0);
  }
});
