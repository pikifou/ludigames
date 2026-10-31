// Toucher le bon pays, même minuscule : node --test tests/toucher.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RAYON_MIN, RAYON_PETIT, PETIT, paysTouche } from '../monde-a-la-craie/js/toucher.js';

// Un carré [x0, y0, x1, y1] comme contour.
const carre = (code, x0, y0, x1, y1) => ({
  code, centre: [(x0 + x1) / 2, (y0 + y1) / 2], rayon: Math.max(x1 - x0, y1 - y0) / 2,
  contient: ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1,
});
const italie = carre('IT', 100, 100, 300, 400);
const vatican = carre('VA', 160, 200, 161, 201);
const monaco = carre('MC', 50, 50, 51, 51);
const saintMarin = carre('SM', 90, 50, 91, 51);

test('le rayon minimal vaut 44 px', () => assert.equal(RAYON_MIN, 44));
test('un petit pays a un rond de 14 px', () => { assert.equal(RAYON_PETIT, 14); assert.equal(PETIT, 8); });

test("dans le contour d'un pays : ce pays, même si un petit pays est tout près", () => {
  assert.equal(paysTouche([190, 205], [italie, vatican]), 'IT');
});

test("sur le rond du Vatican, à l'intérieur de l'Italie : le Vatican", () => {
  assert.equal(paysTouche([160.5 + RAYON_PETIT - 1, 200.5], [italie, vatican]), 'VA');
});

test("dans l'Italie, loin du rond du Vatican : l'Italie", () => {
  assert.equal(paysTouche([160.5 + RAYON_PETIT + 5, 200.5], [italie, vatican]), 'IT');
});

test('près de Malte, en mer, hors de tout contour : Malte', () => {
  const malte = carre('MT', 500, 500, 502, 502);
  assert.equal(paysTouche([501 + 30, 501], [italie, malte]), 'MT');
});

test('entre Monaco et Saint-Marin : le centre le plus proche', () => {
  assert.equal(paysTouche([65, 50.5], [monaco, saintMarin]), 'MC');
  assert.equal(paysTouche([75, 50.5], [monaco, saintMarin]), 'SM');
});

test('en pleine mer : rien', () => {
  assert.equal(paysTouche([600, 600], [italie, vatican, monaco, saintMarin]), null);
});

test("un grand pays touché hors de son contour mais près du bord : rien (pas de zone élargie autour d'un grand pays)", () => {
  assert.equal(paysTouche([310, 250], [italie]), null);
});
