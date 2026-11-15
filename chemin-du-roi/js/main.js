// Le Chemin du Roi : l'écran titre, l'histoire de Léo, le chemin, les leçons, les parties avec les amis.
import { CHAPITRES, LECONS, PERSONNAGES, AMIS, DEPART, MEDAILLE_FINALE } from './lecons.js';
import { Exercice, SEUL, finDePartie } from './exercice.js';
import { depuisFen, jouer, coupsLegaux, choisirCoup, enEchec, couleur, type, caseDe, roiDe } from './echecs.js';
import { Plateau } from './plateau.js';
import { son, sonActif } from './sons.js';
import { dire, voixDisponible } from './voix.js';

const Ludi = globalThis.Ludi;
try { Ludi?.init({ game: 'chemin-du-roi' }); } catch { /* le jeu marche sans le kit */ }
const dansLudiworld = (() => { try { return !!Ludi?.inLauncher(); } catch { return false; } })();
document.body.classList.toggle('ludiworld', dansLudiworld);
const kit = f => { try { f(Ludi); } catch { /* sans kit */ } };
// Fin douce : quand le temps de jeu est fini, on termine ce qu'on fait sans proposer la suite.
let tempsFini = false;
kit(L => L.onWrapUp(minutes => { if (minutes <= 0) tempsFini = true; }));
// Pause demandée par Ludiworld : un voile qui bloque tout jusqu'à ce que le launcher reprenne la main.
kit(L => L.onPause(() => {
  if (document.querySelector('.voile-pause')) return;
  globalThis.speechSynthesis?.cancel();
  document.body.insertAdjacentHTML('beforeend', '<div class="voile-pause" role="dialog" aria-label="Pause"><div><img src="img/sage.webp" alt=""><p>Pause !</p><small>On reprendra plus tard.</small></div></div>');
}));

// ---------- La sauvegarde ----------
const CLE = 'chemin-du-roi.v1';
const q = new URLSearchParams(location.search);
const toutOuvert = q.has('tout');
// Le jeu démarre muet : la voix et les sons s'allument avec le haut-parleur.
let etat = { notes: {}, lecons: {}, amis: {}, medailles: {}, voix: false, son: false, histoire: false, place: 0, fin: false };
try { Object.assign(etat, JSON.parse(localStorage.getItem(CLE)) || {}); } catch { /* première fois */ }
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* navigation privée */ } };
sonActif(etat.son);

const exercicesDe = l => l.etapes.filter(e => e.ex).map(e => e.ex);
const etoilesDe = l => exercicesDe(l).reduce((s, e) => s + (etat.notes[e.id] || 0), 0);
const etoilesMax = l => exercicesDe(l).length * 3;
const indexLecon = id => LECONS.findIndex(l => l.id === id);
const ouverte = l => toutOuvert || indexLecon(l.id) === 0 || !!etat.lecons[LECONS[indexLecon(l.id) - 1].id];
const chapitreOuvert = c => ouverte(c.lecons[0]);
const chapitreFini = c => c.lecons.every(l => etat.lecons[l.id]);
const chapitreDe = l => CHAPITRES.find(c => c.id === l.chapitre);
const indexActuel = () => { const i = CHAPITRES.findIndex(c => chapitreOuvert(c) && !chapitreFini(c)); return i < 0 ? CHAPITRES.length - 1 : i; };

const MEDAILLES = [
  'Les pièces', 'La course des pions', 'Le croque-pièces', 'La loupe', 'Échec au roi', 'Échec et mat', 'Le roque', 'Grand champion',
];

// ---------- Outils d'affichage ----------
const app = document.getElementById('app');
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const ETOILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z"/></svg>';
const CADENAS = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const visage = qui => `<span class="visage" style="background-image:url(${PERSONNAGES[qui].image})"></span>`;
const etoiles = (n, max = 3) => `<span class="etoiles" aria-label="${n} étoiles sur ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'pleine' : ''}">${ETOILE}</i>`).join('')}</span>`;
const imageJoie = qui => `img/${qui}-joie.webp`;
const voixOk = () => etat.voix && voixDisponible('fr');
const parler = texte => { if (voixOk()) dire(texte, 'fr'); };
const attendre = ms => new Promise(r => setTimeout(r, ms));
const auHasard = l => l[Math.floor(Math.random() * l.length)];
const NOM_PIECE = { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' };
const sa = p => (['r', 'q'].includes(type(p)) ? 'ta ' : 'ton ') + NOM_PIECE[type(p)];
const ma = p => (['r', 'q'].includes(type(p)) ? 'ma ' : 'mon ') + NOM_PIECE[type(p)];

function ecran(classe, html) {
  globalThis.speechSynthesis?.cancel();
  app.innerHTML = '';
  const e = h(`<section class="ecran ${classe}">${html}</section>`);
  app.appendChild(e);
  e.addEventListener('click', ev => { if (ev.target.closest('button')) son('clic'); });
  return e;
}

function boutonsHaut(retour, titre, extra = '') {
  return `<header class="haut">
    <button class="rond retour" data-act="${retour}" aria-label="Retour"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <h2>${titre}</h2>
    ${extra}
    <button class="rond son ${etat.voix ? '' : 'coupe'}" data-act="voix" aria-label="Voix et sons"><svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ondes" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg></button>
  </header>`;
}

function basculerVoix(bouton) {
  etat.voix = !etat.voix; etat.son = etat.voix; sonActif(etat.son); sauver();
  bouton.classList.toggle('coupe', !etat.voix);
  if (!etat.voix) globalThis.speechSynthesis?.cancel();
  else son('juste');
}

// Des confettis de papier qui tombent (des éléments animés en CSS).
function confettis(dans, n = 46) {
  const z = h('<div class="confettis" aria-hidden="true"></div>');
  const couleurs = ['#c8643b', '#d9a441', '#2f7f7a', '#2e3a6e', '#f2b928', '#e58aa4'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = couleurs[i % couleurs.length];
    c.style.setProperty('--d', `${1.4 + Math.random() * 1.3}s`);
    c.style.setProperty('--x', `${(Math.random() - .5) * 160}px`);
    c.style.setProperty('--r', `${(Math.random() - .5) * 1440}deg`);
    c.style.animationDelay = `${Math.random() * .35}s`;
    if (i % 3 === 0) c.classList.add('long');
    z.appendChild(c);
  }
  dans.appendChild(z);
  setTimeout(() => z.remove(), 3200);
}

// Fait voler une petite étoile d'un rectangle de l'écran à un autre.
function envolerEtoile(de, vers, fini) {
  const s = h(`<span class="etoile-vol">${ETOILE}</span>`);
  document.body.appendChild(s);
  const x0 = de.left + de.width / 2, y0 = de.top + de.height / 2, x1 = vers.left + vers.width / 2, y1 = vers.top + vers.height / 2;
  if (!s.animate) { s.remove(); fini?.(); return; }
  const a = s.animate([
    { transform: `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(1)` },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 60}px) translate(-50%, -50%) scale(1.6) rotate(140deg)`, offset: .45 },
    { transform: `translate(${x1}px, ${y1}px) translate(-50%, -50%) scale(.9) rotate(300deg)` },
  ], { duration: 650, easing: 'cubic-bezier(.4, 0, .3, 1)' });
  a.onfinish = () => { s.remove(); fini?.(); };
}

