# ludigames

Les jeux de Julien pour [Ludiworld](https://pikifou.github.io/ludiworld/), réunis dans un seul dépôt. Chaque jeu vit dans son dossier, marche seul (et hors ligne) et parle à Ludiworld grâce au kit `ludi.js`.

## Les jeux

| Jeu | Dossier | Adresse |
|---|---|---|
| Le Monde à la craie : trouver les pays du monde sur une carte au tableau noir | `monde-a-la-craie/` | https://pikifou.github.io/ludigames/monde-a-la-craie/ |

## Ajouter un jeu

1. Un dossier à la racine, au nom de l'`id` de sa fiche (minuscules et tirets).
2. Dedans : `index.html`, `ludi.json` (la fiche, voir `ludiworld/spec/fiche.md`), `ludi.js` (copie du kit), `manifest.webmanifest` et `sw.js` (portée limitée au dossier du jeu).
3. Le jeu doit marcher ouvert seul, sans Ludiworld.

GitHub Pages publie la racine de `main` : un jeu est en ligne à `https://pikifou.github.io/ludigames/<dossier>/`.

## Le Monde à la craie

- `node tools/carte.js` : prépare la carte (`monde-a-la-craie/data/monde.json`) à partir de Natural Earth, avec les corrections de `tools/pays.json` (zones, noms, territoires).
- `node tools/version.js` : à lancer après chaque modification du jeu, pour que l'appli installée se mette à jour.
- `npm test` : tests de la logique et des données. `python tests/navigateur.py` : tests dans le navigateur (port 7360).
- Conception et plan : `specs/`.

Carte : [Natural Earth](https://www.naturalearthdata.com) (domaine public), via `world-atlas`. Bibliothèques : d3-geo, d3-array, topojson-client (licence ISC). Polices : Baloo 2 et Lexend (SIL Open Font License).
