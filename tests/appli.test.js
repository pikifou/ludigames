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
  const attendus = fichiers().filter(f => /\.(js|css|json|woff2|png|webp|webmanifest|html)$/.test(f) && f !== 'sw.js' && f !== 'ludi.json'
    && !f.startsWith('img/savoirs/') && !f.startsWith('img/drapeaux/'));   // les images des savoirs et les drapeaux arrivent à la demande
  for (const f of ['img/histoire/depart.webp', 'img/histoire/retour.webp', 'img/histoire/nina.webp']) assert.ok(attendus.includes(f), f);
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

test('le kit Ludiworld est la version 0.4.0 (fini et complet)', () => {
  assert.match(lire('ludi.js'), /VERSION = '0\.4\.0'/);
});

test("les vidéos de l'histoire ne passent pas par le cache (lecture par morceaux) ; le jeu montre l'image sans elles", () => {
  assert.match(lire('sw.js'), /pathname\.includes\('\/cine\/'\)\) return;/);
  for (const f of ['cine/intro.mp4', 'cine/fin.mp4']) assert.ok(existsSync(new URL(f, jeu)), f);
});

test("le service worker télécharge des fichiers frais à l'installation (pas le cache HTTP)", () => {
  assert.match(lire('sw.js'), /cache: 'reload'/);
});

test("la progression confiée à Ludiworld : sans les réglages de l'appareil, et reprise telle quelle ailleurs", async () => {
  const { charger, sauver, versPartage, depuisPartage } = await import('../monde-a-la-craie/js/progres.js');
  const memoire = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const a = charger('Léo', memoire());
  a.connus = new Set(['FR', 'DE', 'JP']); a.meilleurs = { europe: 61.5 }; a.niveaux = { europe: 'moyen' }; a.voix = true; a.son = false; a.langue = 'en';
  const envoye = JSON.parse(JSON.stringify(versPartage(a)));
  assert.deepEqual(Object.keys(envoye).sort(), ['connus', 'meilleurs', 'niveaux', 'voyage']);
  const b = charger('Léo', memoire());
  b.voix = false; b.son = true; b.langue = 'fr';
  assert.equal(depuisPartage(b, envoye), true);
  assert.deepEqual([...b.connus].sort(), ['DE', 'FR', 'JP']);
  assert.deepEqual(b.meilleurs, { europe: 61.5 });
  assert.deepEqual(b.niveaux, { europe: 'moyen' });
  assert.deepEqual([b.voix, b.son, b.langue], [false, true, 'fr'], "les réglages de l'appareil ne bougent pas");
  assert.equal(depuisPartage(b, { connus: 'n importe quoi' }), false);
  assert.equal(depuisPartage(b, null), false);
  assert.deepEqual(b.niveaux, { europe: 'moyen' }, 'une donnée refusée ne change rien');
});
