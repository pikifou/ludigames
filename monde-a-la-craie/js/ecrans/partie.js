// Une manche : le nom s'écrit à la craie, on touche le pays. 12 pays (moins en Facile sur un petit continent), un chrono qui ne sert qu'à battre son temps.
// Après chaque réponse, juste ou fausse, sur un pays dont on a des savoirs : une note « Le savais-tu ? », le chrono s'arrête, on touche pour continuer.
import { creerCarte } from '../carte.js';
import { zoneParId } from '../zones.js';
import { DUREE_ERREUR, choisirManche, Manche, pourcentage } from '../regles.js';
import { enregistrerManche, cleRecord } from '../progres.js';
import { dansNiveau } from '../niveaux.js';
import { t, duree, auteurImage, licenceImage } from '../textes.js';
import { son } from '../sons.js';
import { dire, voixDisponible } from '../voix.js';
import { ICONES } from '../icones.js';

export function partie(app, zoneId) {
  const { hud, etat } = app;
  const zone = zoneParId(zoneId), niveau = app.niveau(zoneId);
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
    <div class="coin-bas gauche zone-courante craie">${zone[app.langue]} · ${t(niveau)}</div>
    <button class="savoir" data-action="continuer" hidden></button>
    <div class="voile" hidden></div>`;
  // Les pays qu'on peut demander : de la zone et du niveau. En Facile et Moyen, les autres sont estompés.
  function enJeu(p) { return p.quiz && (zoneId === 'monde' || p.zone === zoneId) && dansNiveau(p.code, niveau); }
  const nom = hud.querySelector('#nom'), compteur = hud.querySelector('#compteur'), chrono = hud.querySelector('#chrono');
  const voile = hud.querySelector('.voile'), note = hud.querySelector('.savoir');
  const GARDE = 800;   // ms avant qu'un toucher fasse passer la note : on ne la saute pas sans l'avoir vue
  const GARDE_FIN = 1000;   // ms avant que les boutons de fin répondent : l'enfant qui touche encore la carte ne relance pas la manche

  const zonePays = app.paysDeZone(zoneId, niveau);
  // La place du nom le plus long de la zone est réservée : un nom sur deux lignes ne recouvre jamais la carte.
  const plusLong = zonePays.map(p => app.nom(p.code)).sort((a, b) => b.length - a.length)[0];
  function reserverNom() {
    const texte = nom.textContent;
    nom.style.minHeight = ''; nom.textContent = plusLong;
    nom.style.minHeight = nom.offsetHeight + 'px'; nom.textContent = texte;
    return hud.querySelector('.haut').offsetHeight + 6;
  }
  const carte = creerCarte(app.nouvelleCarte(), app.monde, zone, () => ({ haut: reserverNom(), bas: 62, gauche: 8, droite: 8 }),
    { ronds: enJeu, estompe: p => niveau !== 'difficile' && !enJeu(p) });
  const annonces = new Set();
  let manche, couleur = 0, ecoule = 0, depart = 0, enPause = false, attente = 0, finie = false, finVue = 0;
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
  function majCompteur() { compteur.textContent = t('compteur', { n: manche.faites, total: manche.total }); }

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
      const savoirJuste = app.savoir(code);
      if (!savoirJuste) return manche.finie ? terminer() : ecrireNom(app.nom(manche.question));
      // La note se lit, puis on passe au pays suivant (ou à la fin).
      suite = () => {
        suite = null;
        lecture = false; note.hidden = true; depart = performance.now();
        if (manche.finie) terminer(); else ecrireNom(app.nom(manche.question));
      };
      return montrerSavoir(code, savoirJuste);   // la bande parle du pays trouvé
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
      carte.etat(r.bon, 'vide');   // même raté deux fois : on ne le laisse pas entouré, on croirait qu'il faut encore le chercher
      manche.reprendre();
      if (manche.finie) terminer(); else ecrireNom(app.nom(manche.question));
    };
    clearTimeout(attente);
    if (savoir) montrerSavoir(r.bon, savoir, code); else attente = setTimeout(suite, DUREE_ERREUR);
  });

  // La bande « Le savais-tu ? » : le drapeau et ses couleurs, une image quand on en a une (quelques pays pour l'instant).
  // Elle vient du côté (écran en largeur) ou du bas (en hauteur), là où elle ne cache ni le pays montré ni celui touché.
  function montrerSavoir(code, savoir, touche) {
    ecoule = temps(); depart = 0;
    lecture = true; garde = performance.now() + GARDE;
    const drapeau = `img/drapeaux/${code.toLowerCase()}.svg`, img = savoir.img;
    note.innerHTML = `<span class="savoir-tete"><img class="drapeau" src="${drapeau}" alt="">
        <span class="savoir-titre"><small>${t('savaisTu')}</small><span class="craie">${app.nom(code)}</span></span></span>
      ${img ? `<span class="photo"><img src="${img.src}" alt=""><span class="credit">${t('credit', { a: auteurImage(img), l: licenceImage(img) })}</span></span>` : ''}
      <span class="fait"><span class="emoji" aria-hidden="true">${savoir.e}</span><span>${savoir.texte}</span></span>
      <small class="astuce">${t('toucheContinuer')}</small>`;
    note.style.setProperty('--drapeau', `url("${drapeau}")`);
    if (img) {
      note.style.setProperty('--ratio', img.l / img.h);
      const photo = note.querySelector('.photo');
      photo.firstElementChild.onerror = () => { photo.hidden = true; };   // hors ligne, une image jamais vue n'arrive pas
    }
    note.style.setProperty('--haut', hud.querySelector('.haut').offsetHeight + 6 + 'px');
    note.hidden = false;
    placerBande(img, [code, touche]);
    if (avecVoix) dire(`${app.nom(code)}. ${savoir.texte}`, app.langue);
  }
  // On essaie chaque côté et on garde celui qui ne cache rien (sinon, celui qui laisse voir le bon pays).
  // Mesures sans transformation (offset*) : la bande est encore en train d'entrer.
  function placerBande(avecImage, codes) {
    const cadre = hud.getBoundingClientRect(), large = cadre.width > cadre.height * 1.1;
    const points = codes.filter(Boolean).map(c => carte.ancreEcran(c)).map(([x, y]) => [x - cadre.left, y - cadre.top]);
    const cache = ([x, y]) => x >= note.offsetLeft && x <= note.offsetLeft + note.offsetWidth && y >= note.offsetTop && y <= note.offsetTop + note.offsetHeight;
    let meilleur = null;
    for (const cote of large ? ['gauche', 'droite'] : ['bas', 'haut']) {
      note.className = `savoir ${cote}${avecImage ? ' avec-photo' : ''}`;
      const score = points.reduce((s, p, i) => s + (cache(p) ? (i === 0 ? 2 : 1) : 0), 0);
      if (!meilleur || score < meilleur.score) meilleur = { cote, score };
      if (score === 0) break;
    }
    note.className = `savoir ${meilleur.cote}${avecImage ? ' avec-photo' : ''}`;
  }
  function continuer() {
    if (suite && lecture && !enPause && performance.now() >= garde) suite();
  }

  function terminer() {
    if (finie) return;
    finie = true;
    const secondes = temps();
    ecoule = secondes; depart = 0;
    const { record } = enregistrerManche(etat, zoneId, manche.resultats, secondes, niveau);
    app.sauver();
    const premiers = [...manche.resultats.values()].filter(Boolean).length;
    const pct = pourcentage(app.paysDeZone(zoneId).map(p => p.code), etat.connus);   // toute la zone, pour Ludiworld
    son('fin');
    app.evenement('fin', { zone: zoneId, niveau, secondes, pourcentage: pct, record });
    const encore = app.encoreUneManche ? app.encoreUneManche() : true;
    voile.classList.add('clair');
    voile.innerHTML = `<div class="note-tableau fin">
      <p class="grand craie">${t('trouves', { n: manche.trouves })}</p>
      <p>${t('premierCoup', { n: premiers })} · ${t('temps', { t: duree(secondes) })}</p>
      <p class="record craie">${record ? t('record') : t('meilleur', { t: duree(etat.meilleurs[cleRecord(zoneId, niveau)]) })}</p>
      <div class="boutons">
        ${encore ? `<button class="bouton-craie plein" data-action="encore">${t('encore')}</button>` : `<p>${t('plusDeManche')}</p>`}
        <button class="bouton-craie" data-action="changer">${t('changer')}</button>
      </div></div>`;
    voile.hidden = false;
    finVue = performance.now();
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
    if ((a === 'encore' || a === 'changer') && performance.now() - finVue < GARDE_FIN) return;
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
