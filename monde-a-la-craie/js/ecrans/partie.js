// Une manche : le nom s'écrit à la craie, on touche le pays. 12 pays, un chrono qui ne sert qu'à battre son temps.
// Après une erreur sur un pays dont on a des savoirs : une note « Le savais-tu ? », le chrono s'arrête, on touche pour continuer.
import { creerCarte } from '../carte.js';
import { zoneParId } from '../zones.js';
import { TAILLE_MANCHE, DUREE_ERREUR, choisirManche, Manche, pourcentage } from '../regles.js';
import { enregistrerManche } from '../progres.js';
import { t, duree } from '../textes.js';
import { son } from '../sons.js';
import { dire, voixDisponible } from '../voix.js';
import { ICONES } from '../icones.js';

export function partie(app, zoneId) {
  const { hud, etat } = app;
  const zone = zoneParId(zoneId);
  const avecVoix = etat.voix && voixDisponible(app.langue);
  hud.innerHTML = `
    <header class="haut haut-partie">
      <div id="compteur" class="compteur craie"></div>
      <div class="nom-ligne"><h2 id="nom" class="nom craie" aria-live="polite"></h2>
        ${avecVoix ? `<button class="bouton-rond petit" data-action="ecouter" aria-label="${t('ecouter')}" title="${t('ecouter')}">${ICONES.voix}</button>` : ''}</div>
      <div id="chrono" class="chrono craie"></div>
    </header>
    <div class="coin-bas droite">
      <button class="bouton-rond" data-action="vue" aria-label="${t('vueEntiere')}" title="${t('vueEntiere')}">${ICONES.vue}</button>
      <button class="bouton-rond" data-action="pause" aria-label="${t('pause')}" title="${t('pause')}">${ICONES.pause}</button>
    </div>
    <div class="coin-bas gauche zone-courante craie">${zone[app.langue]}</div>
    <button class="savoir" data-action="continuer" hidden></button>
    <div class="voile" hidden></div>`;
  const nom = hud.querySelector('#nom'), compteur = hud.querySelector('#compteur'), chrono = hud.querySelector('#chrono');
  const voile = hud.querySelector('.voile'), note = hud.querySelector('.savoir');
  const GARDE = 800;   // ms avant qu'un toucher fasse passer la note : on ne la saute pas sans l'avoir vue

  const zonePays = app.paysDeZone(zoneId);
  // La place du nom le plus long de la zone est réservée : un nom sur deux lignes ne recouvre jamais la carte.
  const plusLong = zonePays.map(p => app.nom(p.code)).sort((a, b) => b.length - a.length)[0];
  function reserverNom() {
    const texte = nom.textContent;
    nom.style.minHeight = ''; nom.textContent = plusLong;
    nom.style.minHeight = nom.offsetHeight + 'px'; nom.textContent = texte;
    return hud.querySelector('.haut').offsetHeight + 6;
  }
  const carte = creerCarte(app.nouvelleCarte(), app.monde, zone, () => ({ haut: reserverNom(), bas: 62, gauche: 8, droite: 8 }),
    { ronds: p => p.quiz && (zoneId === 'monde' || p.zone === zoneId) });
  const annonces = new Set();
  let manche, couleur = 0, ecoule = 0, depart = 0, enPause = false, attente = 0, finie = false;
  let suite = null;   // ce qui reste à faire après l'animation d'une erreur (la pause la met en attente)
  let lecture = false, garde = 0;   // la note « Le savais-tu ? » est ouverte : la manche attend un toucher
  window.jeu.carte = carte;

  // ---------- le chrono : il ne compte que pendant le jeu ----------
  const temps = () => ecoule + (depart && !enPause ? (performance.now() - depart) / 1000 : 0);
  const tic = setInterval(() => { chrono.textContent = duree(temps()); }, 100);

  function ecrireNom(texte) {
    nom.textContent = texte;
    nom.classList.remove('ecrit'); void nom.offsetWidth; nom.classList.add('ecrit');
    son('craie');
  }
  function majCompteur() { compteur.textContent = t('compteur', { n: manche.faites, total: TAILLE_MANCHE }); }

  function nouvelleManche() {
    carte.effacer(); carte.vueEntiere();
    manche = new Manche(choisirManche(zonePays, etat.connus, app.rand));
    window.jeu.manche = manche;
    clearTimeout(attente); suite = null; enPause = false; lecture = false; note.hidden = true;
    couleur = 0; ecoule = 0; annonces.clear(); depart = performance.now(); finie = false;
    voile.hidden = true;
    majCompteur();
    ecrireNom(app.nom(manche.question));
  }

  carte.surToucher(code => {
    if (enPause || finie) return;
    if (suite) { if (lecture) continuer(); return; }
    const question = manche.question;
    const r = manche.toucher(code);
    if (r.resultat === 'ignore') return;
    // Une question est réglée quand le pays est trouvé, ou montré après deux ratés : on le dit une fois.
    if (manche.resultats.has(question) && !annonces.has(question)) {
      annonces.add(question);
      app.evenement('question', { code: question, premierCoup: manche.resultats.get(question) });
    }
    if (r.resultat === 'juste') {
      carte.etat(code, 'trouve', (couleur++ % 4) + 1);
      son('juste');
      majCompteur();
      return manche.finie ? terminer() : ecrireNom(app.nom(manche.question));
    }
    // Raté : une croix et son nom sur le pays touché, le bon pays entouré, puis on continue.
    carte.etat(code, 'erreur'); carte.ecrire(code, app.nom(code));
    carte.etat(r.bon, 'montre');
    son('faux');
    majCompteur();
    const savoir = app.savoir(r.bon);
    suite = () => {
      suite = null;
      if (lecture) { lecture = false; note.hidden = true; depart = performance.now(); }
      carte.etat(code, 'vide'); carte.ecrire(code, '');
      const montreDeBon = manche.resultats.has(r.bon);   // raté deux fois : il reste montré
      if (!montreDeBon) carte.etat(r.bon, 'vide');
      manche.reprendre();
      if (manche.finie) terminer(); else ecrireNom(app.nom(manche.question));
    };
    clearTimeout(attente);
    if (savoir) montrerSavoir(r.bon, savoir); else attente = setTimeout(suite, DUREE_ERREUR);
  });

  // La note se pose du côté de l'écran où n'est pas le bon pays, pour qu'il reste visible.
  function montrerSavoir(code, savoir) {
    ecoule = temps(); depart = 0;
    lecture = true; garde = performance.now() + GARDE;
    note.innerHTML = `<span class="savoir-titre"><small>${t('savaisTu')}</small> <span class="craie">${app.nom(code)}</span></span>
      <span class="fait"><span class="emoji" aria-hidden="true">${savoir.e}</span><span>${savoir.texte}</span></span>
      <small class="astuce">${t('toucheContinuer')}</small>`;
    const [, y] = carte.ancreEcran(code), cadre = hud.getBoundingClientRect();
    const enHaut = y > cadre.top + cadre.height / 2;
    note.classList.toggle('en-haut', enHaut); note.classList.toggle('en-bas', !enHaut);
    note.style.setProperty('--haut', hud.querySelector('.haut').offsetHeight + 6 + 'px');
    note.hidden = false;
    if (avecVoix) dire(`${app.nom(code)}. ${savoir.texte}`, app.langue);
  }
  function continuer() {
    if (suite && lecture && !enPause && performance.now() >= garde) suite();
  }

  function terminer() {
    if (finie) return;
    finie = true;
    const secondes = temps();
    ecoule = secondes; depart = 0;
    const { record } = enregistrerManche(etat, zoneId, manche.resultats, secondes);
    app.sauver();
    const premiers = [...manche.resultats.values()].filter(Boolean).length;
    const pct = pourcentage(zonePays.map(p => p.code), etat.connus);
    son('fin');
    app.evenement('fin', { zone: zoneId, secondes, pourcentage: pct, record });
    const encore = app.encoreUneManche ? app.encoreUneManche() : true;
    voile.classList.add('clair');
    voile.innerHTML = `<div class="note-tableau fin">
      <p class="grand craie">${t('trouves', { n: manche.trouves })}</p>
      <p>${t('premierCoup', { n: premiers })} · ${t('temps', { t: duree(secondes) })}</p>
      <p class="record craie">${record ? t('record') : t('meilleur', { t: duree(etat.meilleurs[zoneId]) })}</p>
      <div class="boutons">
        ${encore ? `<button class="bouton-craie plein" data-action="encore">${t('encore')}</button>` : `<p>${t('plusDeManche')}</p>`}
        <button class="bouton-craie" data-action="changer">${t('changer')}</button>
      </div></div>`;
    voile.hidden = false;
    nom.textContent = '';
  }

  function pause() {
    if (finie) return;
    ecoule = temps(); enPause = true;
    clearTimeout(attente);   // une erreur en cours attend la reprise
    voile.classList.remove('clair');
    voile.innerHTML = `<div class="note-tableau"><p class="grand craie">${t('pause')}</p>
      <div class="boutons"><button class="bouton-craie plein" data-action="reprendre">${t('reprendre')}</button>
      <button class="bouton-craie" data-action="quitter">${t('quitter')}</button></div></div>`;
    voile.hidden = false;
  }
  function reprendre() {
    enPause = false; voile.hidden = true;
    if (lecture) return;   // la note est encore là : le chrono attend qu'on l'ait lue
    depart = performance.now();
    if (suite) attente = setTimeout(suite, DUREE_ERREUR / 3);
  }

  hud.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'vue') carte.vueEntiere();
    else if (a === 'pause') pause();
    else if (a === 'reprendre') reprendre();
    else if (a === 'continuer') continuer();
    else if (a === 'quitter' || a === 'changer') app.aller('accueil');
    else if (a === 'encore') { son('effacer'); nouvelleManche(); }
    else if (a === 'ecouter' && manche.question) dire(app.nom(manche.question), app.langue);
  });

  window.jeu.ecrireNom = ecrireNom;
  nouvelleManche();

  return () => { clearInterval(tic); clearTimeout(attente); carte.detruire(); window.jeu.manche = null; };
}
