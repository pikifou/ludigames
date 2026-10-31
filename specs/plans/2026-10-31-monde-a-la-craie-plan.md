# Le Monde à la craie : plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**But :** construire le jeu « Le Monde à la craie » (trouver les pays sur une carte au tableau noir, par zone) dans `ludigames/monde-a-la-craie/`, jouable seul, hors ligne et dans Ludiworld.

**Architecture :** un script Node (`tools/carte.js`) transforme une fois pour toutes les données Natural Earth (`world-atlas`) en `data/monde.json` (TopoJSON corrigé, avec code, noms, zone et statut de chaque forme). Le jeu est en HTML/CSS/JS simples (modules ES, sans build) : une logique pure testée sous Node (règles des manches, progression, toucher), et une couche d'affichage SVG (d3-geo + topojson-client copiés dans `lib/`).

**Technique :** JavaScript (modules ES), SVG, d3-geo 3.1.1, d3-array 3.2.4, topojson-client 3.1.0, Node 22 (`node --test`), Python + Playwright pour les tests navigateur, kit Ludiworld `ludi.js` 0.2.0.

**Spec :** `ludigames/specs/2026-10-31-monde-a-la-craie-design.md` (maquette validée : `ludigames/specs/maquettes/tableau-noir.html`).

## Contraintes globales

- Tout en local : **aucun push**, aucune activation de GitHub Pages. Commits sur `main` de `ludigames` autorisés.
- Ne jamais toucher à la config git globale (nom : pikifou). Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Jamais le port 8000. Serveur de test Ludiworld : `python ludiworld/tools/dev.py`, port 7357.
- Textes pour Julien et textes du jeu : pas de tiret long « — ». Espaces insécables avant `: ; ? !` en français.
- Couleurs en variables CSS. Pas de distinction par la couleur seule : pays trouvé = plein, pays à trouver = vide.
- Polices : Baloo 2 (écrit à la craie), Lexend (petits textes), en fichiers locaux (copiés de `ludiworld/docs/fonts/`). Jamais Inter, Roboto, Arial, system-ui.
- La carte vient des données, jamais d'une image générée. Arcads seulement pour l'icône et quelques dessins de décor, 20 € au plus en tout.
- Voix : coupée par défaut, à la demande (bouton haut-parleur), `speechSynthesis` avec voix locales seulement (`localService === true`). Jamais lue automatiquement à l'apparition du nom.
- 12 pays par manche ; erreur = croix + nom sur le pays touché, bon pays entouré environ 1,5 s, question reposée une seule fois plus tard.
- Pays connu = dernière question réussie du premier coup. « Le monde entier » se débloque quand les six zones sont à 50 % ou plus.
- Le jeu marche ouvert seul. Dans Ludiworld (`Ludi.inLauncher()`) : pas de plein écran, pas d'installation, pas de lien sortant, coin haut gauche libre (120 × 44 px).
- Le dépôt `ludiworld` contient le travail non commité d'une autre session : la tâche 7 n'y touche que si `git status` y est propre, sinon elle s'arrête et demande.

## Points de vigilance

1. **Téléphone en portrait (360 × 640) :** le nom le plus long (« République démocratique du Congo ») tient en deux lignes au plus sans couvrir la carte de la zone ; la carte reste entière. Test : tâche 5.
2. **Toucher pendant l'animation d'erreur :** un toucher pendant les 1,5 s où le bon pays clignote est ignoré (ni réponse, ni double avancée). Test : tâche 2 (`Manche`) et tâche 5.
3. **Pincer ou glisser qui finit sur un pays :** un geste de zoom ou de déplacement ne compte jamais comme réponse. Test : tâche 4.
4. **Stockage indisponible ou abîmé** (navigation privée, JSON cassé) : le jeu démarre et se joue, la progression repart de zéro sans erreur. Test : tâche 2.
5. **Rotation de l'écran ou redimensionnement en pleine manche :** la carte se recadre et les zones de toucher suivent (le pays touché est bien celui sous le doigt). Test : tâche 4.

---

## Fichiers

