# Le Monde à la craie : conception

Jeu pour apprendre où sont les pays du monde, premier jeu du dépôt `ludigames`, prêt pour Ludiworld.

Statut : à valider par Julien. Les points marqués **(choix de Claude)** n'ont pas été tranchés par Julien et peuvent être remis en cause.

## Pourquoi

Le grand frère de Joshua a appris les pays à 6 ans avec GeoMaster, une appli iPhone aujourd'hui retirée des stores faute de mises à jour. Julien veut la même chose pour Joshua (6 ans, lit bien) : une carte lisible, un nom de pays, on le touche. Simple, sans empilement de modes.

On ne refait pas GeoMaster : nouveau nom, nouvelle mise en scène. On garde ce qui marchait : la carte au centre, très lisible, le tableau noir, jouer par zone, l'erreur qui montre la bonne réponse et repose la question plus tard, le chrono qui ne sert qu'à battre son propre temps.

Réussite : Joshua y revient de lui-même, et au bout de quelques semaines il situe les pays d'Europe sans hésiter.

## Pour qui

- **Joueur :** un enfant de 6 à 12 ans qui lit (le nom du pays est écrit, pas dit).
- **Parent :** retrouve le jeu dans Ludiworld, avec une fiche honnête et le suivi des pays connus.

## Objectifs

1. Trouver un pays sur la carte à partir de son nom, par zone, en manches courtes.
2. Découvrir librement les pays en les touchant.
3. Voir sa progression : pays connus par zone, meilleur temps.
4. Carte juste (vraies données géographiques) et lisible sur tablette, téléphone et ordinateur.
5. Marcher seul et hors ligne, et dans Ludiworld avec le kit.

## Hors sujet pour cette version

Capitales, drapeaux, villes, mers, montagnes ; jeu à plusieurs ; classements en ligne ; compte à rebours.

## À éviter absolument

- Une carte fausse (un pays dans le mauvais continent, une frontière inventée). C'était le reproche fait à GeoMaster.
- Une image générée par IA pour la géographie : la carte vient de données, toujours.
- Un jeu qui punit ou met la pression : pas de vies, pas de « perdu ».
- Un texte illisible sur téléphone, des petits pays impossibles à toucher.
- Le rebord en bois avec brosse et craies, les étiquettes papier du menu et tout autre détail propre à l'écran de GeoMaster.

## Direction artistique : le tableau noir

Validée par Julien sur la maquette `maquettes/tableau-noir.html` (capture : `maquettes/tableau-noir.png`).

- Ardoise vert sombre avec traces d'effacement et grain de craie léger, cadre en bois tout autour.
- Carte tracée à la craie blanche (filtre SVG de grain, léger : le trait reste net).
- Pays trouvés coloriés à la craie de couleur : jaune, bleu, rose, orange. Un pays trouvé est **plein**, un pays à trouver est **vide** : on ne distingue jamais par la couleur seule (daltonisme).
- Le nom à trouver est écrit en grand, à la craie, souligné.
- Menu : la carte du monde, chaque zone écrite à la main et entourée, avec son nombre de pays et sa progression.
- Polices : Baloo 2 pour tout ce qui est « écrit à la craie », Lexend pour les petits textes, embarquées dans le jeu (hors ligne).
- Couleurs en variables CSS (`--color-ardoise`, `--color-craie`, `--craie-jaune`…).
- Arcads seulement pour le décor, quand il apporte quelque chose : icône du jeu (pleine, sans bord blanc), quelques dessins à la craie (marmotte de Ludiworld qui écrit au tableau, boussole) **(choix de Claude)**. Budget Arcads global de Julien : 20 € au plus.
- Sons courts : craie qui crisse quand le nom s'écrit, petit « tac » juste, effacement en fin de manche. Générés par le navigateur (Web Audio), pas de fichiers **(choix de Claude)**. Bouton pour couper le son.

## Les écrans

