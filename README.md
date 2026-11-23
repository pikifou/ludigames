# ludigames

Les jeux de Julien pour [Ludiworld](https://pikifou.github.io/ludiworld/), réunis dans un seul dépôt. Chaque jeu vit dans son dossier, marche seul (et hors ligne) et parle à Ludiworld grâce au kit `ludi.js`.

## Les jeux

| Jeu | Dossier | Adresse |
|---|---|---|
| Le Monde à la craie : trouver les pays du monde sur une carte au tableau noir | `monde-a-la-craie/` | https://pikifou.github.io/ludigames/monde-a-la-craie/ |
| Le Chemin du Roi : apprendre les échecs avec un vieux sage et ses amis | `chemin-du-roi/` | https://pikifou.github.io/ludigames/chemin-du-roi/ |
| Les Défis de Barnabé : s'entraîner aux échecs avec des défis au bord de la mer (la suite du Chemin du Roi) | `defis-de-barnabe/` | https://pikifou.github.io/ludigames/defis-de-barnabe/ (pas encore publié) |

## Ajouter un jeu

1. Un dossier à la racine, au nom de l'`id` de sa fiche (minuscules et tirets).
2. Dedans : `index.html`, `ludi.json` (la fiche, voir `ludiworld/spec/fiche.md`), `ludi.js` (copie du kit), `manifest.webmanifest` et `sw.js` (portée limitée au dossier du jeu).
3. Le jeu doit marcher ouvert seul, sans Ludiworld.

GitHub Pages publie la racine de `main` : un jeu est en ligne à `https://pikifou.github.io/ludigames/<dossier>/`.

## Le Monde à la craie

- `node tools/carte.js` : prépare la carte (`monde-a-la-craie/data/monde.json`) à partir de Natural Earth, avec les corrections de `tools/pays.json` (zones, noms, territoires).
- `node tools/version.js` : à lancer après chaque modification du jeu (`node tools/version.js chemin-du-roi` pour l'autre jeu), pour que l'appli installée se mette à jour.
- `npm test` : tests de la logique et des données. `python tests/navigateur.py` : tests dans le navigateur (port 7360).
- Conception et plan : `specs/`.

Carte : [Natural Earth](https://www.naturalearthdata.com) (domaine public), via `world-atlas`. Bibliothèques : d3-geo, d3-array, topojson-client (licence ISC). Polices : Baloo 2 et Lexend (SIL Open Font License).

## Le Chemin du Roi

- `js/echecs.js` : les règles (coups légaux, échec, mat, pat, roque, prise en passant, promotion) et les adversaires (recherche alpha-bêta peu profonde, avec une part de hasard selon l'ami). `js/exercice.js` : les buts des exercices et leur note en étoiles. `js/lecons.js` : l'histoire, les leçons et les positions. Rien de tout ça ne touche à la page.
- `node tools/version.js chemin-du-roi` après chaque modification. `node --test` : règles (perft), validité et solution de chaque exercice. `python tests/chemin-navigateur.py` : tout le chemin joué depuis une sauvegarde vide, une vraie partie, six formats d'écran, hors ligne (port 7362).
- Pour tester : `?tout` ouvre toutes les leçons, `?lecon=<id>` ouvre une leçon, `?amis` les parties.
- Images : Higgsfield (Nano Banana 2), détourées par `factory/direction-artistique/tour22-echecs/preparer.py`.

## Les Défis de Barnabé

- Le même moteur que Le Chemin du Roi (`js/echecs.js`, `js/exercice.js`, `js/plateau.js`), avec deux buts de plus : la fourchette et la parade au mat.
- `node tools/defis.js` fabrique les 90 défis dans `defis-de-barnabe/js/defis.js` : des positions tirées au hasard ou de parties jouées par le moteur, gardées seulement si elles ont la bonne forme (le hasard est réglé : toujours le même résultat). Ne pas modifier `defis.js` à la main.
- `node tools/version.js defis-de-barnabe` après chaque modification. `node --test tests/defis-contenu.test.js` : chaque défi a une solution. `python tests/defis-navigateur.py` : tout le jeu joué dans le navigateur (port 7374).
- Pour tester : `?tout` ouvre tout, `?lecon=<bouteille>` (par exemple `?lecon=jetee-1`), `?amis` le match, `?histoire`, `?fin`.
- Images : Higgsfield (Nano Banana Pro), musique : ElevenLabs.