// ---------- L'écran titre ----------
function ecranTitre() {
  const commence = etat.histoire;
  const e = ecran('titre', `
    <div class="titre-image"></div>
    <div class="feuilles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="titre-bloc">
      <div class="titre-texte">
        <h1>Le Chemin<br>du Roi</h1>
        <p>Léo a trouvé un vieux jeu d'échecs.<br>Aide-le à devenir un champion !</p>
      </div>
      <button class="gros" data-act="jouer">${commence ? 'Continuer' : 'Jouer'}</button>
    </div>`);
  e.querySelector('[data-act=jouer]').onclick = () => {
    son('pose');
    if (!etat.histoire) ecranHistoire(INTRO, () => { etat.histoire = true; sauver(); ecranCarte(); });
    else ecranCarte();
  };
}

// ---------- L'histoire en images ----------
const INTRO = [
  { image: 'img/histoire-1.webp', texte: "Voici Léo. Un jour de pluie, dans le grenier, il trouve une vieille boîte en bois." },
  { image: 'img/histoire-1.webp', qui: 'enfant', texte: "Des petits rois, des chevaux, des tours… C'est un jeu d'échecs ! Mais je ne sais pas y jouer." },
  { image: 'img/histoire-2.webp', texte: "Léo court chez Barnabé, le vieux voisin. On dit qu'il connaît tous les secrets des échecs." },
  { image: 'img/histoire-2.webp', qui: 'sage', texte: "Entre, Léo ! Je vais t'apprendre. Ensuite, mes amis t'attendront sur le chemin, jusqu'à la tour du château." },
];
const FIN = [
  { image: 'img/histoire-fin.webp', texte: "Léo a battu Barnabé ! Tous ses amis sont montés jusqu'à la tour pour le féliciter." },
  { image: 'img/histoire-fin.webp', qui: 'sage', texte: "Tu es devenu un vrai joueur d'échecs, Léo. Maintenant, c'est toi qui vas apprendre à tes amis !" },
];

function ecranHistoire(pages, fini) {
  let i = 0;
  const e = ecran('histoire', `
    <button class="passer" data-act="passer">Passer</button>
    <div class="planche"><div class="planche-image"></div></div>
    <div class="legende"><div class="qui"></div><p></p><button class="suivant" data-act="suite" aria-label="Suite">▶</button></div>`);
  const montrer = () => {
    const p = pages[i];
    const img = e.querySelector('.planche-image');
    if (img.dataset.src !== p.image) {
      img.dataset.src = p.image;
      img.style.backgroundImage = `url(${p.image})`;
      img.classList.remove('entre'); void img.offsetWidth; img.classList.add('entre');
    }
    const l = e.querySelector('.legende');
    l.classList.remove('arrive'); void l.offsetWidth; l.classList.add('arrive');
    l.classList.toggle('parle', !!p.qui);
    e.querySelector('.qui').innerHTML = p.qui ? `${visage(p.qui)}<b>${PERSONNAGES[p.qui].nom}</b>` : '';
    l.querySelector('p').textContent = p.texte;
    parler(p.texte);
  };
  const suite = () => { i++; if (i >= pages.length) fini(); else { son('pose'); montrer(); } };
  e.querySelector('[data-act=suite]').onclick = ev => { ev.stopPropagation(); suite(); };
  e.querySelector('.planche').onclick = suite;
  e.querySelector('[data-act=passer]').onclick = () => fini();
  montrer();
}

