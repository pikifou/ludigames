// Découvrir : pas de question ni de chrono. On touche un pays, il se colorie et son nom s'écrit.
// Là où on a des savoirs (tous les continents), une fiche à côté de la carte : la capitale et trois petits secrets.
import { creerCarte } from '../carte.js';
import { zoneParId } from '../zones.js';
import { t } from '../textes.js';
import { son } from '../sons.js';
import { dire, voixDisponible } from '../voix.js';
import { ICONES } from '../icones.js';
import { CAPITALE } from '../savoirs.js';

export function decouvrir(app, zoneId) {
  const { hud, etat } = app;
  const zone = zoneParId(zoneId);
  const dansLaZone = f => zoneId === 'monde' || f.properties.zone === zoneId;
  const avecFiche = app.monde.some(f => dansLaZone(f) && app.fiche(f.properties.code));
  const avecVoix = etat.voix && voixDisponible(app.langue);
  hud.innerHTML = `
    <header class="haut haut-decouvrir"><div class="nom-ligne"><h2 id="nom" class="nom craie consigne" aria-live="polite">${t('toucheUnPays')}</h2></div></header>
    <div class="coin-bas droite"><button class="bouton-rond" data-action="vue" aria-label="${t('vueEntiere')}" title="${t('vueEntiere')}">${ICONES.vue}</button></div>
    <div class="coin-bas gauche"><button class="bouton-rond" data-action="retour" aria-label="${t('retour')}" title="${t('retour')}">${ICONES.retour}</button>
      <span class="zone-courante craie">${zone[app.langue]}</span></div>
    ${avecFiche ? `<aside class="fiche-pays" aria-live="polite"><p class="fiche-vide">${t('ficheConsigne')}</p></aside>` : ''}`;
  const panneau = hud.querySelector('.fiche-pays');
  const nom = hud.querySelector('#nom');
  // La place du nom le plus long (avec son rattachement) est réservée : il ne recouvre jamais la carte.
  const plusLong = app.monde.filter(dansLaZone)
    .map(f => app.nomComplet(f.properties.code)).sort((a, b) => b.length - a.length)[0];
  function reserverNom() {
    const texte = nom.textContent, consigne = nom.classList.contains('consigne');
    nom.style.minHeight = ''; nom.classList.remove('consigne'); nom.textContent = plusLong;
    nom.style.minHeight = nom.offsetHeight + 'px'; nom.textContent = texte; nom.classList.toggle('consigne', consigne);
    return hud.querySelector('.haut').offsetHeight + 6;
  }
  // La fiche a sa place à elle (à droite en paysage, en bas en portrait) : elle ne cache jamais la carte.
  function marges() {
    const m = { haut: reserverNom(), bas: 62, gauche: 8, droite: 8 };
    if (!panneau) return m;
    panneau.style.setProperty('--haut', m.haut + 'px');
    const cadre = hud.getBoundingClientRect(), r = panneau.getBoundingClientRect();
    if (matchMedia('(orientation: portrait)').matches) m.bas = cadre.bottom - r.top + 8;
    else m.droite = cadre.right - r.left + 8;
    return m;
  }
  const carte = creerCarte(app.nouvelleCarte(), app.monde, zone, marges,
    { ronds: p => zoneId === 'monde' || p.zone === zoneId });
  window.jeu.carte = carte;
  const couleurs = new Map();
  let dernier = null;

  carte.surToucher(code => {
    if (!code) return;
    if (!couleurs.has(code)) couleurs.set(code, (couleurs.size % 4) + 1);
    if (dernier) carte.ecrire(dernier, '');
    carte.etat(code, 'trouve', couleurs.get(code));
    carte.ecrire(code, app.nom(code));
    dernier = code;
    nom.classList.remove('consigne');
    nom.textContent = app.nomComplet(code);
    nom.classList.remove('ecrit'); void nom.offsetWidth; nom.classList.add('ecrit');
    son('craie');
    if (avecVoix) dire(app.nom(code), app.langue);
    if (panneau) remplirFiche(code);
  });

  function remplirFiche(code) {
    const f = app.fiche(code);
    if (!f) { panneau.innerHTML = `<p class="fiche-vide">${t('pasDeSavoir')}</p>`; return; }
    panneau.innerHTML = `<div class="fiche-tete"><p class="capitale craie">${f.capitale ? `<span aria-hidden="true">⭐</span> ${CAPITALE[app.langue]}${f.capitale}` : ''}</p>
        ${avecVoix ? `<button class="bouton-rond petit" data-action="ecouter-fiche" aria-label="${t('ecouterFiche')}" title="${t('ecouterFiche')}">${ICONES.voix}</button>` : ''}</div>
      <ul>${f.faits.map(x => `<li class="fait"><span class="emoji" aria-hidden="true">${x.e}</span><span>${x.texte}</span></li>`).join('')}</ul>`;
    panneau.classList.remove('pose'); void panneau.offsetWidth; panneau.classList.add('pose');
    panneau.dataset.code = code;
  }

  hud.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.action === 'vue') carte.vueEntiere();
    else if (b.dataset.action === 'retour') app.aller('accueil');
    else if (b.dataset.action === 'ecouter-fiche') {
      const code = panneau.dataset.code, f = app.fiche(code);
      if (f) dire([app.nom(code), ...(f.capitale ? [CAPITALE[app.langue] + f.capitale] : []), ...f.faits.map(x => x.texte)].join('. '), app.langue);
    }
  });

  return () => carte.detruire();
}