```
ludigames/
  package.json                 { "type": "module", scripts.test }
  .gitignore                   tools/.cache/
  README.md                    liste des jeux, comment en ajouter un
  tools/
    carte.js                   prépare data/monde.json
    pays.json                  table relue à la main : zone, statut, noms corrigés, rattachement
    onu.json                   les 193 codes alpha-2 des membres de l'ONU
  tests/
    donnees.test.js  regles.test.js  progres.test.js  toucher.test.js
    navigateur.py              Playwright : seul, téléphone, hors ligne, dans un faux cadre Ludiworld
  monde-a-la-craie/
    index.html  style.css  manifest.webmanifest  sw.js  ludi.js  ludi.json
    data/monde.json
    lib/ d3-array.min.js d3-geo.min.js topojson-client.min.js (+ LICENSE)
    fonts/ baloo2-*.woff2 lexend-*.woff2 (+ LICENSE-OFL)
    icons/ icon-192.png icon-512.png icon-maskable-512.png favicon-64.png
    js/ textes.js zones.js regles.js progres.js toucher.js carte.js sons.js voix.js main.js
    js/ecrans/ accueil.js partie.js decouvrir.js
```

---

### Tâche 1 : les données de la carte

**Fichiers :** créer `package.json`, `.gitignore`, `tools/carte.js`, `tools/pays.json`, `tools/onu.json`, `monde-a-la-craie/data/monde.json` (généré), `tests/donnees.test.js`.

**Interfaces :**
- Produit `monde-a-la-craie/data/monde.json` : une topologie TopoJSON avec l'objet `pays`, dont chaque géométrie a `properties = { code, fr, en, zone, quiz, de?, point?, rang }` :
  - `code` : alpha-2 (`"FR"`, `"XK"` pour le Kosovo) ;
  - `zone` : `"europe" | "afrique" | "asie" | "amerique-nord" | "amerique-sud" | "oceanie" | null` ;
  - `quiz` : `true` pour les 193 de l'ONU + `XK`, `PS`, `TW`, `VA` ;
  - `de` : nom du pays de rattachement pour un territoire (`{ fr: "Danemark", en: "Denmark" }`) ;
  - `point` : `[lon, lat]` pour un pays absent des formes (Tuvalu) ;
  - `rang` : rang de superficie dans sa zone (1 = le plus grand).

- [ ] **Étape 1 : écrire les tests de données** (`tests/donnees.test.js`, lit `monde-a-la-craie/data/monde.json` et `tools/onu.json`)
  - `les 193 membres de l'ONU sont interrogés` : chaque code de `onu.json` (193 codes) a une géométrie `quiz: true` ; `onu.json.length === 193`.
  - `pays interrogés en plus` : `XK`, `PS`, `TW`, `VA` ont `quiz: true` ; aucun autre code non-ONU n'a `quiz: true`.
  - `chaque pays interrogé a une zone, un nom fr et en, une forme ou un point`.
  - `les zones` : `RU` europe, `TR` asie, `CY` europe, `GE` `AM` `AZ` `KZ` asie, `MX` `CU` `PA` amerique-nord, `EG` afrique, `AU` `PG` oceanie ; chaque zone a au moins 12 pays interrogés.
  - `la Crimée est en Ukraine` : `d3.geoContains(UA, [34.1, 45.0])` vrai, faux pour `RU`.
  - `Somaliland et Chypre du Nord fusionnés` : aucune géométrie sans code ; `geoContains(SO, [45, 9.5])`, `geoContains(CY, [33.6, 35.25])`.
  - `Sahara occidental` : code `EH`, `quiz: false`, `de` absent, zone `afrique` ; `GL` a `de.fr === "Danemark"`.
  - `noms d'usage` : `CD.fr === "République démocratique du Congo"`, `CG.fr === "Congo"`, `PS.fr === "Palestine"`, `VA.fr === "Vatican"`, `MM.fr === "Birmanie"`, `TL.fr === "Timor oriental"`, `GB.fr === "Royaume-Uni"`, `CI.fr === "Côte d'Ivoire"` (apostrophe droite).
  - `Tuvalu` : `TV` a un `point` et `quiz: true`.
  - `rang` : dans chaque zone, les rangs vont de 1 à n sans trou ; `RU` rang 1 en europe.

- [ ] **Étape 2 : lancer, vérifier l'échec** : `node --test tests/donnees.test.js` → échec (fichier absent).

- [ ] **Étape 3 : écrire `tools/onu.json` et `tools/pays.json`**
  - `pays.json` : objet par code alpha-2 pour **toutes** les formes de la carte : `{ "zone": "...", "quiz": true }`, plus `"fr"`/`"en"` quand le nom CLDR ne convient pas, `"de"` pour les territoires. Les noms par défaut viennent de `Intl.DisplayNames(['fr'|'en'], { type: 'region' })`.

