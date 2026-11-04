// L'accueil : la carte du monde, chaque continent écrit et entouré à la craie, avec ce qu'on en connaît.
import { creerCarte } from '../carte.js';
import { MONDE, ZONES } from '../zones.js';
import { pourcentage, mondeDebloque } from '../regles.js';
import { NIVEAUX } from '../niveaux.js';
import { t, choisirLangue } from '../textes.js';
import { ICONES } from '../icones.js';
import { sonActif } from '../sons.js';
import { voixDisponible } from '../voix.js';
import { pageCredits } from './credits.js';

// Où écrire le nom de chaque continent sur la carte du monde [longitude, latitude], et sa craie.
const ETIQUETTES = {
  europe: { pos: [22, 54], craie: 1, r: -3 }, afrique: { pos: [18, 2], craie: 4, r: 3 },
  asie: { pos: [92, 44], craie: 3, r: -2 }, 'amerique-nord': { pos: [-102, 46], craie: 2, r: 2 },
  'amerique-sud': { pos: [-61, -14], craie: 2, r: -4 }, oceanie: { pos: [136, -25], craie: 1, r: 3 },
};

export function accueil(app) {
  const { hud, etat } = app;
  const connu = (id, niveau) => pourcentage(app.paysDeZone(id, niveau).map(p => p.code), etat.connus);
  const pct = Object.fromEntries(ZONES.map(z => [z.id, connu(z.id)]));
  // Chaque niveau du monde entier s'ouvre quand ce niveau est connu à moitié sur chaque continent.
  const mondeNiveaux = Object.fromEntries(NIVEAUX.map(n => [n, mondeDebloque(Object.fromEntries(ZONES.map(z => [z.id, connu(z.id, n)])))]));
  const mondeOuvert = mondeNiveaux.facile;
  const niveauOuvert = (id, n) => id !== 'monde' || mondeNiveaux[n];
  hud.innerHTML = `
    <header class="haut haut-accueil"><h1 class="titre craie">${t('titre')}</h1></header>
    <div class="etiquettes"></div>
    <button class="bouton-craie monde-entier${mondeOuvert ? '' : ' ferme'}" data-zone="monde">
      ${mondeOuvert ? '' : ICONES.cadenas}<span>${t('monde')}</span></button>
    <div class="coin-bas droite"><button class="bouton-rond" data-action="reglages" aria-label="${t('reglages')}" title="${t('reglages')}">${ICONES.reglages}</button></div>
    <div class="voile" hidden></div>`;
  const etiquettes = hud.querySelector('.etiquettes'), voile = hud.querySelector('.voile');

  // Écran en hauteur (téléphone) : la carte en haut, les continents en liste dessous.
  const enListe = () => app.ecran.clientHeight > app.ecran.clientWidth * 1.15;
  function ecrireEtiquettes() {
    etiquettes.innerHTML = '';
    etiquettes.classList.toggle('liste', enListe());
    for (const z of ZONES) {
      const e = ETIQUETTES[z.id], b = document.createElement('button');
      b.className = 'zone-nom craie c' + e.craie;
      b.dataset.zone = z.id;
      b.style.setProperty('--r', e.r + 'deg');
      b.innerHTML = `${z[app.langue]}<small>${t('connus', { p: Math.round(pct[z.id] * 100) })}</small>`;
      etiquettes.appendChild(b);
    }
  }
  ecrireEtiquettes();
  const carte = creerCarte(app.nouvelleCarte(), app.monde, MONDE,
    () => ({ haut: hud.querySelector('.haut').offsetHeight + 4, bas: enListe() ? etiquettes.offsetHeight + 84 : 64, gauche: 8, droite: 8 }),
    { ronds: () => false, zoom: false });
  window.jeu.carte = carte;
  // Les pays connus sont coloriés : on voit sa progression d'un coup d'œil.
  for (const code of etat.connus) {
    const z = app.zoneDe(code);
    if (z) carte.etat(code, 'trouve', ETIQUETTES[z].craie);
  }

  // Écran en largeur : chaque continent écrit sur la carte, à sa place.
  function placer() {
    if (enListe()) return;
    const r = app.ecran.getBoundingClientRect();
    for (const b of etiquettes.children) {
      const [x, y] = carte.ecranDe(ETIQUETTES[b.dataset.zone].pos);
      b.style.left = (x - r.left) + 'px'; b.style.top = (y - r.top) + 'px';
    }
  }
  placer();
  const surRedim = () => requestAnimationFrame(() => { ecrireEtiquettes(); carte.recadrer(); placer(); });
  window.addEventListener('resize', surRedim);

  function choisir(id) {
    if (id === 'monde' && !mondeOuvert) {
      ouvrir(`<p class="grand craie">${t('monde')}</p><p>${t('mondeFerme')}</p>
        <div class="boutons"><button class="bouton-craie" data-action="fermer">${t('retour')}</button></div>`);
      return;
    }
    const nom = id === 'monde' ? t('monde') : ZONES.find(z => z.id === id)[app.langue];
    let choisi = app.niveau(id);
    if (!niveauOuvert(id, choisi)) choisi = 'facile';
    // Un, deux ou trois traits de craie : le niveau se lit aussi sans les couleurs.
    const niveaux = NIVEAUX.map((n, i) => {
      const ouvert = niveauOuvert(id, n);
      return `<button class="niveau${ouvert ? '' : ' ferme'}" data-niveau="${n}" aria-pressed="${n === choisi}"${ouvert ? '' : ' aria-disabled="true"'}>
        <span class="traits" aria-hidden="true">${ouvert ? '|'.repeat(i + 1) : ICONES.cadenas}</span><span class="craie">${t(n)}</span>
        <small>${t('niveauPays', { n: app.paysDeZone(id, n).length, p: Math.round(connu(id, n) * 100) })}</small></button>`;
    }).join('');
    ouvrir(`<p class="grand craie">${nom}</p>
      <div class="niveaux" role="group" aria-label="${t('niveau')}">${niveaux}</div>
      <p class="niveau-ferme" hidden>${t('niveauFerme')}</p>
      <div class="boutons">
        <button class="bouton-craie plein" data-action="jouer" data-cible="${id}">${t('jouer')}</button>
        <button class="bouton-craie" data-action="decouvrir" data-cible="${id}">${t('decouvrir')}</button>
      </div>
      <button class="lien-craie" data-action="fermer">${t('retour')}</button>`);
  }

  function reglages() {
    const voixOk = voixDisponible(app.langue);
    ouvrir(`<p class="grand craie">${t('reglages')}</p>
      <label class="interrupteur"><input type="checkbox" data-reglage="son" ${etat.son ? 'checked' : ''}><span>${t('son')}</span></label>
      <label class="interrupteur${voixOk ? '' : ' grise'}"><input type="checkbox" data-reglage="voix" ${etat.voix && voixOk ? 'checked' : ''} ${voixOk ? '' : 'disabled'}>
        <span>${t('voix')}${voixOk ? '' : `<small>${t('pasDeVoix')}</small>`}</span></label>
      <label class="interrupteur"><span>${t('langue')}</span>
        <select data-reglage="langue"><option value="fr" ${app.langue === 'fr' ? 'selected' : ''}>Français</option><option value="en" ${app.langue === 'en' ? 'selected' : ''}>English</option></select></label>
      <div class="reglages-appli"></div>
      <div class="boutons"><button class="bouton-craie" data-action="fermer">${t('retour')}</button></div>
      <button class="lien-craie" data-action="credits">${t('credits')}</button>`);
    app.evenement('reglages', voile.querySelector('.reglages-appli'));
  }

  function choisirNiveau(b) {
    const ferme = b.getAttribute('aria-disabled') === 'true';
    voile.querySelector('.niveau-ferme').hidden = !ferme;
    if (ferme) return;
    for (const x of voile.querySelectorAll('.niveau')) x.setAttribute('aria-pressed', x === b);
    const id = voile.querySelector('[data-action="jouer"]').dataset.cible;
    etat.niveaux[id] = b.dataset.niveau; app.sauver();
  }

  function ouvrir(html, classe = '') { voile.innerHTML = `<div class="note-tableau ${classe}">${html}</div>`; voile.hidden = false; }

  carte.surToucher(code => { const z = code && app.zoneDe(code); if (z && app.paysDeZone(z).some(p => p.code === code)) choisir(z); });

  hud.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.zone) choisir(b.dataset.zone);
    else if (b.dataset.niveau) choisirNiveau(b);
    else if (b.dataset.action === 'jouer') {
      const n = voile.querySelector('.niveau[aria-pressed="true"]');
      if (n) { etat.niveaux[b.dataset.cible] = n.dataset.niveau; app.sauver(); }
      app.aller('partie', b.dataset.cible);
    }
    else if (b.dataset.action === 'decouvrir') app.aller('decouvrir', b.dataset.cible);
    else if (b.dataset.action === 'reglages') reglages();
    else if (b.dataset.action === 'credits') ouvrir(pageCredits(app), 'page-credits');
    else if (b.dataset.action === 'fermer') voile.hidden = true;
  });
  hud.addEventListener('change', e => {
    const r = e.target.dataset.reglage;
    if (!r) return;
    if (r === 'langue') { etat.langue = e.target.value; choisirLangue(etat.langue); app.sauver(); app.aller('accueil'); return; }
    etat[r] = e.target.checked;
    if (r === 'son') sonActif(etat.son);
    app.sauver();
  });

  return () => { window.removeEventListener('resize', surRedim); carte.detruire(); };
}