### 1. Le tableau des zones (accueil)
Carte du monde à la craie. Six zones entourées : Europe, Afrique, Asie, Amérique du Nord (avec l'Amérique centrale et les Caraïbes), Amérique du Sud, Océanie. Sous chaque nom : le pourcentage de pays connus. On touche une zone pour la choisir, puis deux boutons : **Jouer** et **Découvrir**.

« Le monde entier » apparaît quand chaque zone est connue à 50 % au moins **(choix de Claude)**. Avant, il est écrit en pointillés avec un cadenas dessiné.

Dans un coin : son, voix, langue. Hors Ludiworld seulement : bouton plein écran et installation.

### 2. Jouer : une manche
- 12 pays par manche (toutes les zones en ont au moins 12).
- Le nom s'écrit en haut, à la craie. Compteur « 7 / 12 » en haut à gauche, chrono qui monte en haut à droite (pas de limite).
- **Juste :** le pays se colorie, petit son, nom suivant.
- **Faux :** le pays touché se marque d'une croix à la craie avec son nom écrit petit dessus (on apprend aussi de l'erreur) ; le bon pays est entouré et clignote environ 1,5 s ; le nom revient plus tard dans la manche, une seule fois. S'il est encore raté, il est montré et la manche continue.
- Toucher la mer ou un pays déjà trouvé : rien ne se passe, pas de pénalité.
- Pause : arrête le chrono, propose Reprendre ou Quitter.
- **Fin de manche :** le tableau garde la carte coloriée ; s'écrivent « 12 pays trouvés », combien du premier coup, le temps et le meilleur temps de la zone. Boutons : Encore une manche, Changer de zone. C'est le point d'arrêt pour Ludiworld.

### 3. Découvrir
La carte de la zone, sans question ni chrono. On touche un pays : il se colorie et son nom s'écrit à la craie près de lui (et en grand en haut). Les territoires sont nommés avec leur rattachement : « Groenland (Danemark) ».

### 4. Le zoom
Sur toutes les cartes : pincer pour zoomer, glisser pour déplacer, molette à la souris, bouton pour revenir à la vue entière.

## Les règles de progression

- **Pays connu :** sa dernière question dans une manche a été réussie du premier coup. Le pourcentage d'une zone = pays connus / pays de la zone.
- **Choix des 12 pays d'une manche** **(choix de Claude)** : les pays de la zone sont rangés du plus grand au plus petit (superficie). La manche puise d'abord dans les pays pas encore connus parmi les plus grands, et ajoute deux ou trois pays déjà connus pour réviser. Les petits pays arrivent naturellement quand les grands sont connus. Joshua commence donc par la France, l'Espagne, la Pologne, pas par Andorre.
- Rien ne se perd : la progression est gardée sur l'appareil.
- **Plusieurs enfants sur la même tablette** **(choix de Claude)** : dans Ludiworld, la progression est rangée sous le prénom donné par `Ludi.player()`. Ouvert seul, une seule progression. Ainsi Joshua et son frère ont chacun leurs pourcentages et leurs manches.

## Le contenu géographique

- **Source de la carte :** Natural Earth (domaine public), via le paquet `world-atlas` (TopoJSON, échelle 1:50 m), copié dans le jeu pour marcher hors ligne. Les microÉtats absents à cette échelle sont ajoutés en points (Natural Earth fournit aussi ces points).
- **Frontières disputées** **(choix de Claude)** : la carte suit ce que montre un atlas scolaire français. La Crimée est en Ukraine. Le Kosovo est un pays. Le Sahara occidental est un territoire. Le Somaliland est rattaché à la Somalie, et Chypre du Nord à Chypre (une seule forme chacun). Le Cachemire est partagé selon les lignes de contrôle, sans le nommer à part. Le script de `tools/` corrige les formes de `world-atlas` si besoin (fusion de formes), et un test vérifie ces cas un par un.
- **Pays interrogés :** les 193 membres de l'ONU, plus le Kosovo, la Palestine, Taïwan et le Vatican **(choix de Claude)**.
- **Territoires** (Groenland, Sahara occidental, Nouvelle-Calédonie, Porto Rico…) : dessinés, nommés dans Découvrir avec leur rattachement, jamais interrogés.
- **Zones** **(choix de Claude)** : la Russie est en Europe, la Turquie et le Caucase en Asie, Chypre en Europe, le Mexique, l'Amérique centrale et les Caraïbes en Amérique du Nord. La table des zones est écrite à la main dans un fichier de données relu, avec un test qui vérifie que chaque pays interrogé a exactement une zone.
- **Noms :** français et anglais, courts et usuels (« Royaume-Uni », « États-Unis », « Corée du Sud », « République démocratique du Congo »). Liste de base tirée d'une source ouverte (CLDR ou équivalent), puis relue à la main.
- **Projection par zone :** conique conforme pour l'Europe, adaptée pour chaque continent, Natural Earth pour le monde. Le cadrage est réglé zone par zone pour que la carte soit lisible en paysage et en portrait.

## Les petits pays