// ---------- Le chemin ----------
function ecranCarte(ouvrir) {
  const total = LECONS.reduce((s, l) => s + etoilesDe(l), 0), max = LECONS.reduce((s, l) => s + etoilesMax(l), 0);
  const actuel = indexActuel();
  const depart = Math.min(etat.place || 0, actuel);
  const nbMedailles = Object.keys(etat.medailles).length;
  const e = ecran('chemin', `
    ${boutonsHaut('titre', `<span class="total">${ETOILE} ${total} / ${max}</span>`,
      `<button class="rond medailles-btn" data-act="medailles" aria-label="Mes médailles"><img src="img/medaille-1.webp" alt=""><b>${nbMedailles}</b></button>`)}
    <div class="carte-cadre"><div class="carte">
      ${CHAPITRES.map((c, i) => `
        <button class="lieu ${chapitreOuvert(c) && i <= depart ? '' : 'ferme'} ${chapitreFini(c) ? 'fini' : ''} ${i === actuel ? 'actuel' : ''}" data-ch="${c.id}" style="left:${c.x}%;top:${c.y}%">
          ${visage(c.qui)}
          <span class="badge">${etat.medailles[c.medaille] ? `<img src="img/medaille-${c.medaille}.webp" alt="">` : chapitreFini(c) ? '' : chapitreOuvert(c) && i <= depart ? '' : CADENAS}</span>
          <span class="etiquette"><b>${c.titre}</b><small>${ETOILE} ${c.lecons.reduce((s, l) => s + etoilesDe(l), 0)}/${c.lecons.reduce((s, l) => s + etoilesMax(l), 0)}</small></span>
        </button>`).join('')}
      <div class="leo" style="left:${CHAPITRES[depart].pied[0]}%;top:${CHAPITRES[depart].pied[1]}%"><img src="img/enfant.webp" alt="Léo"><i class="ombre"></i></div>
    </div></div>`);
  e.querySelector('[data-act=titre]').onclick = ecranTitre;
  e.querySelector('[data-act=voix]').onclick = ev => basculerVoix(ev.currentTarget);
  e.querySelector('[data-act=medailles]').onclick = () => ouvrirMedailles(e);
  e.querySelectorAll('.lieu').forEach(b => b.onclick = () => {
    const c = CHAPITRES.find(x => x.id === b.dataset.ch);
    if (b.classList.contains('ferme')) { son('refus'); b.classList.remove('secoue'); void b.offsetWidth; b.classList.add('secoue'); return; }
    son('pose'); ouvrirChapitre(e, c);
  });
  // Léo marche jusqu'au lieu qui vient de s'ouvrir.
  if (actuel > depart) {
    setTimeout(() => marcher(e, depart, actuel), 500);
    etat.place = actuel; sauver();
  } else {
    e.querySelector('.leo').scrollIntoView({ block: 'center' });
    if (ouvrir) ouvrirChapitre(e, ouvrir);
  }
}

async function marcher(e, de, vers) {
  const leo = e.querySelector('.leo'), img = leo.querySelector('img');
  for (let i = de + 1; i <= vers; i++) {
    const [x, y] = CHAPITRES[i].pied, [x0] = CHAPITRES[i - 1].pied;
    img.src = 'img/enfant-marche.webp';
    leo.classList.toggle('gauche', x < x0);
    leo.classList.add('marche');
    leo.style.left = `${x}%`; leo.style.top = `${y}%`;
    const pas = setInterval(() => son('pas'), 280);
    await attendre(1700);
    clearInterval(pas);
    leo.classList.remove('marche');
    img.src = 'img/enfant.webp';
    const lieu = e.querySelectorAll('.lieu')[i];
    lieu.classList.remove('ferme'); lieu.classList.add('debloque');
    lieu.querySelector('.badge').innerHTML = '';
    son('debloque');
    leo.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    await attendre(500);
  }
  if (e.isConnected && !e.querySelector('.feuille')) ouvrirChapitre(e, CHAPITRES[vers]);
}

function ouvrirMedailles(e) {
  const f = h(`<div class="feuille" role="dialog" aria-label="Mes médailles">
    <div class="feuille-carte">
      <div class="feuille-tete"><small>Ce que Léo a gagné</small><h3>Mes médailles</h3></div>
      <ul class="vitrine">${MEDAILLES.map((nom, i) => `<li class="${etat.medailles[i + 1] ? 'gagnee' : ''}">
        <img src="img/medaille-${i + 1}.webp" alt=""><span>${etat.medailles[i + 1] ? nom : '?'}</span></li>`).join('')}</ul>
      <button class="fermer" aria-label="Fermer">×</button>
    </div></div>`);
  e.appendChild(f);
  f.onclick = ev => { if (ev.target === f || ev.target.classList.contains('fermer')) f.remove(); };
}

function ouvrirChapitre(e, c) {
  e.querySelector('.feuille')?.remove();
  const f = h(`<div class="feuille" role="dialog" aria-label="${c.titre}">
    <div class="feuille-carte">
      <img class="feuille-perso" src="${PERSONNAGES[c.qui].image}" alt="">
      <div class="feuille-tete"><small>${c.lieu}</small><h3>${c.titre}</h3></div>
      <ol class="lecons">
        ${c.lecons.map(l => {
          const ok = ouverte(l), fait = !!etat.lecons[l.id];
          const n = etoilesDe(l), max = etoilesMax(l);
          return `<li><button data-l="${l.id}" ${ok ? '' : 'disabled'} class="${fait ? 'faite' : ''} ${ok && !fait ? 'prochaine' : ''}">
            <img class="pion" src="img/${l.piece}.webp" alt="">
            <span class="nom">${l.titre}</span>
            ${ok ? (l.parties ? `<span class="medailles-n">${AMIS.filter(a => etat.amis[a.qui] === 'gagne').length}/${AMIS.length}</span>` : fait ? etoiles(n >= max * .9 ? 3 : n >= max * .6 ? 2 : 1) : '<span class="go">▶</span>') : `<span class="cadenas">${CADENAS}</span>`}
          </button></li>`;
        }).join('')}
      </ol>
      <button class="fermer" aria-label="Fermer">×</button>
    </div></div>`);
  e.appendChild(f);
  f.onclick = ev => { if (ev.target === f || ev.target.classList.contains('fermer')) f.remove(); };
  f.querySelectorAll('[data-l]').forEach(b => b.onclick = () => {
    const l = LECONS.find(x => x.id === b.dataset.l);
    son('pose');
    if (l.parties) { etat.lecons[l.id] = true; sauver(); ecranAmis(); } else lancerLecon(l);
  });
}

