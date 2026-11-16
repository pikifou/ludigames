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
    encore: 'Encore une manche', changer: 'Changer de zone', plusDeManche: `C’est l’heure d’arrêter${NB}: à demain${NB}!`,
    pause: 'Pause', reprendre: 'Reprendre', quitter: 'Quitter',
    reglages: 'Réglages', son: 'Son', voix: 'Voix', langue: 'Langue', pasDeVoix: 'Pas de voix sur cet appareil',
    ecouter: 'Écouter le nom', vueEntiere: 'Toute la carte',
    toucheUnPays: 'Touche un pays pour lire son nom',
    ficheConsigne: `Touche un pays${NB}: ses petits secrets s’écrivent ici.`, pasDeSavoir: 'Pas encore de petits secrets sur celui-là.',
    savaisTu: `Le savais-tu${NB}?`, toucheContinuer: 'Touche pour continuer', credit: `Image${NB}: {a} · {l}`, domainePublic: 'domaine public', auteurInconnu: 'Auteur inconnu', ecouterFiche: 'Écouter',
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
    carnetConsigne: `Pour gagner le tampon d’un continent, connais presque tous ses pays du niveau Facile.`,
    carnetFini: `Les six tampons sont là. Tu peux continuer, avec les niveaux Moyen et Difficile${NB}!`,
    carnetGagne: `Tampon gagné${NB}!`, carnetManque: `Encore {n} pays à connaître`, carnetManqueUn: `Encore 1 pays à connaître`,
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
    encore: 'One more round', changer: 'Change area', plusDeManche: 'Time to stop: see you tomorrow!',
    pause: 'Pause', reprendre: 'Resume', quitter: 'Quit',
    reglages: 'Settings', son: 'Sound', voix: 'Voice', langue: 'Language', pasDeVoix: 'No voice on this device',
    ecouter: 'Hear the name', vueEntiere: 'Whole map',
    toucheUnPays: 'Tap a country to read its name',
    ficheConsigne: 'Tap a country: its little secrets appear here.', pasDeSavoir: 'No little secrets about this one yet.',
    savaisTu: 'Did you know?', toucheContinuer: 'Tap to carry on', credit: 'Image: {a} · {l}', domainePublic: 'public domain', auteurInconnu: 'Unknown author', ecouterFiche: 'Listen',
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
    carnetConsigne: 'To get a continent’s stamp, know nearly all of its Easy countries.',
    carnetFini: 'All six stamps are here. You can carry on with Medium and Hard!',
    carnetGagne: 'Stamp collected!', carnetManque: '{n} more countries to know', carnetManqueUn: '1 more country to know',
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
