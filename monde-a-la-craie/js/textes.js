// Tous les textes du jeu, en français et en anglais (selon la langue de l'appareil).
const NB = ' ';

const TEXTES = {
  fr: {
    titre: 'Le Monde à la craie',
    jouer: 'Jouer', decouvrir: 'Découvrir', retour: 'Retour',
    nbPays: '{n} pays', connus: `{p}${NB}% connus`,
    monde: 'Le monde entier', mondeFerme: `Connais chaque continent à moitié pour l’ouvrir`,
    compteur: '{n} / {total}',
    trouves: '{n} pays trouvés', premierCoup: 'dont {n} du premier coup', temps: 'en {t}',
    record: `Nouveau record${NB}!`, meilleur: `Meilleur temps${NB}: {t}`,
    encore: 'Encore une manche', changer: 'Changer de zone', plusDeManche: `C’est l’heure d’arrêter${NB}: à demain${NB}!`,
    pause: 'Pause', reprendre: 'Reprendre', quitter: 'Quitter',
    reglages: 'Réglages', son: 'Son', voix: 'Voix', pasDeVoix: 'Pas de voix sur cet appareil',
    ecouter: 'Écouter le nom', vueEntiere: 'Toute la carte',
    toucheUnPays: 'Touche un pays pour lire son nom',
    pleinEcran: 'Plein écran', installer: 'Installer le jeu',
    secondes: '{s}{NB}s', minutes: '{m}{NB}min{NB}{s}',
  },
  en: {
    titre: 'The World in Chalk',
    jouer: 'Play', decouvrir: 'Explore', retour: 'Back',
    nbPays: '{n} countries', connus: '{p}% known',
    monde: 'The whole world', mondeFerme: 'Know half of every continent to open it',
    compteur: '{n} / {total}',
    trouves: '{n} countries found', premierCoup: '{n} on the first try', temps: 'in {t}',
    record: 'New best!', meilleur: 'Best time: {t}',
    encore: 'One more round', changer: 'Change area', plusDeManche: 'Time to stop: see you tomorrow!',
    pause: 'Pause', reprendre: 'Resume', quitter: 'Quit',
    reglages: 'Settings', son: 'Sound', voix: 'Voice', pasDeVoix: 'No voice on this device',
    ecouter: 'Hear the name', vueEntiere: 'Whole map',
    toucheUnPays: 'Tap a country to read its name',
    pleinEcran: 'Full screen', installer: 'Install the game',
    secondes: '{s} s', minutes: '{m} min {s}',
  },
};

export const langue = (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';

export function t(cle, vars = {}) {
  let s = TEXTES[langue][cle] ?? TEXTES.fr[cle] ?? cle;
  for (const [k, v] of Object.entries({ NB, ...vars })) s = s.replaceAll('{' + k + '}', v);
  return s;
}

// 43,2 s ; 1 min 05
export function duree(secondes) {
  if (secondes < 60) return t('secondes', { s: (Math.round(secondes * 10) / 10).toLocaleString(langue) });
  const m = Math.floor(secondes / 60), s = String(Math.floor(secondes % 60)).padStart(2, '0');
  return t('minutes', { m, s });
}