// ---------- L'écran de jeu (leçon ou partie) ----------
function ecranJeu(titre, retour) {
  const e = ecran('jeu', `
    ${boutonsHaut('retour', titre)}
    <div class="progression"></div>
    <div class="scene">
      <div class="cote">
        <div class="bulle-zone">
          <div class="perso"></div>
          <div class="bulle"><p class="texte"></p><p class="aide" hidden></p><div class="actions"></div></div>
        </div>
        <div class="statut">
          <div class="leo-mini"><img src="img/enfant-pense.webp" alt="Léo"><span>Léo</span></div>
          <div class="objectif"></div>
        </div>
      </div>
      <div class="zone-plateau"><div class="plateau-el"></div></div>
    </div>`);
  e.querySelector('[data-act=retour]').onclick = retour;
  e.querySelector('[data-act=voix]').onclick = ev => basculerVoix(ev.currentTarget);
  return e;
}

// Fait parler un personnage : texte et boutons [{ texte, act, classe }]. options : { joie, aide, pense }.
function bulle(e, qui, texte, boutons = [], { joie = false, aide = '', pense = false } = {}) {
  const p = PERSONNAGES[qui];
  const perso = e.querySelector('.perso');
  const src = joie ? imageJoie(qui) : p.image;
  if (perso.dataset.qui !== qui || perso.dataset.src !== src) {
    const change = perso.dataset.qui !== qui;
    perso.dataset.qui = qui; perso.dataset.src = src;
    perso.innerHTML = `<img src="${src}" alt="${p.nom}" class="${change ? 'entre' : 'rebond'}"><span class="nom">${p.nom}</span>`;
  }
  const b = e.querySelector('.bulle');
  b.classList.remove('arrive'); void b.offsetWidth; b.classList.add('arrive');
  b.classList.toggle('pense', pense);
  b.classList.toggle('de-leo', qui === 'enfant');
  b.querySelector('.texte').textContent = texte;
  const a = b.querySelector('.aide');
  a.hidden = !aide; a.textContent = aide;
  b.onclick = ev => { if (!ev.target.closest('button')) parler(texte + (aide ? ' ' + aide : '')); };
  const zone = b.querySelector('.actions');
  zone.innerHTML = '';
  for (const bt of boutons) {
    const n = h(`<button class="${bt.classe || 'petit'}">${bt.texte}</button>`);
    n.onclick = ev => { ev.stopPropagation(); bt.act(); };
    zone.appendChild(n);
  }
  if (!pense) parler(texte + (aide ? ' ' + aide : ''));
}

// Léo, sous la bulle : il réfléchit, puis saute de joie quand c'est réussi.
function leo(e, humeur) {
  const m = e.querySelector('.leo-mini');
  if (!m) return;
  const img = m.querySelector('img');
  img.src = humeur === 'joie' ? 'img/enfant-joie.webp' : 'img/enfant-pense.webp';
  m.classList.remove('saute', 'triste'); void m.offsetWidth;
  if (humeur === 'joie') m.classList.add('saute');
  if (humeur === 'triste') m.classList.add('triste');
}

const RAISONS = {
  'echec-pas-mat': "C'est échec, mais le roi peut encore se sauver. Cherche encore !",
  'pat': "Oh non, c'est pat : le roi ne peut plus bouger mais il n'est pas en échec. Personne ne gagne. Essaie autre chose !",
  'pas-mat': "Ce n'est pas encore mat. Il faut attaquer le roi et qu'il ne puisse plus s'échapper.",
  'pas-echec': "Le roi n'est pas attaqué. Essaie encore !",
  'bouge-le-roi': "Cette fois, c'est le roi qui doit bouger.",
  'prends-l-attaquant': "Essaie de prendre la pièce qui attaque ton roi.",
  'bloque': "Mets une pièce entre ton roi et l'attaquant, comme un bouclier.",
  'pas-la-bonne-piece': "C'est l'autre pièce qui est en danger !",
  'encore-attaquee': "Oups, sur cette case elle peut encore être prise. Regarde bien !",
  'pas-de-prise': "Il faut prendre une pièce !",
  'plus-gros': "Miam, mais il y avait une plus grosse part à prendre !",
  'piege': "Attention, c'était un piège : après ta prise, on peut te reprendre !",
  'autre-coup': "Ce n'est pas le coup que je voulais te montrer. Réessaie !",
  'roi-en-danger': "Non ! Sur cette case, ton roi serait attaqué. Le roi n'a jamais le droit d'aller en échec.",
  'reste-en-echec': "Ton roi est en échec : il faut d'abord le sauver !",
  'chemin-bloque': "Une pièce bloque le chemin ! Seul le cavalier peut sauter par-dessus.",
  'pas-comme-ca-r': "La tour ne va pas comme ça : seulement tout droit.",
  'pas-comme-ca-b': "Le fou ne va pas comme ça : seulement en diagonale.",
  'pas-comme-ca-q': "La dame va tout droit ou en diagonale, pas comme ça.",
  'pas-comme-ca-n': "Le cavalier saute en L : deux cases tout droit, puis une sur le côté.",
  'pas-comme-ca-k': "Le roi ne fait qu'un seul pas à la fois.",
  'pas-comme-ca-p': "Le pion avance tout droit, et il prend en diagonale seulement s'il y a une pièce à prendre.",
};

const BRAVO = ['Bravo !', 'Super !', 'Génial !', 'Bien joué !', 'Excellent !', 'Magnifique !'];

// L'objectif sous la bulle : étoiles à ramasser, pièces à prendre, ou pièces prises dans une partie.
function objectif(e, html) { e.querySelector('.objectif').innerHTML = html; }

