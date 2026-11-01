// Version du jeu = empreinte de ses fichiers : node tools/version.js l'écrit dans sw.js.
// Ainsi l'appli installée se met à jour dès qu'un fichier change, et jamais pour rien.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const jeu = new URL('../monde-a-la-craie/', import.meta.url);

function fichiers(dossier = '', liste = []) {
  for (const f of readdirSync(new URL(dossier || '.', jeu)).sort()) {
    const chemin = dossier + f;
    if (statSync(new URL(chemin, jeu)).isDirectory()) fichiers(chemin + '/', liste);
    else if (chemin !== 'sw.js') liste.push(chemin);
  }
  return liste;
}

export function versionDuJeu() {
  const h = createHash('sha256');
  for (const f of fichiers()) {
    h.update(f);
    // Fins de ligne neutres : la même version sous Windows (CRLF) et sur GitHub (LF).
    h.update(/\.(png|woff2|webp)$/.test(f) ? readFileSync(new URL(f, jeu)) : readFileSync(new URL(f, jeu), 'utf8').replace(/\r\n/g, '\n'));
  }
  return 'monde-a-la-craie-' + h.digest('hex').slice(0, 10);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sw = new URL('sw.js', jeu), v = versionDuJeu();
  writeFileSync(sw, readFileSync(sw, 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${v}';`));
  console.log(v);
}
