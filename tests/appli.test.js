// L'appli installable et sa fiche Ludiworld : node --test tests/appli.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { versionDuJeu } from '../tools/version.js';

const jeu = new URL('../monde-a-la-craie/', import.meta.url);
const lire = f => readFileSync(new URL(f, jeu), 'utf8');

function fichiers(dossier = '', liste = []) {
  for (const f of readdirSync(new URL(dossier || '.', jeu))) {
    const chemin = dossier + f;
    if (statSync(new URL(chemin, jeu)).isDirectory()) fichiers(chemin + '/', liste);
    else liste.push(chemin);
  }
  return liste;
}

test("le service worker garde en cache tout ce dont le jeu a besoin hors ligne", () => {
  const sw = lire('sw.js');
  const attendus = fichiers().filter(f => /\.(js|css|json|woff2|png|webmanifest|html)$/.test(f) && f !== 'sw.js' && f !== 'ludi.json');
  for (const f of attendus) assert.ok(sw.includes(`'${f}'`), f + ' absent de sw.js');
  assert.ok(sw.includes("'./'"));
});

test('la version du service worker suit le contenu du jeu (node tools/version.js)', () => {
  assert.match(lire('sw.js'), new RegExp(`const VERSION = '${versionDuJeu()}';`));
});

test('le manifeste et ses icônes', () => {
  const m = JSON.parse(lire('manifest.webmanifest'));
  assert.equal(m.name, 'Le Monde à la craie');
  assert.equal(m.start_url, './');
  for (const i of m.icons) assert.ok(existsSync(new URL(i.src, jeu)), i.src);
  assert.ok(m.icons.some(i => i.purpose === 'maskable'));
});

test('la fiche Ludiworld', () => {
  const f = JSON.parse(lire('ludi.json'));
  assert.equal(f.id, 'monde-a-la-craie');
  assert.equal(f.url, 'https://pikifou.github.io/ludigames/monde-a-la-craie/');
  assert.deepEqual(f.age, { min: 6, max: 12 });
  assert.equal(f.reading, 'some');
  assert.equal(f.learning.level, 'core');
  assert.deepEqual(f.learning.domains, ['geographie.pays']);
  assert.deepEqual(f.session, { minutes: [3, 10], natural_end: true });
  assert.equal(f.offline, true);
  assert.equal(f.kit, true);
  for (const champ of ['title', 'pitch', 'content']) assert.ok(f[champ].fr && f[champ].en, champ);
  assert.ok(!/—/.test(JSON.stringify(f)), 'pas de tiret long');
});

test('le kit Ludiworld est la version 0.2.0', () => {
  assert.match(lire('ludi.js'), /VERSION = '0\.2\.0'/);
});

test("le service worker télécharge des fichiers frais à l'installation (pas le cache HTTP)", () => {
  assert.match(lire('sw.js'), /cache: 'reload'/);
});