function lancerLecon(lecon) {
  const chapitre = chapitreDe(lecon);
  const e = ecranJeu(lecon.titre, () => ecranCarte(chapitre));
  const plateau = new Plateau(e.querySelector('.plateau-el'), { surCoup: m => surCoup(m), surRefus: (de, vers, r) => surRefus(r) });
  const etapes = lecon.etapes;
  const prog = e.querySelector('.progression');
  prog.innerHTML = etapes.map(s => `<i class="${s.ex ? 'ex' : ''}"></i>`).join('');
  let i = -1, ex = null, partie = null;

  const apercu = j => {
    const suiv = etapes.slice(j).find(s => s.ex) || etapes.slice(0, j).reverse().find(s => s.ex);
    return suiv ? depuisFen(suiv.ex.fen) : depuisFen(DEPART);
  };
  const quiEtape = () => etapes[i].qui || lecon.qui;

  function suivante() {
    i++;
    [...prog.children].forEach((d, k) => { d.classList.toggle('fait', k < i); d.classList.toggle('la', k === i); });
    if (i >= etapes.length) return finLecon();
    const s = etapes[i], qui = quiEtape();
    ex = null; partie = null;
    plateau.interactif = false; plateau.choix = null; plateau.dernier = null; plateau.oublierIndice(); plateau.nettoyer();
    plateau.racine.dataset.tour = '';
    if (s.dit) {
      plateau.etoiles = []; plateau.dangers = false;
      const pos = apercu(i);
      if (!plateau.pos || s.montre || (i > 0 && etapes[i - 1].ex)) plateau.poser(pos);
      plateau.coupsPossibles = sq => coupsLegaux({ ...plateau.pos, trait: 'w' }, sq);
      if (s.montre) plateau.demontrer(caseDe(s.montre)); else { plateau.choix = null; plateau.marques(); }
      leo(e, qui === 'enfant' ? 'joie' : 'pense');
      objectif(e, '');
      bulle(e, qui, s.dit, [{ texte: 'Suivant', classe: 'suivant', act: () => { son('pose'); suivante(); } }], { joie: qui === 'enfant' });
    } else if (s.ex.type === 'partie') {
      partie = demarrerPartie(e, plateau, s.ex, s.ex.ami || qui, resultat => {
        const n = resultat === 'gagne' ? 3 : resultat === 'nul' ? 2 : 1;
        etat.notes[s.ex.id] = Math.max(etat.notes[s.ex.id] || 0, n);
        sauver();
        e.querySelector('.fete')?.remove();
        e.classList.remove('fete-en-cours');
        suivante();
      });
    } else {
      demarrerExercice(s.ex);
    }
  }

  function majObjectif() {
    const d = ex.def;
    if (d.type === 'etoiles') {
      const pris = d.etoiles.length - ex.etoiles.length;
      objectif(e, `<span class="pot">${d.etoiles.map((_, k) => `<i class="${k < pris ? 'pleine' : ''}">${ETOILE}</i>`).join('')}</span><span class="coups">${ex.coups} coup${ex.coups > 1 ? 's' : ''}${ex.minimum ? ` <small>(le mieux : ${ex.minimum})</small>` : ''}</span>`);
    } else if (d.type === 'prendre') {
      const depart = depuisFen(d.fen).b.filter(p => p && couleur(p) === 'b');
      const restent = ex.pos.b.filter(p => p && couleur(p) === 'b').length;
      objectif(e, `<span class="plat">${depart.map((p, k) => `<img class="${k < depart.length - restent ? 'mangee' : ''}" src="img/b${type(p)}.webp" alt="">`).join('')}</span><span class="coups">${ex.coups} coup${ex.coups > 1 ? 's' : ''}${ex.minimum ? ` <small>(le mieux : ${ex.minimum})</small>` : ''}</span>`);
    } else {
      const buts = { mat: 'Échec et mat en 1 coup', echec: 'Faire échec', parer: 'Sauver le roi', sauver: 'Mettre à l\'abri', prise: 'La meilleure prise', coup: 'Le coup spécial' };
      objectif(e, `<span class="but">${buts[d.type] || ''}</span>`);
    }
  }

  function demarrerExercice(def) {
    ex = new Exercice(def);
    plateau.etoiles = ex.etoiles.slice();
    plateau.dangers = !!def.dangers;
    plateau.dernier = null; plateau.oublierIndice(); plateau.nettoyer();
    plateau.coupsPossibles = sq => ex.coupsDepuis(sq);
    plateau.poser(ex.pos, { apparaitre: true });
    plateau.interactif = true;
    leo(e, 'pense');
    majObjectif();
    bulle(e, quiEtape(), def.dit, boutonsExercice());
  }

  function boutonsExercice() {
    return [
      { texte: 'Indice', classe: 'petit', act: () => {
        const m = ex.indice();
        if (!m) return;
        ex.aide = true; plateau.montrerIndice(m);
        bulle(e, quiEtape(), ex.def.dit, boutonsExercice(), { aide: 'Indice : joue la pièce qui brille, vers le rond qui clignote.' });
      } },
      { texte: 'Recommencer', classe: 'petit', act: () => demarrerExercice(ex.def) },
    ];
  }

  function surRefus(raison) {
    son('refus');
    if (partie) return partie.surRefus(raison);
    if (ex) bulle(e, quiEtape(), RAISONS[raison], boutonsExercice());
  }

  async function surCoup(m) {
    if (partie) return partie.surCoup(m);
    if (!ex || ex.fini) return;
    const qui = quiEtape();
    plateau.interactif = false;
    const avant = ex.pos;
    const r = ex.jouer(m);
    if (r.annule) {
      son('pose');
      await plateau.animer(m, r.apres);
      if (enEchec(r.apres)) son('echec');
      son('faux');
      leo(e, 'triste');
      bulle(e, qui, RAISONS[r.raison] || 'Essaie encore !', boutonsExercice());
      await attendre(1100);
      await plateau.reculer(m, avant);
      plateau.interactif = true;
      return;
    }
    son(m.prise ? 'prise' : 'pose');
    await plateau.animer(m, ex.pos);
    plateau.oublierIndice();
    if (r.etoile) {
      const de = plateau.ramasser(m.vers);
      plateau.etoiles = ex.etoiles.slice(); plateau.marques();
      son('etoile');
      const pris = ex.def.etoiles.length - ex.etoiles.length;
      const cible = e.querySelectorAll('.objectif .pot i')[pris - 1];
      if (cible) envolerEtoile(de, cible.getBoundingClientRect(), () => { majObjectif(); e.querySelectorAll('.objectif .pot i')[pris - 1]?.classList.add('arrive'); });
      else majObjectif();
    } else majObjectif();
    if (!r.fini) { plateau.interactif = true; return; }
    await reussite(m, qui);
  }

  async function reussite(m, qui) {
    const d = ex.def;
    plateau.briller(m.vers);
    if (d.type === 'mat') { son('echec'); plateau.renverser(roiDe(ex.pos, 'b')); }
    else if (d.type === 'echec') son('echec');
    let n = ex.note();
    if (ex.aide) n = Math.min(n, 2);
    etat.notes[d.id] = Math.max(etat.notes[d.id] || 0, n);
    sauver();
    kit(L => L.skill('logique.puzzle', 'echecs.' + d.id, n === 3));
    await attendre(250);
    son('juste');
    leo(e, 'joie');
    confettis(e.querySelector('.zone-plateau'), n === 3 ? 40 : 18);
    let extra = '';
    if (ex.aide) extra = ' Avec un indice, c\'est 2 étoiles au plus. Refais-le tout seul pour en avoir 3 !';
    else if (SEUL.includes(d.type) && n < 3 && ex.minimum) extra = ` On peut le faire en ${ex.minimum} coup${ex.minimum > 1 ? 's' : ''}. Tu veux réessayer ?`;
    else if (n < 3) extra = " Du premier coup, c'est 3 étoiles !";
    bulle(e, qui, auHasard(BRAVO) + extra, [
      ...(n < 3 ? [{ texte: 'Refaire', classe: 'petit', act: () => demarrerExercice(d) }] : []),
      { texte: 'Suivant', classe: 'suivant', act: () => { son('pose'); suivante(); } },
    ], { joie: true });
    e.querySelector('.bulle .texte').insertAdjacentHTML('afterbegin', etoiles(n) + ' ');
  }

  function finLecon() {
    etat.lecons[lecon.id] = true;
    const finChapitre = chapitre.lecons[chapitre.lecons.length - 1].id === lecon.id;
    // Les parties d'une leçon : la médaille demande d'en gagner au moins une.
    const parties = exercicesDe(lecon).filter(x => x.type === 'partie');
    const gagnees = parties.filter(x => etat.notes[x.id] === 3).length;
    const sansVictoire = parties.length > 0 && gagnees === 0;
    const nouvelleMedaille = finChapitre && !sansVictoire && !etat.medailles[chapitre.medaille];
    if (nouvelleMedaille) etat.medailles[chapitre.medaille] = true;
    sauver();
    kit(L => { L.progress('lecons', Object.keys(etat.lecons).length); L.checkpoint('fin-de-lecon'); });
    const suivanteL = LECONS[indexLecon(lecon.id) + 1];
    const ami = parties[0] ? PERSONNAGES[parties[0].ami || lecon.qui].nom : '';
    feter(e, {
      titre: sansVictoire ? 'Leçon terminée' : finChapitre ? 'Chapitre réussi !' : 'Leçon réussie !',
      texte: sansVictoire ? `Gagne une partie contre ${ami} pour décrocher la médaille !` : '',
      qui: lecon.qui, n: etoilesDe(lecon), max: etoilesMax(lecon),
      medaille: nouvelleMedaille ? chapitre.medaille : null,
      boutons: [
        ...(sansVictoire && !tempsFini ? [{ texte: 'Rejouer', classe: 'suivant', act: () => lancerLecon(lecon) }] : []),
        { texte: 'Le chemin', classe: finChapitre ? 'suivant' : 'petit', act: () => ecranCarte(finChapitre ? null : chapitre) },
        ...(suivanteL && !finChapitre && !tempsFini ? [{ texte: 'Leçon suivante', classe: 'suivant', act: () => lancerLecon(suivanteL) }] : []),
      ],
    });
  }

  suivante();
}