- [ ] **Étape 4 : écrire `tools/carte.js`** (`node tools/carte.js`)
  - Télécharge dans `tools/.cache/` (si absents) `world-atlas@2.0.2/countries-50m.json`, `i18n-iso-countries@7.14.0/codes.json`, et les trois bibliothèques de `lib/` (qu'il copie aussi dans `monde-a-la-craie/lib/` avec leurs licences).
  - Code alpha-2 depuis l'`id` numérique ; sans `id` : `Kosovo` → `XK`, `Somaliland` → fusion dans `SO`, `N. Cyprus` → fusion dans `CY`, `Siachen Glacier` → fusion dans `IN`, `Indian Ocean Ter.` → supprimé.
  - Crimée : le polygone de `RU` qui contient `[34.1, 45.0]` passe dans `UA`.
  - Les fusions passent par `topojson.mergeArcs` pour effacer la frontière intérieure.
  - Ajoute `point` pour `TV` (`[179.2, -8.5]`), calcule `rang` avec `d3.geoArea`, écrit `monde-a-la-craie/data/monde.json` (objet `pays`, coordonnées quantifiées, < 1 Mo).
  - Échoue avec un message clair si une forme n'a pas d'entrée dans `pays.json`.

- [ ] **Étape 5 : lancer et vérifier** : `node tools/carte.js && node --test tests/donnees.test.js` → tous les tests passent.

- [ ] **Étape 6 : commit** : `git add package.json .gitignore tools tests/donnees.test.js monde-a-la-craie/data monde-a-la-craie/lib` puis `git commit -m "Le Monde à la craie : données de la carte (Natural Earth corrigé, noms, zones)"`.

---

### Tâche 2 : les règles et la progression

**Fichiers :** créer `monde-a-la-craie/js/regles.js`, `monde-a-la-craie/js/progres.js`, `tests/regles.test.js`, `tests/progres.test.js`.

**Interfaces :**
- Consomme : la liste des pays d'une zone `{ code, rang }[]` (tâche 1).
- Produit (`regles.js`) :
  - `TAILLE_MANCHE = 12`, `REVISIONS = 3`, `SEUIL_MONDE = 0.5`, `DUREE_ERREUR = 1500` (ms).
  - `choisirManche(pays, connus: Set<string>, rand: () => number): string[]` : 12 codes distincts. D'abord les pays non connus de plus petit `rang` ; jusqu'à `REVISIONS` pays connus tirés au hasard ; complète avec des connus si la zone n'a plus assez de non connus. Ordre de la manche mélangé avec `rand`.
  - `class Manche` : `new Manche(codes, maintenant: () => number)` ; `.question: string | null` ; `.toucher(code): { resultat: 'juste' | 'faux' | 'ignore', bon?: string }` ; `.finie: boolean` ; `.resultats: Map<code, boolean>` (vrai = du premier coup) ; `.trouves: number`. Après `'faux'`, tout toucher est `'ignore'` pendant `DUREE_ERREUR` ; le code raté est remis en fin de file une fois ; raté une deuxième fois, il compte comme montré et la manche continue. Toucher un pays déjà trouvé ou `null` (la mer) : `'ignore'`.
  - `pourcentage(zonePays: string[], connus: Set<string>): number` (0 à 1).
  - `mondeDebloque(pourcentages: Record<zone, number>): boolean`.
- Produit (`progres.js`) :
  - `cle(joueur: string | null): string` → `"monde-a-la-craie.v1"` seul, `"monde-a-la-craie.v1." + encodeURIComponent(joueur)` sinon.
  - `charger(joueur, stockage = localStorage): { connus: Set<string>, meilleurs: Record<zone, number>, voix: boolean, son: boolean }`.
  - `enregistrerManche(etat, zone, resultats: Map, temps: number): { record: boolean }` : met à jour `connus` (ajoute si vrai, retire si faux) et `meilleurs[zone]` si la manche a été entièrement faite.
  - `sauver(joueur, etat, stockage = localStorage): void`.

- [ ] **Étape 1 : écrire les tests** (`tests/regles.test.js`, `tests/progres.test.js`)
  - `choisirManche : 12 codes distincts`, `les plus grands non connus d'abord` (zone de 20 pays, rien de connu → les rangs 1 à 12), `au plus 3 révisions`, `zone presque connue → complète avec des connus`.
  - `Manche : juste colorie et avance`, `faux renvoie le bon code`, `toucher pendant 1,5 s après une erreur est ignoré` (horloge simulée), `un raté revient une fois en fin de manche`, `raté deux fois : la manche continue`, `toucher la mer ou un pays trouvé : ignoré`, `finie après 12 pays`, `resultats : faux pour un pays raté puis trouvé`.
  - `pourcentage` et `mondeDebloque` (cinq zones à 0,6 et une à 0,49 → faux ; toutes à 0,5 → vrai).
  - `progres : un prénom par clé` (`cle("Lou")` ≠ `cle("Joshua")` ≠ `cle(null)`), `JSON abîmé → état vide sans exception`, `stockage qui lève une exception → état vide, sauver ne lève pas`, `connus : retiré après un raté`, `record seulement si meilleur temps`.

- [ ] **Étape 2 : lancer, vérifier l'échec** : `node --test tests/regles.test.js tests/progres.test.js`.
- [ ] **Étape 3 : implémenter `regles.js` et `progres.js`** selon les interfaces.
- [ ] **Étape 4 : lancer, tout passe.**
- [ ] **Étape 5 : commit** `"Le Monde à la craie : règles des manches et progression par enfant"`.

---

### Tâche 3 : toucher le bon pays

**Fichiers :** créer `monde-a-la-craie/js/toucher.js`, `tests/toucher.test.js`.

**Interfaces :**
- Produit : `RAYON_MIN = 44` (px CSS) ; `paysTouche(point: [x, y], cibles: { code, contient: (p) => boolean, centre: [x, y], rayon: number }[]): string | null`. D'abord une cible dont `contient(point)` est vrai ; sinon, parmi les cibles dont le cercle `max(rayon, RAYON_MIN)` contient le point, celle dont le centre est le plus proche ; sinon `null`.

- [ ] **Étape 1 : tests** : `dans le contour → ce pays même si un petit pays est proche` ; `à côté du Vatican (point à 30 px de son centre, hors de tout contour) → VA` ; `entre Monaco et Saint-Marin → le centre le plus proche` ; `en pleine mer → null`.
- [ ] **Étape 2 : échec** : `node --test tests/toucher.test.js`.
- [ ] **Étape 3 : implémenter `paysTouche`.**
- [ ] **Étape 4 : tout passe.**
- [ ] **Étape 5 : commit** `"Le Monde à la craie : toucher les petits pays"`.

---

### Tâche 4 : la carte à la craie (affichage, zoom, recadrage)

**Fichiers :** créer `monde-a-la-craie/js/zones.js`, `monde-a-la-craie/js/carte.js`, une page de test `tests/carte.html` ; créer `tests/navigateur.py` (premières vérifications).

**Interfaces :**
- Consomme : `data/monde.json` (tâche 1), `paysTouche` (tâche 3).
- Produit (`zones.js`) : `ZONES: { id, fr, en, projection: () => d3.GeoProjection, cadre: [[ouest, sud], [est, nord]] }[]` pour les six zones, et `MONDE` (Natural Earth, sans l'Antarctique). Europe : `geoConicConformal().rotate([-14, 0]).parallels([40, 62])`, cadre `[[-11, 34], [42, 66]]` (cadrages des autres zones laissés au constructeur ; chaque pays interrogé de la zone doit être entièrement visible).
- Produit (`carte.js`) : `creerCarte(svg: SVGSVGElement, monde, zone): Carte` avec
  - `carte.etat(code, 'vide' | 'trouve' | 'erreur' | 'montre', couleur?: 1 | 2 | 3 | 4)` ;
  - `carte.ecrire(code, texte)` (nom à la craie sur le pays) ;
  - `carte.surToucher(fn: (code: string | null) => void)` : appelé pour un **tap** seulement (déplacement < 10 px et durée < 500 ms, un seul doigt) ;
  - `carte.recadrer()` (appelé sur `resize` et `orientationchange`) ; `carte.vueEntiere()` ;
  - zoom : pincer à deux doigts, molette, glisser ; zoom de 1 à 8.
- Rendu : un `<path>` par forme dans un `<g>` transformé ; petits pays et `point` dessinés avec un rond à la craie ; filtre SVG de grain léger (repris de la maquette).

- [ ] **Étape 1 : tests navigateur** (`tests/navigateur.py`, serveur `python -m http.server 7360` lancé par le test dans `ludigames/`)
  - `toutes les zones se cadrent` : pour chaque zone sur 1280 × 800 et 360 × 640, chaque pays interrogé de la zone a sa boîte englobante dans le SVG.
  - `un geste de glisser qui finit sur un pays n'appelle pas surToucher`.
  - `un pincement n'appelle pas surToucher`.
  - `après passage de 1280 × 800 à 800 × 1280, un tap au centre de la France renvoie FR`.
- [ ] **Étape 2 : échec** : `python tests/navigateur.py carte`.
- [ ] **Étape 3 : implémenter `zones.js` et `carte.js`.**
- [ ] **Étape 4 : tout passe**, et capture `tests/captures/carte-<zone>.png` regardée pour chaque zone.
- [ ] **Étape 5 : commit** `"Le Monde à la craie : la carte à la craie, zoom et recadrage"`.

---

### Tâche 5 : les écrans et la direction artistique

**Fichiers :** créer `monde-a-la-craie/index.html`, `style.css`, `js/textes.js`, `js/sons.js`, `js/voix.js`, `js/main.js`, `js/ecrans/accueil.js`, `js/ecrans/partie.js`, `js/ecrans/decouvrir.js`, `fonts/` ; compléter `tests/navigateur.py`.

**Interfaces :**
- Consomme : tâches 1 à 4.
- Produit : `textes.js` → `t(cle, vars?)` en `fr` ou `en` selon `navigator.language` ; `voix.js` → `voixDisponible(): boolean`, `dire(texte, langue)` (voix locale de la langue, sinon rien) ; `sons.js` → `son('craie' | 'juste' | 'faux' | 'effacer')`, coupé si `etat.son === false`.
- Écrans (spec, section « Les écrans ») :
  - **Accueil** : carte du monde, six zones écrites et entourées avec leur pourcentage, « Le monde entier » en pointillés avec cadenas tant que `mondeDebloque` est faux ; une zone touchée → Jouer / Découvrir.
  - **Partie** : nom en haut (Baloo 2, souligné), « 7 / 12 » en haut à gauche (décalé sous la place du bouton retour Ludiworld quand `Ludi.inLauncher()`), chrono en haut à droite, pause ; fin de manche écrite au tableau : pays trouvés, du premier coup, temps, meilleur temps, « Encore une manche » / « Changer de zone ».
  - **Découvrir** : toucher = colorier + écrire le nom sur le pays et en grand en haut ; territoires avec rattachement : « Groenland (Danemark) ».
  - Réglages dans un coin : son, voix (interrupteur ; si `voixDisponible()` est faux, l'interrupteur est grisé avec « Pas de voix sur cet appareil »).

- [ ] **Étape 1 : tests navigateur** (`python tests/navigateur.py ecrans`, avec `?graine=1` pour un tirage fixe et `?vite=1` pour raccourcir les animations)
  - `une manche complète` : 12 taps justes → écran de fin, « 12 » et un temps affichés.
  - `une erreur` : tap sur un mauvais pays → croix sur ce pays, bon pays en état `montre`, puis le même nom revient avant la fin.
  - `tap pendant l'animation d'erreur ignoré` (compteur inchangé).
  - `Découvrir : toucher le Groenland écrit "Groenland (Danemark)"`.
  - `téléphone portrait 360 × 640 : "République démocratique du Congo" sur 2 lignes au plus, sans chevaucher la carte`.
  - `voix coupée par défaut, aucun appel à speechSynthesis.speak pendant une manche`.
  - `stockage bloqué (localStorage qui lève) : la page démarre et une manche se joue`.
  - `aucune erreur console`.
- [ ] **Étape 2 : échec.**
- [ ] **Étape 3 : implémenter les écrans**, la DA suivant `specs/maquettes/tableau-noir.html` (cadre en bois, ardoise, grain, craies colorées). « Le monde entier » se joue comme une zone dont les pays sont tous les pays interrogés (carte `MONDE`). Dessins de décor Arcads (marmotte qui écrit, boussole) seulement s'ils apportent quelque chose une fois les écrans en place.
- [ ] **Étape 4 : tout passe** ; captures tablette 1280 × 800, téléphone paysage 800 × 360 et portrait 360 × 640, ordinateur 1440 × 900, regardées une à une.
- [ ] **Étape 5 : commit** `"Le Monde à la craie : écrans, tableau noir, sons et voix en option"`.

---

### Tâche 6 : appli installable, hors ligne, kit Ludiworld, icône

**Fichiers :** créer `monde-a-la-craie/manifest.webmanifest`, `sw.js`, `ludi.js` (copie de `ludiworld/docs/kit/ludi.js` 0.2.0), `ludi.json`, `icons/` ; modifier `js/main.js`, `js/ecrans/partie.js` ; créer `ludigames/README.md` ; compléter `tests/navigateur.py`.

**Interfaces :**
- Consomme : `Ludi.init`, `Ludi.checkpoint`, `Ludi.skill`, `Ludi.progress`, `Ludi.score`, `Ludi.onWrapUp`, `Ludi.inLauncher`, `Ludi.player` (voir `ludiworld/spec/kit.md`).
- Appels : `Ludi.init({ game: "monde-a-la-craie" })` ; à chaque question `Ludi.skill("geographie.pays", <nom fr>, <du premier coup>)` ; fin de manche `Ludi.checkpoint("fin-de-manche")`, `Ludi.progress("zone-" + zone, <pourcentage arrondi>)`, `Ludi.score("chrono-" + zone, <secondes>, { better: "lower" })` ; `Ludi.onWrapUp(m => …)` : à 0, pas de « Encore une manche ». Joueur pour `progres.js` : `Ludi.player()?.name ?? null`.
- `sw.js` : met en cache toute l'application (page, scripts, `lib/`, `data/monde.json`, polices, icônes), portée `./` ; version changée à chaque modification.
- `ludi.json` : format de `ludiworld/spec/fiche.md`, `id: "monde-a-la-craie"`, `url: "https://pikifou.github.io/ludigames/monde-a-la-craie/"`, `age {min: 6, max: 12}`, `reading: "some"`, `learning.level: "core"`, `domains: ["geographie.pays"]`, `session.minutes [3, 10]`, `natural_end: true`, `offline: true`, `kit: true`, textes fr et en honnêtes (ce qu'on apprend, comment : erreur montrée et reposée, pas de compte à rebours).
- Icône : générée avec Arcads (globe ou carte à la craie sur ardoise, pleine, sans bord blanc), recadrée et redimensionnée ; crédits Arcads vérifiés avant et après.

- [ ] **Étape 1 : tests navigateur** (`python tests/navigateur.py appli`)
  - `hors ligne` : après une première visite, la page recharge et une manche se joue avec le réseau coupé.
  - `dans un cadre Ludiworld` : page de test qui ouvre le jeu dans une iframe et répond au kit (`ludi:hello` → `ludi:welcome` avec `{ player: { name: "Joshua" } }`) ; pas de bouton plein écran ni d'installation ; coin 120 × 44 libre ; un événement `checkpoint` reçu en fin de manche ; la progression est enregistrée sous `cle("Joshua")`.
  - `seul` : boutons plein écran et installation visibles quand le navigateur les permet.
- [ ] **Étape 2 : échec.**
- [ ] **Étape 3 : implémenter.** `node ludiworld/tools/valider.js ludigames/monde-a-la-craie/ludi.json` doit passer, si le script le permet en local.
- [ ] **Étape 4 : tous les tests passent** (`npm test` et `python tests/navigateur.py`).
- [ ] **Étape 5 : commit** `"Le Monde à la craie : appli hors ligne, kit Ludiworld, fiche et icône"`.

---

### Tâche 7 : brancher le jeu dans Ludiworld (local)

**Préalable :** `git -C ludiworld status --short` est vide. Sinon : s'arrêter et demander à Julien.

**Fichiers :** modifier `ludiworld/tools/dev.py`, `ludiworld/spec/domaines.md`, `ludiworld/docs/textes.js` et les libellés de domaines du site (là où se trouve `emotions.frustration`), `ludiworld/docs/jeux/index.json` ; créer `ludiworld/docs/jeux/monde-a-la-craie.json` (copie de la fiche).

**Interfaces :**
- `dev.py` : un dossier cloné **sans** `index.html` publié mais avec des sous-dossiers contenant `ludi.json` et `index.html` est un dépôt multi-jeux ; chaque sous-dossier est servi à `/<dépôt>/<jeu>/`, et l'URL de sa fiche (`https://pikifou.github.io/<dépôt>/<jeu>/`) est réécrite vers le local comme pour les autres jeux.
- Nouvelle notion : `geographie.pays` → « Pays du monde » / « Countries of the world ».

- [ ] **Étape 1 : test** : ajouter à `ludiworld/tests/captures.py` le scénario `monde-a-la-craie` : le jeu apparaît dans le catalogue, se lance depuis l'appli, une manche se termine, un checkpoint arrive.
- [ ] **Étape 2 : échec.**
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : tout passe** : `node --test tests/*.test.js` (Ludiworld) et `python tests/captures.py`.
- [ ] **Étape 5 : commit dans `ludiworld` (branche courante)** : `"Le Monde à la craie au catalogue ; dev.py sert les dépôts à plusieurs jeux ; notion geographie.pays"`. Pas de push.
