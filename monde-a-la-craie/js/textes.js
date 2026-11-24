// Tous les textes du jeu, en français et en anglais (selon la langue de l'appareil).
const NB = ' ';

const TEXTES = {
  fr: {
    titre: 'Le Monde à la craie',
    jouer: 'Jouer', decouvrir: 'Découvrir', retour: 'Retour',
    nbPays: '{n} pays', connus: `{p}${NB}% connus`,
    monde: 'Le monde entier', mondeFerme: `Connais chaque continent à moitié, en Facile, pour l’ouvrir`,
    facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile', niveau: 'Niveau',
    niveauPays: `{n} pays · {p}${NB}% connus`, niveauFerme: `Pour l’ouvrir, connais ce niveau à moitié sur chaque continent.`,
    compteur: '{n} / {total}',
    trouves: '{n} pays trouvés', premierCoup: 'dont {n} du premier coup', temps: 'en {t}',
    record: `Nouveau record${NB}!`, meilleur: `Meilleur temps${NB}: {t}`,
    encore: 'Encore une manche', changer: 'Changer de zone', plusDeManche: `C’est l’heure d’arrêter. Bravo pour ce voyage${NB}!`,
    pause: 'Pause', reprendre: 'Reprendre', quitter: 'Quitter',
    reglages: 'Réglages', musique: 'Musique', bruitages: 'Bruitages', voix: 'Voix', langue: 'Langue', pasDeVoix: 'Pas de voix sur cet appareil',
    lecture: 'Lecture', lecture_none: 'Quand je touche un texte', lecture_some: 'Les longs textes, d’eux-mêmes', lecture_all: 'Tout, de lui-même',
    ecouter: 'Écouter le nom', vueEntiere: 'Toute la carte',
    toucheUnPays: 'Touche un pays pour lire son nom',
    ficheConsigne: `Touche un pays${NB}: ses petits secrets s’écrivent ici.`, pasDeSavoir: 'Pas encore de petits secrets sur celui-là.',
    savaisTu: `Le savais-tu${NB}?`, toucheContinuer: 'Touche la carte pour continuer', credit: `Image${NB}: {a} · {l}`, domainePublic: 'domaine public', auteurInconnu: 'Auteur inconnu', ecouterFiche: 'Écouter',
    credits: 'Crédits', voirImage: 'Voir l’image', creditFichier: 'Wikimedia Commons, {f}',
    creditCarte: `Carte${NB}: {c} (domaine public)`, creditPolices: `Polices${NB}: Baloo 2 et Lexend ({l})`, creditBiblio: `Bibliothèques${NB}: d3-geo, d3-array, topojson-client ({l})`,
    creditImages: 'Les {n} images viennent de Wikimedia Commons. Elles ont été réduites pour le jeu et gardent leur licence d’origine.',
    creditSeul: `Les liens vers chaque image et sa licence sont dans le jeu ouvert seul${NB}: {u}`,
    pleinEcran: 'Plein écran', installer: 'Installer le jeu',
    secondes: '{s}{NB}s', minutes: '{m}{NB}min{NB}{s}',
    // le tour du monde de Nina
    histoireIntro1: `Nina part faire le tour du monde, son sac sur le dos${NB}!`,
    histoireIntro2: `Aide-la à trouver les pays. Sur chaque continent, elle gagne un tampon dans son carnet de voyage.`,
    histoireEnRoute: `En route${NB}!`,
    histoireFinTitre: `Le tour du monde${NB}!`,
    histoireFin1: `Six tampons${NB}: Nina a fait le tour du monde${NB}!`,
    histoireFin2: `Elle rentre à la maison, toute fière, avec plein de choses à raconter. Et il reste encore des pays à découvrir.`,
    histoireContinuer: 'Continuer', histoirePasser: 'Passer',
    tourDuMonde: `Tour du monde${NB}: {n}${NB}/${NB}6`, fini: 'Fini', mondeConnu: `Monde connu${NB}: {p}${NB}%`,
    tamponGagne: `{z}${NB}: tampon gagné`, tamponAGagner: `{z}${NB}: pas encore de tampon`,
    carnetTitre: 'Le carnet de voyage de Nina',
    carnetConsigne: `Pour gagner le tampon d’un continent, réussis son épreuve Facile. Elle s’ouvre quand tu connais presque tous ses pays.`,
    carnetFini: `Les six tampons sont là. Tu peux encore gagner des médailles, en Moyen et en Difficile${NB}!`,
    carnetGagne: `Tampon gagné${NB}!`, carnetManque: `Encore {n} pays à connaître`, carnetManqueUn: `Encore 1 pays à connaître`,
    carnetOuverte: `L’épreuve Facile est ouverte${NB}!`,
    // l'épreuve
    epreuve: 'Épreuve', epreuveOuverte: `L’épreuve est ouverte${NB}!`, passerEpreuve: 'Passer l’épreuve', refaireEpreuve: 'Refaire l’épreuve',
    epreuveFermee: `Pour ouvrir l’épreuve, connais encore {n} pays de ce niveau.`, epreuveFermeeUn: `Pour ouvrir l’épreuve, connais encore 1 pays de ce niveau.`,
    medaille_or: `Médaille d’or${NB}!`, medaille_argent: `Médaille d’argent${NB}!`, medaille_bronze: `Médaille de bronze${NB}!`, pasDeMedaille: 'Pas encore de médaille',
    nom_or: 'l’or', nom_argent: 'l’argent', nom_bronze: 'le bronze',
    premierCoupSur: '{n} pays sur {total} du premier coup', mieuxQueAvant: `Mieux que la dernière fois${NB}!`, meilleureMedaille: `Ta meilleure médaille reste {m}.`,
    // l'arrivée de Nina sur un continent (le tampon de l'épreuve Facile)
    etapeTitre: `Tampon${NB}: {z}${NB}!`, etape1: `Nina arrive en {z}, son sac sur le dos${NB}!`,
    etape2: `On tamponne son carnet de voyage${NB}: «${NB}Merci d’être venue${NB}! Tu connais bien nos pays.${NB}»`, etapeContinuer: 'Continuer le voyage',
    // le chemin de Nina (ADR-008)
    preteTitre: `L’épreuve est prête${NB}!`, preteL1: `{z}, niveau {niveau}${NB}: tu connais presque tous ses pays.`,
    preteL2Tampon: `«${NB}Trouve les {n} pays, chacun une fois. Sans erreur, c’est l’or. Et mon tampon sera pour Nina${NB}!${NB}»`,
    preteL2: `«${NB}Trouve les {n} pays, chacun une fois. Sans erreur, c’est la médaille d’or${NB}!${NB}»`, plusTard: 'Plus tard',
    sEntrainer: 'S’entraîner', explorerCarte: 'Explorer la carte',
    paysSur: '{n} pays sur {total}', butNiveau: `{niveau}${NB}: {n} pays sur {total}`, connusSur: '{n} pays connus sur {total}',
    epreuvePrete: `Épreuve prête${NB}!`, toutesMedailles: 'Toutes les médailles',
    ninaArrive: `Me voilà en {z}${NB}! Aide-moi à connaître ses pays${NB}: à {n}, l’épreuve s’ouvre et je peux gagner mon tampon.`,
    ninaEncore: `Encore {m} pays à connaître, et l’épreuve s’ouvre${NB}!`, ninaEncoreUn: `Encore 1 pays à connaître, et l’épreuve s’ouvre${NB}!`,
    ninaPreteTampon: `Le tampon d’{z} m’attend${NB}: on passe l’épreuve${NB}?`, ninaPrete: `L’épreuve {niveau} est prête${NB}: on y va${NB}?`,
    ninaNouveau: `Le niveau {niveau} est ouvert${NB}! À {n} pays connus, une nouvelle épreuve.`,
    ninaToutes: `Toutes les médailles d’{z}${NB}! Tu peux refaire les épreuves pour viser l’or.`,
    sceauFerme: 'encore {n}', sceauPret: `Prête${NB}!`, sceauEpreuve: 'Épreuve',
    niveauFermeApres: 'S’ouvre avec la médaille {niveau}',
    encorePourEpreuve: `Encore {m} pays, et l’épreuve s’ouvre${NB}!`, encorePourEpreuveUn: `Encore 1 pays, et l’épreuve s’ouvre${NB}!`,
    restants: '{n} pays restants sur {total}', ninaEpreuve: `Pas d’aide ici${NB}: je compte sur toi${NB}!`,
    niveauOuvre: `Le niveau {niveau} est ouvert${NB}!`,
    revoirDepart: 'Revoir le départ', revoirRetour: 'Revoir le retour',
    nouveauTampon: `Nouveau tampon${NB}: {z}${NB}!`,
  },
  en: {
    titre: 'The World in Chalk',
    jouer: 'Play', decouvrir: 'Explore', retour: 'Back',
    nbPays: '{n} countries', connus: '{p}% known',
    monde: 'The whole world', mondeFerme: 'Know half of every continent, in Easy, to open it',
    facile: 'Easy', moyen: 'Medium', difficile: 'Hard', niveau: 'Level',
    niveauPays: '{n} countries · {p}% known', niveauFerme: 'To open it, know half of this level on every continent.',
    compteur: '{n} / {total}',
    trouves: '{n} countries found', premierCoup: '{n} on the first try', temps: 'in {t}',
    record: 'New best!', meilleur: 'Best time: {t}',
    encore: 'One more round', changer: 'Change area', plusDeManche: 'Time to stop. Well done on this trip!',
    pause: 'Pause', reprendre: 'Resume', quitter: 'Quit',
    reglages: 'Settings', musique: 'Music', bruitages: 'Sound effects', voix: 'Voice', langue: 'Language', pasDeVoix: 'No voice on this device',
    lecture: 'Reading', lecture_none: 'When I tap a text', lecture_some: 'Long texts, by themselves', lecture_all: 'Everything, by itself',
    ecouter: 'Hear the name', vueEntiere: 'Whole map',
    toucheUnPays: 'Tap a country to read its name',
    ficheConsigne: 'Tap a country: its little secrets appear here.', pasDeSavoir: 'No little secrets about this one yet.',
    savaisTu: 'Did you know?', toucheContinuer: 'Tap the map to carry on', credit: 'Image: {a} · {l}', domainePublic: 'public domain', auteurInconnu: 'Unknown author', ecouterFiche: 'Listen',
    credits: 'Credits', voirImage: 'See the image', creditFichier: 'Wikimedia Commons, {f}',
    creditCarte: 'Map: {c} (public domain)', creditPolices: 'Fonts: Baloo 2 and Lexend ({l})', creditBiblio: 'Libraries: d3-geo, d3-array, topojson-client ({l})',
    creditImages: 'All {n} images come from Wikimedia Commons. They were made smaller for the game and keep their original licence.',
    creditSeul: 'Links to each image and its licence are in the game opened on its own: {u}',
    pleinEcran: 'Full screen', installer: 'Install the game',
    secondes: '{s} s', minutes: '{m} min {s}',
    histoireIntro1: 'Nina is off on a trip around the world, her bag on her back!',
    histoireIntro2: 'Help her find the countries. On each continent, she gets a stamp in her travel book.',
    histoireEnRoute: 'Let’s go!',
    histoireFinTitre: 'Around the world!',
    histoireFin1: 'Six stamps: Nina has been all around the world!',
    histoireFin2: 'She comes back home, very proud, with lots of stories to tell. And there are still more countries to discover.',
    histoireContinuer: 'Carry on', histoirePasser: 'Skip',
    tourDuMonde: 'Around the world: {n} / 6', fini: 'Finished', mondeConnu: 'World known: {p}%',
    tamponGagne: '{z}: stamp collected', tamponAGagner: '{z}: no stamp yet',
    carnetTitre: 'Nina’s travel book',
    carnetConsigne: 'To get a continent’s stamp, pass its Easy challenge. It opens when you know nearly all of its countries.',
    carnetFini: 'All six stamps are here. You can still win medals, in Medium and Hard!',
    carnetGagne: 'Stamp collected!', carnetManque: '{n} more countries to know', carnetManqueUn: '1 more country to know',
    carnetOuverte: 'The Easy challenge is open!',
    epreuve: 'Challenge', epreuveOuverte: 'The challenge is open!', passerEpreuve: 'Take the challenge', refaireEpreuve: 'Try the challenge again',
    epreuveFermee: 'To open the challenge, know {n} more countries at this level.', epreuveFermeeUn: 'To open the challenge, know 1 more country at this level.',
    medaille_or: 'Gold medal!', medaille_argent: 'Silver medal!', medaille_bronze: 'Bronze medal!', pasDeMedaille: 'No medal yet',
    nom_or: 'gold', nom_argent: 'silver', nom_bronze: 'bronze',
    premierCoupSur: '{n} of {total} countries on the first try', mieuxQueAvant: 'Better than last time!', meilleureMedaille: 'Your best medal is still {m}.',
    etapeTitre: 'Stamp: {z}!', etape1: 'Nina has reached {z}, her bag on her back!',
    etape2: 'Her travel book gets its stamp: “Thank you for coming! You know our countries well.”', etapeContinuer: 'On with the trip',
    preteTitre: 'The challenge is ready!', preteL1: '{z}, {niveau} level: you know nearly all of its countries.',
    preteL2Tampon: '“Find all {n} countries, each one once. No mistakes means gold. And my stamp goes to Nina!”',
    preteL2: '“Find all {n} countries, each one once. No mistakes means the gold medal!”', plusTard: 'Later',
    sEntrainer: 'Practise', explorerCarte: 'Explore the map',
    paysSur: '{n} of {total} countries', butNiveau: '{niveau}: {n} of {total} countries', connusSur: '{n} of {total} countries known',
    epreuvePrete: 'Challenge ready!', toutesMedailles: 'All the medals',
    ninaArrive: 'Here I am in {z}! Help me learn its countries: at {n}, the challenge opens and I can win my stamp.',
    ninaEncore: '{m} more countries to know, and the challenge opens!', ninaEncoreUn: '1 more country to know, and the challenge opens!',
    ninaPreteTampon: 'The {z} stamp is waiting for me: shall we take the challenge?', ninaPrete: 'The {niveau} challenge is ready: shall we go?',
    ninaNouveau: '{niveau} is open! At {n} countries known, a new challenge.',
    ninaToutes: 'All the medals of {z}! You can redo the challenges to aim for gold.',
    sceauFerme: '{n} to go', sceauPret: 'Ready!', sceauEpreuve: 'Challenge',
    niveauFermeApres: 'Opens with the {niveau} medal',
    encorePourEpreuve: '{m} more countries, and the challenge opens!', encorePourEpreuveUn: '1 more country, and the challenge opens!',
    restants: '{n} of {total} countries left', ninaEpreuve: 'No help here: I’m counting on you!',
    niveauOuvre: '{niveau} is now open!',
    revoirDepart: 'Watch the start again', revoirRetour: 'Watch the return again',
    nouveauTampon: 'New stamp: {z}!',
  },
};

// Celle de l'appareil, sauf si l'enfant (ou le parent) en a choisi une dans les réglages.
export let langue = (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
export function choisirLangue(l) { if (TEXTES[l]) { langue = l; document.documentElement.lang = l; } }

export function t(cle, vars = {}) {
  let s = TEXTES[langue][cle] ?? TEXTES.fr[cle] ?? cle;
  for (const [k, v] of Object.entries({ NB, ...vars })) s = s.replaceAll('{' + k + '}', v);
  return s;
}

// L'auteur et la licence d'une image, dans la langue du jeu (les données les écrivent en français).
export const auteurImage = img => img.auteur === 'Auteur inconnu' ? t('auteurInconnu') : img.auteur;
export const licenceImage = img => img.licence === 'Domaine public' ? t('domainePublic') : img.licence;

// 43,2 s ; 1 min 05
export function duree(secondes) {
  if (secondes < 60) return t('secondes', { s: (Math.round(secondes * 10) / 10).toLocaleString(langue) });
  const m = Math.floor(secondes / 60), s = String(Math.floor(secondes % 60)).padStart(2, '0');
  return t('minutes', { m, s });
}