- Chaque pays a une zone de toucher d'au moins 44 px de rayon autour de son centre visuel, même s'il est minuscule à l'écran.
- Quand le doigt tombe sur plusieurs zones de toucher, on prend le pays dont le contour contient le point, sinon le centre le plus proche.
- Les microÉtats (Vatican, Monaco, Saint-Marin, Liechtenstein, Malte, Andorre, Singapour, îles des Caraïbes et du Pacifique) sont dessinés avec un petit rond à la craie pour qu'on les voie.

## La voix (option)

- Coupée par défaut. Interrupteur dans les réglages.
- Quand elle est activée, un bouton haut-parleur apparaît à côté du nom : on touche pour l'entendre. Le jeu ne lit jamais le nom tout seul au moment où il l'écrit. C'est ainsi que Claude comprend « ne le dis pas en même temps, mets-le en option » ; à confirmer. Dans Découvrir, toucher un pays lit son nom si la voix est activée.
- Voix de l'appareil uniquement (`speechSynthesis`, voix locales, `localService`). Jamais de voix générée par Arcads ni de voix en ligne.

## Ludiworld

- Fiche `ludi.json` complète (format de `ludiworld/spec/fiche.md`) : âge 6 à 12, `reading: "some"`, `learning.level: "core"`, nouvelle notion `geographie.pays` à ajouter à `ludiworld/spec/domaines.md` et aux libellés de l'appli et du site, `session.minutes [3, 10]`, `natural_end: true`, `offline: true`, `kit: true`.
- Kit `ludi.js` 0.2.0 copié dans le jeu.
  - `Ludi.checkpoint("fin-de-manche")` à chaque fin de manche.
  - `Ludi.skill("geographie.pays", <nom français du pays>, <réussi du premier coup>)` à chaque question. Le nom plutôt que le code ISO pour que le carnet parent soit lisible tel quel **(choix de Claude)**.
  - `Ludi.progress("zone-<id>", <pourcentage>)`, `Ludi.score("chrono-<zone>", <secondes>, { better: "lower" })`.
  - `Ludi.onWrapUp` : à 0 minute, la fin de manche ne propose plus « Encore une manche ».
- Dans Ludiworld (`Ludi.inLauncher()`) : pas de bouton plein écran ni d'installation, aucun lien sortant, coin haut gauche libre (120 × 44 px). Le prénom n'est pas affiché par ce jeu (rien à saisir).
- Fiche ajoutée au catalogue Ludiworld (`ludiworld/docs/jeux/`), comme les autres jeux.
- **Suivi pour le parent** **(choix de Claude)** : dans cette version, le détail par zone se voit dans le jeu (tableau des zones). Le carnet Ludiworld montre ce qu'il montre déjà pour les autres jeux (notions réussies, temps) ; on ne le modifie pas pour ce jeu.

## Le dépôt `ludigames`

- Un dossier par jeu à la racine : `monde-a-la-craie/`. Publication GitHub Pages depuis la racine de `main` : le jeu est à `https://pikifou.github.io/ludigames/monde-a-la-craie/`.
- Chaque dossier de jeu est autonome : `index.html`, scripts, données, polices, icônes, `manifest.webmanifest`, `sw.js` (portée limitée à son dossier), `ludi.js`, `ludi.json`.
- HTML, CSS et JavaScript simples, sans framework. Un script dans `tools/` prépare les données géographiques (téléchargement, simplification, noms, zones) et écrit un fichier de données versionné ; le jeu publié n'a pas d'étape de build **(choix de Claude)**.
- `README.md` à la racine : la liste des jeux et comment en ajouter un.
- Le serveur de test de Ludiworld (`ludiworld/tools/dev.py`) apprend à servir un dépôt qui contient plusieurs jeux (un sous-dossier avec `ludi.json` et `index.html` = un jeu), et à réécrire l'adresse de la fiche vers le local.

## Tests

- Logique (node --test) : choix des 12 pays, retour d'un pays raté une seule fois, calcul du pourcentage, déblocage du monde entier, toucher des petits pays.
- Données : chaque pays interrogé a un nom FR et EN, une forme ou un point, et exactement une zone ; les 193 membres de l'ONU sont tous là.
- Navigateur (Playwright) : une manche complète seul ; une erreur montre le bon pays ; Découvrir ; zoom ; hors ligne après la première visite ; dans Ludiworld (pas de plein écran ni d'installation, checkpoint reçu en fin de manche).
- Captures sur tablette, téléphone en paysage et en portrait, ordinateur.

## Laissé au constructeur

Le détail des projections et des cadrages, le grain exact de la craie, les animations d'écriture, l'organisation du code, le format du fichier de données.