// La fête de fin : Léo et son ami sautent de joie, les étoiles tombent une à une, puis la médaille.
async function feter(e, { titre, qui, n, max, medaille, boutons, texte }) {
  globalThis.speechSynthesis?.cancel();
  e.classList.add('fete-en-cours');
  const nb = max ? (n >= max * .9 ? 3 : n >= max * .6 ? 2 : 1) : 3;
  const f = h(`<div class="fete">
    <div class="rayons" aria-hidden="true"></div>
    <div class="fete-carte">
      <div class="fete-persos">
        <img class="p-leo" src="img/enfant-joie.webp" alt="Léo">
        <img class="p-ami" src="${imageJoie(qui)}" alt="${PERSONNAGES[qui].nom}">
        <i class="sol"></i>
      </div>
      <h3>${titre}</h3>
      ${texte ? `<p class="fete-texte">${texte}</p>` : ''}
      ${max ? `<div class="grosses-etoiles">${[0, 1, 2].map(() => `<i>${ETOILE}</i>`).join('')}</div><p class="score"><b>0</b> / ${max}</p>` : ''}
      <div class="medaille-gagnee" hidden><img alt=""><span></span></div>
      <div class="actions"></div>
    </div></div>`);
  e.appendChild(f);
  son('fin');
  confettis(f, 60);
  if (texte) parler(texte);
  if (max) {
    const grosses = f.querySelectorAll('.grosses-etoiles i'), score = f.querySelector('.score b');
    const compte = (async () => { await attendre(380); for (let v = 1; v <= n; v++) { score.textContent = v; if (v % 2) son('compte'); await attendre(1100 / Math.max(n, 1)); } })();
    for (let k = 0; k < 3; k++) {
      await attendre(380);
      if (k < nb) { grosses[k].classList.add('pleine'); son('etoile'); }
      else grosses[k].classList.add('vide');
    }
    await compte;
    f.querySelector('.score').classList.add('fini');
  }
  if (medaille) {
    await attendre(500);
    const m = f.querySelector('.medaille-gagnee');
    m.querySelector('img').src = `img/medaille-${medaille}.webp`;
    m.querySelector('span').textContent = `Nouvelle médaille : ${MEDAILLES[medaille - 1]} !`;
    m.hidden = false;
    son('medaille');
    confettis(f, 40);
    parler(`Nouvelle médaille : ${MEDAILLES[medaille - 1]} !`);
  }
  await attendre(300);
  const zone = f.querySelector('.actions');
  for (const bt of boutons) {
    const b = h(`<button class="${bt.classe}">${bt.texte}</button>`);
    b.onclick = () => { son('clic'); bt.act(); };
    zone.appendChild(b);
  }
}

