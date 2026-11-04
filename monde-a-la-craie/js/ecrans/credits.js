// La page des crédits, ouverte depuis les réglages : d'où viennent la carte, les polices et chaque image.
// Dans Ludiworld, aucun lien vers un autre site (spec/kit.md de Ludiworld) : tout est écrit en clair.
import { t, auteurImage, licenceImage } from '../textes.js';
import { creditsImages, lienLicence } from '../savoirs.js';

export function pageCredits(app) {
  const lien = (url, texte) => url && !app.dansLudi ? `<a href="${url}" target="_blank" rel="noopener">${texte}</a>` : texte;
  const pays = creditsImages(app.savoirs, app.nom, app.langue);
  const total = pays.reduce((n, p) => n + p.images.length, 0);
  const ligne = i => `<li class="credit-image"><span class="emoji" aria-hidden="true">${i.e}</span>
      <div><p class="quoi">${i.texte}</p>
      <p class="qui">${auteurImage(i)} · ${lien(lienLicence(i.licence), licenceImage(i))} · ${app.dansLudi ? t('creditFichier', { f: i.fichier }) : lien(i.source, t('voirImage'))}</p></div></li>`;
  return `<header class="credits-tete"><h2 class="grand craie">${t('credits')}</h2>
      <button class="bouton-craie" data-action="reglages">${t('retour')}</button></header>
    <div class="credits-corps" tabindex="0">
      <section class="credits-jeu">
        <p>${t('creditCarte', { c: lien('https://www.naturalearthdata.com', 'Natural Earth') })}</p>
        <p>${t('creditPolices', { l: lien('fonts/LICENSE-OFL.txt', 'SIL Open Font License') })}</p>
        <p>${t('creditBiblio', { l: lien('lib/LICENSE', 'ISC') })}</p>
      </section>
      <p class="credits-images">${t('creditImages', { n: total })}</p>
      ${app.dansLudi ? `<p class="credits-seul">${t('creditSeul', { u: location.origin + location.pathname })}</p>` : ''}
      ${pays.map(p => `<h3 class="craie">${p.nom}</h3><ul>${p.images.map(ligne).join('')}</ul>`).join('')}
    </div>`;
}
