// Découvrir : pas de question ni de chrono. On touche un pays, il se colorie et son nom s'écrit.
import { creerCarte } from '../carte.js';
import { zoneParId } from '../zones.js';
import { t } from '../textes.js';
import { son } from '../sons.js';
import { dire, voixDisponible } from '../voix.js';
import { ICONES } from '../icones.js';

export function decouvrir(app, zoneId) {
  const { hud, etat } = app;
  const zone = zoneParId(zoneId);
  hud.innerHTML = `
    <header class="haut haut-decouvrir"><div class="nom-ligne"><h2 id="nom" class="nom craie consigne" aria-live="polite">${t('toucheUnPays')}</h2></div></header>
    <div class="coin-bas droite"><button class="bouton-rond" data-action="vue" aria-label="${t('vueEntiere')}" title="${t('vueEntiere')}">${ICONES.vue}</button></div>
    <div class="coin-bas gauche"><button class="bouton-rond" data-action="retour" aria-label="${t('retour')}" title="${t('retour')}">${ICONES.retour}</button>
      <span class="zone-courante craie">${zone[app.langue]}</span></div>`;
  const nom = hud.querySelector('#nom');
  const carte = creerCarte(app.nouvelleCarte(), app.monde, zone,
    () => ({ haut: hud.querySelector('.haut').offsetHeight + 6, bas: 62, gauche: 8, droite: 8 }),
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
    if (etat.voix && voixDisponible(app.langue)) dire(app.nom(code), app.langue);
  });

  hud.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.action === 'vue') carte.vueEntiere();
    else if (b.dataset.action === 'retour') app.aller('accueil');
  });

  return () => carte.detruire();
}