// ---------- Une partie contre un ami ----------
// fini(resultat) : 'gagne', 'perdu' ou 'nul'.
function demarrerPartie(e, plateau, def, qui, fini, options = {}) {
  const nom = PERSONNAGES[qui].nom;
  let pos = depuisFen(def.fen), historique = [], termine = false, reflechit = false;
  const prisesToi = [], prisesAmi = [];
  const fin = def.fin || 'mat';
  e.querySelector('.fete')?.remove();
  e.classList.remove('fete-en-cours');
  plateau.etoiles = []; plateau.dangers = !!options.dangers; plateau.dernier = null; plateau.oublierIndice(); plateau.nettoyer();
  plateau.coupsPossibles = sq => (termine || reflechit || pos.trait !== 'w') ? [] : coupsLegaux(pos, sq);
  plateau.poser(pos, { apparaitre: true });
  plateau.interactif = true;
  const tour = t => { plateau.racine.dataset.tour = t; };
  tour('toi');
  leo(e, 'pense');

  const majPrises = () => objectif(e, `<span class="prises toi" title="Les prises de Léo">${prisesToi.map(p => `<img src="img/b${type(p)}.webp" alt="">`).join('') || '<em>Tes prises</em>'}</span>
    <span class="prises ami" title="Les prises de ${nom}">${visage(qui)}${prisesAmi.map(p => `<img src="img/w${type(p)}.webp" alt="">`).join('')}</span>`);
  majPrises();

  let texteBulle = def.dit || 'À toi de jouer, tu as les blancs.', joieBulle = false;
  const boutons = () => [
    { texte: 'Annuler mon coup', classe: 'petit', act: annuler },
    { texte: plateau.dangers ? 'Cacher les dangers' : 'Voir les dangers', classe: 'petit', act: () => { plateau.dangers = !plateau.dangers; plateau.marques(); dire2(texteBulle, joieBulle); } },
  ];
  const dire2 = (t, joie = false) => { texteBulle = t; joieBulle = joie; bulle(e, qui, t, boutons(), { joie }); };
  dire2(texteBulle);

  function annuler() {
    if (!historique.length || reflechit || termine) return;
    const h0 = historique.pop();
    pos = h0.pos; prisesToi.length = h0.toi; prisesAmi.length = h0.ami;
    plateau.dernier = null; plateau.choix = null;
    plateau.poser(pos, { apparaitre: true });
    majPrises();
    dire2('On reprend. À toi !');
  }

  function terminer(r) {
    termine = true; plateau.interactif = false; tour('fin');
    const res = r.gagnant === 'w' ? 'gagne' : r.gagnant === 'b' ? 'perdu' : 'nul';
    const pourquoi = {
      mat: r.gagnant === 'w' ? 'Échec et mat !' : 'Échec et mat…',
      arrive: r.gagnant === 'w' ? 'Ton pion est arrivé au bout !' : 'Mon pion est arrivé au bout.',
      'plus-de-pions': r.gagnant === 'w' ? 'Je n\'ai plus de pions !' : 'Tu n\'as plus de pions.',
      'tout-pris': r.gagnant === 'w' ? 'Tu as tout mangé !' : 'J\'ai tout mangé.',
      pat: 'Pat : le roi ne peut plus bouger sans être en échec. Match nul.',
      bloque: 'Plus personne ne peut bouger.',
      'rois-seuls': 'Il ne reste que les deux rois. Match nul.',
      long: 'La partie est très longue : on dit match nul.',
    }[r.raison] || '';
    if (r.raison === 'mat') plateau.renverser(roiDe(pos, r.gagnant === 'w' ? 'b' : 'w'));
    kit(L => { L.skill('strategie.choix', 'echecs.partie.' + (def.id || qui), res === 'gagne'); L.checkpoint('fin-de-partie'); });
    const rejouer = { texte: 'Rejouer', classe: 'petit', act: () => demarrerPartie(e, plateau, def, qui, fini, options) };
    const continuer = { texte: 'Continuer', classe: 'suivant', act: () => fini(res) };
    const choix = tempsFini ? [continuer] : [rejouer, continuer];
    if (res === 'gagne') {
      leo(e, 'joie');
      bulle(e, qui, `${pourquoi} Bravo, tu as gagné !`, choix);
      setTimeout(() => { if (termine && plateau.racine.isConnected) feter(e, { titre: 'Tu as gagné !', qui, texte: `${pourquoi} Bravo Léo, tu as battu ${nom} !`, boutons: choix }); }, 900);
    } else {
      son(res === 'perdu' ? 'perdu' : 'juste');
      leo(e, res === 'perdu' ? 'triste' : 'pense');
      bulle(e, qui, res === 'perdu' ? `${pourquoi} J'ai gagné cette fois !${tempsFini ? '' : ' On rejoue ?'}` : pourquoi, choix, { joie: res === 'perdu' });
    }
  }

  function surRefus(raison) { bulle(e, qui, RAISONS[raison], boutons()); }

  async function surCoup(m) {
    if (termine || reflechit) return;
    plateau.interactif = false; tour('ami');
    historique.push({ pos, toi: prisesToi.length, ami: prisesAmi.length });
    pos = jouer(pos, m);
    son(m.prise ? 'prise' : 'pose');
    await plateau.animer(m, pos);
    if (m.prise) { prisesToi.push(m.prise); majPrises(); }
    let r = finDePartie(pos, fin);
    if (!r && historique.length > 120) r = { gagnant: null, raison: 'long' };
    if (r) return terminer(r);
    if (enEchec(pos)) son('echec');
    reflechit = true;
    // L'ami réfléchit : trois petits points dans sa bulle.
    const reaction = enEchec(pos) ? 'Oh, échec ! Je dois sauver mon roi…' : m.prise && type(m.prise) !== 'p' ? `Oh non, ${ma(m.prise)} !` : '';
    bulle(e, qui, reaction || 'Je réfléchis', [], { pense: true });
    await attendre(reaction ? 1100 : 650);
    let c = choisirCoup(pos, def.niveau);
    if (c?.promo) c = coupsLegaux(pos, c.de).find(x => x.vers === c.vers && type(x.promo) === 'q') || c;
    if (termine || !plateau.racine.isConnected) return;
    pos = jouer(pos, c);
    son(c.prise ? 'prise' : 'pose');
    await plateau.animer(c, pos);
    if (c.prise) { prisesAmi.push(c.prise); majPrises(); }
    reflechit = false;
    r = finDePartie(pos, fin);
    if (r) return terminer(r);
    if (enEchec(pos)) { son('echec'); dire2('Échec ! Sauve ton roi.'); }
    else if (c.prise) dire2(type(c.prise) === 'p' ? `Je t'ai pris ${sa(c.prise)}. À toi !` : `Je t'ai pris ${sa(c.prise)} ! Regarde bien les dangers.`, type(c.prise) !== 'p');
    else dire2(auHasard(['À toi !', 'À toi de jouer.', 'Hmm… à toi !']));
    plateau.interactif = true; tour('toi');
  }

  return { surCoup, surRefus };
}

// ---------- Jouer avec les amis ----------
function ecranAmis() {
  const e = ecran('amis', `
    ${boutonsHaut('chemin', 'Jouer avec les amis')}
    <p class="intro">Une vraie partie, du début à la fin. Léo a les blancs : il commence. Les amis sont rangés du plus facile au plus fort.</p>
    <ol class="liste-amis">
      ${AMIS.map(a => `<li><button data-qui="${a.qui}">
        <img src="${PERSONNAGES[a.qui].image}" alt="">
        <span class="txt"><b>${PERSONNAGES[a.qui].nom}</b><small>« ${a.mot} »</small></span>
        ${etat.amis[a.qui] === 'gagne' ? `<span class="medaille" title="Gagné">${ETOILE}</span>` : '<span class="jouer">Jouer</span>'}
      </button></li>`).join('')}
    </ol>`);
  e.querySelector('[data-act=chemin]').onclick = () => ecranCarte(CHAPITRES[CHAPITRES.length - 1]);
  e.querySelector('[data-act=voix]').onclick = ev => basculerVoix(ev.currentTarget);
  e.querySelectorAll('[data-qui]').forEach(b => b.onclick = () => { son('pose'); lancerPartie(AMIS.find(a => a.qui === b.dataset.qui)); });
}

function lancerPartie(ami) {
  const nom = PERSONNAGES[ami.qui].nom;
  const e = ecranJeu(`Partie avec ${nom}`, ecranAmis);
  e.querySelector('.progression').remove();
  let partie;
  const plateau = new Plateau(e.querySelector('.plateau-el'), { surCoup: m => partie.surCoup(m), surRefus: (de, vers, r) => { son('refus'); partie.surRefus(r); } });
  partie = demarrerPartie(e, plateau, { id: 'ami-' + ami.qui, fen: DEPART, fin: 'mat', niveau: ami.niveau, dit: ami.mot + ' À toi de commencer !' }, ami.qui, res => {
    const premiereFois = res === 'gagne' && ami.qui === 'sage' && !etat.fin;
    if (res === 'gagne') etat.amis[ami.qui] = 'gagne';
    else if (res === 'nul' && etat.amis[ami.qui] !== 'gagne') etat.amis[ami.qui] = 'nul';
    if (premiereFois) { etat.fin = true; etat.medailles[MEDAILLE_FINALE] = true; }
    sauver();
    kit(L => L.progress('amis-battus', AMIS.filter(a => etat.amis[a.qui] === 'gagne').length));
    if (premiereFois) {
      ecranHistoire(FIN, () => {
        const e2 = ecran('jeu fin-du-jeu', '');
        feter(e2, { titre: 'Grand champion !', qui: 'sage', medaille: MEDAILLE_FINALE, texte: 'Léo a terminé le Chemin du Roi.', boutons: [{ texte: 'Continuer', classe: 'suivant', act: ecranAmis }] });
      });
    } else ecranAmis();
  });
}

// Pour les tests : aller directement à une leçon (?lecon=tour), aux amis (?amis), au chemin (?chemin), à l'histoire (?histoire, ?fin).
if (q.get('lecon')) lancerLecon(LECONS.find(l => l.id === q.get('lecon')));
else if (q.has('amis')) ecranAmis();
else if (q.has('chemin')) ecranCarte();
else if (q.has('histoire')) ecranHistoire(INTRO, ecranCarte);
else if (q.has('fin')) ecranHistoire(FIN, ecranAmis);
else ecranTitre();

globalThis.__chemin = { etat };

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
