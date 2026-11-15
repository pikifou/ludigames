// Le plateau : cases, pièces en bois qui sautent d'une case à l'autre, étoiles, toucher ou glisser pour jouer.
import { COLONNES, couleur, type, attaquee, roiDe, enEchec, coupsBruts } from './echecs.js';

const ETOILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z"/></svg>';
const CROIX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const x = sq => sq & 7, y = sq => 7 - (sq >> 3);

// Le déplacement serait-il possible pour cette pièce sur un plateau vide ?
function geometrieOk(t, c, de, vers) {
  const df = (vers & 7) - (de & 7), dr = (vers >> 3) - (de >> 3), adf = Math.abs(df), adr = Math.abs(dr);
  if (t === 'r') return df === 0 || dr === 0;
  if (t === 'b') return adf === adr;
  if (t === 'q') return df === 0 || dr === 0 || adf === adr;
  if (t === 'n') return adf * adr === 2;
  if (t === 'k') return Math.max(adf, adr) <= 1;
  if (t === 'p') { const sens = c === 'w' ? 1 : -1; return df === 0 && (dr === sens || dr === 2 * sens); }
  return false;
}
const img = p => `img/${couleur(p)}${type(p)}.webp`;

export class Plateau {
  // surCoup(m) : un coup légal choisi. surRefus(de, vers, raison) : un coup que les règles interdisent.
  constructor(racine, { surCoup, surRefus = () => {} }) {
    this.surCoup = surCoup;
    this.surRefus = surRefus;
    this.racine = racine;
    racine.classList.add('plateau');
    racine.innerHTML = '<div class="cases"></div><div class="pieces"></div><div class="effets"></div>';
    this.cases = racine.querySelector('.cases');
    this.couche = racine.querySelector('.pieces');
    this.effets = racine.querySelector('.effets');
    for (let i = 0; i < 64; i++) {
      const sq = (7 - (i >> 3)) * 8 + (i & 7);
      const c = document.createElement('div');
      c.className = 'case ' + (((sq & 7) + (sq >> 3)) % 2 ? 'claire' : 'foncee');
      c.dataset.sq = sq;
      if ((sq & 7) === 0) c.insertAdjacentHTML('beforeend', `<span class="coord rang">${(sq >> 3) + 1}</span>`);
      if (sq >> 3 === 0) c.insertAdjacentHTML('beforeend', `<span class="coord col">${COLONNES[sq & 7]}</span>`);
      this.cases.appendChild(c);
    }
    this.elems = new Map(); // case -> élément de pièce
    this.choix = null;
    this.coupsPossibles = () => [];
    this.interactif = false;
    this.ecouter();
  }

  caseEl(sq) { return this.cases.children[(7 - (sq >> 3)) * 8 + (sq & 7)]; }

  placer(el, sq) { el.style.transform = `translate(${x(sq) * 100}%, ${y(sq) * 100}%)`; el.style.zIndex = 10 + y(sq); }

  // Met les pièces d'une position, sans glissement (les pièces qui reviennent apparaissent en douceur).
  poser(pos, { apparaitre = false } = {}) {
    this.pos = pos;
    for (let sq = 0; sq < 64; sq++) {
      const p = pos.b[sq], el = this.elems.get(sq);
      if (el && el.dataset.p === p) continue;
      if (el) { el.remove(); this.elems.delete(sq); }
      if (p) {
        const n = document.createElement('div');
        n.className = 'piece ' + (couleur(p) === 'w' ? 'blanche' : 'noire') + (apparaitre ? ' apparait' : '');
        n.dataset.p = p;
        n.innerHTML = `<img src="${img(p)}" alt="" draggable="false">`;
        this.placer(n, sq);
        this.couche.appendChild(n);
        this.elems.set(sq, n);
      }
    }
    this.marques();
  }

  // Une pièce saute d'une case à l'autre, puis on pose la position d'arrivée. Renvoie la pièce prise, s'il y en a une.
  animer(m, apres) {
    return new Promise(fini => {
      const el = this.elems.get(m.de);
      const prise = m.enPassant ? m.vers + (couleur(m.piece) === 'w' ? -8 : 8) : m.vers;
      const victime = this.elems.get(prise);
      if (el) {
        this.elems.delete(m.de); this.elems.set(m.vers, el);
        el.classList.remove('saute'); void el.offsetWidth; el.classList.add('saute', 'bouge');
        this.placer(el, m.vers);
      }
      if (m.roque) {
        const base = m.de & 56, de = m.roque === 'petit' ? base + 7 : base, vers = m.roque === 'petit' ? base + 5 : base + 3;
        const t = this.elems.get(de);
        if (t) { this.elems.delete(de); this.elems.set(vers, t); t.classList.add('saute'); this.placer(t, vers); }
      }
      this.dernier = m;
      setTimeout(() => {
        if (victime && victime !== el) { victime.classList.add('prise'); if (this.elems.get(prise) === victime) this.elems.delete(prise); setTimeout(() => victime.remove(), 450); this.eclat(prise, 'eclat-prise', 9); }
        else this.eclat(m.vers, 'poussiere', 5);
      }, 200);
      setTimeout(() => { el?.classList.remove('bouge', 'saute'); this.poser(apres); fini(); }, 300);
    });
  }

  // Le coup refusé revient en arrière en glissant, et la pièce prise réapparaît.
  reculer(m, avant) {
    return new Promise(fini => {
      const el = this.elems.get(m.vers);
      if (el) { this.elems.delete(m.vers); this.elems.set(m.de, el); el.classList.add('bouge'); this.placer(el, m.de); }
      this.dernier = null;
      setTimeout(() => { el?.classList.remove('bouge'); this.poser(avant, { apparaitre: true }); fini(); }, 300);
    });
  }

  // De petites particules sur une case (poussière à l'atterrissage, éclats d'une prise, étoiles).
  eclat(sq, classe, n = 6) {
    const z = document.createElement('div');
    z.className = 'eclats ' + classe;
    z.style.left = `${x(sq) * 12.5}%`; z.style.top = `${y(sq) * 12.5}%`;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const a = (Math.PI * 2 * i) / n + Math.random() * .5, d = 40 + Math.random() * 45;
      s.style.setProperty('--dx', `${Math.cos(a) * d}%`); s.style.setProperty('--dy', `${Math.sin(a) * d}%`);
      s.style.animationDelay = `${Math.random() * 60}ms`;
      if (classe === 'etoiles-eclat') s.innerHTML = ETOILE;
      z.appendChild(s);
    }
    this.effets.appendChild(z);
    setTimeout(() => z.remove(), 900);
  }

  // Efface les traces de l'exercice d'avant (case dorée, roi couché).
  nettoyer() {
    this.cases.querySelectorAll('.doree').forEach(c => c.classList.remove('doree'));
    this.racine.classList.remove('mat', 'secoue');
  }

  // Une case qui brille en doré (le coup gagnant).
  briller(sq) { const c = this.caseEl(sq); c.classList.remove('doree'); void c.offsetWidth; c.classList.add('doree'); }

  // Le roi mat se couche.
  renverser(sq) { this.elems.get(sq)?.classList.add((sq & 7) >= 4 ? 'renverse-g' : 'renverse-d'); this.racine.classList.add('mat'); this.racine.classList.remove('secoue'); void this.racine.offsetWidth; this.racine.classList.add('secoue'); }

  // Étoiles, dangers, échec, dernier coup, sélection.
  marques() {
    const pos = this.pos;
    const cibles = this.choix != null ? this.coupsPossibles(this.choix) : [];
    const roiEnEchec = pos && enEchec(pos) ? roiDe(pos, pos.trait) : -1;
    for (let sq = 0; sq < 64; sq++) {
      const c = this.caseEl(sq);
      c.classList.toggle('choisie', sq === this.choix);
      c.classList.toggle('dernier', !!this.dernier && (this.dernier.de === sq || this.dernier.vers === sq));
      c.classList.toggle('echec', sq === roiEnEchec);
      c.classList.toggle('indice', sq === this.indice?.de);
      c.classList.toggle('indice-vers', sq === this.indice?.vers);
      const cible = cibles.find(m => m.vers === sq);
      c.classList.toggle('cible', !!cible && !cible.prise);
      c.classList.toggle('cible-prise', !!cible && !!cible.prise);
      const p = pos?.b[sq];
      c.classList.toggle('menace', !!this.dangers && !!p && couleur(p) === 'w' && type(p) !== 'k' && attaquee(pos, sq, 'b'));
      const etoile = this.etoiles?.includes(sq);
      const danger = this.dangers && pos && !p && attaquee(pos, sq, 'b');
      let deco = c.querySelector('.deco');
      const voulu = etoile ? 'etoile' : danger ? 'danger' : '';
      if ((deco?.dataset.k || '') !== voulu) {
        deco?.remove();
        if (voulu) c.insertAdjacentHTML('beforeend', `<span class="deco ${voulu}" data-k="${voulu}">${etoile ? ETOILE : CROIX}</span>`);
      }
    }
    this.elems.forEach((el, sq) => { el.classList.toggle('echec', sq === roiEnEchec); el.classList.toggle('levee', sq === this.choix); });
  }

  // L'étoile s'envole au-dessus de la pièce. Renvoie la position de l'étoile à l'écran (pour la faire voler plus loin).
  ramasser(sq) {
    const d = this.caseEl(sq).querySelector('.deco.etoile');
    const r = this.caseEl(sq).getBoundingClientRect();
    if (d) { d.dataset.k = 'x'; d.remove(); }
    this.eclat(sq, 'etoiles-eclat', 7);
    return r;
  }

  choisir(sq) { this.choix = sq; this.marques(); }

  montrerIndice(m) { this.indice = m; this.racine.dataset.indice = m.de + '-' + m.vers; this.choix = null; this.marques(); }
  oublierIndice() { this.indice = null; this.marques(); }

  // Montre où une pièce peut aller, sans pouvoir jouer (pendant une explication).
  demontrer(sq) { this.choix = sq; this.marques(); }

  refuser(de, vers) {
    const el = this.elems.get(de);
    if (el) { el.classList.remove('non'); void el.offsetWidth; el.classList.add('non'); }
    const c = this.caseEl(vers);
    c.classList.remove('refus'); void c.offsetWidth; c.classList.add('refus');
  }

  // ---------- Toucher et glisser ----------
  sqDe(ev) {
    const r = this.cases.getBoundingClientRect();
    const f = Math.floor(((ev.clientX - r.left) / r.width) * 8), ry = Math.floor(((ev.clientY - r.top) / r.height) * 8);
    if (f < 0 || f > 7 || ry < 0 || ry > 7) return null;
    return (7 - ry) * 8 + f;
  }

  essayer(de, vers) {
    const coups = this.coupsPossibles(de).filter(m => m.vers === vers);
    const cible = this.pos?.b[vers], moi = this.pos?.b[de];
    if (!coups.length && moi && (!cible || couleur(cible) !== couleur(moi)) && !coupsBruts(this.pos, de).some(m => m.vers === vers)) {
      // La pièce ne va pas comme ça, ou une pièce bloque le chemin.
      this.refuser(de, vers);
      this.surRefus(de, vers, geometrieOk(type(moi), couleur(moi), de, vers) ? 'chemin-bloque' : 'pas-comme-ca-' + type(moi));
      return 'refus';
    }
    if (!coups.length) {
      // Le coup existe pour la pièce, mais les règles l'interdisent (le roi serait en échec).
      if (this.pos && coupsBruts(this.pos, de).some(m => m.vers === vers)) {
        this.refuser(de, vers);
        this.surRefus(de, vers, enEchec(this.pos) ? 'reste-en-echec' : 'roi-en-danger');
        return 'refus';
      }
      return false;
    }
    const m = coups.find(c => !c.promo || type(c.promo) === 'q') || coups[0];
    this.choix = null;
    this.surCoup(m);
    return true;
  }

  ecouter() {
    let tirage = null;
    const r = this.racine;
    r.addEventListener('pointerdown', ev => {
      if (!this.interactif || ev.button > 0) return;
      const sq = this.sqDe(ev);
      if (sq == null) return;
      ev.preventDefault();
      if (this.choix != null && this.choix !== sq) {
        const res = this.essayer(this.choix, sq);
        if (res === true) return;
        if (res === 'refus') return;
      }
      if (this.coupsPossibles(sq).length) {
        const dejaChoisie = this.choix === sq;
        this.choisir(sq);
        const el = this.elems.get(sq);
        tirage = { sq, el, x0: ev.clientX, y0: ev.clientY, bouge: false, dejaChoisie };
        r.setPointerCapture(ev.pointerId);
      } else if (this.pos?.b[sq] && couleur(this.pos.b[sq]) === this.pos.trait && this.interactif) {
        // Une pièce qui ne peut pas bouger : elle tremble un peu.
        this.refuser(sq, sq);
        this.choix = null; this.marques();
      } else if (this.choix != null) {
        this.choix = null; this.marques();
      }
    });
    r.addEventListener('pointermove', ev => {
      if (!tirage || !tirage.el) return;
      const dx = ev.clientX - tirage.x0, dy = ev.clientY - tirage.y0;
      if (!tirage.bouge && Math.hypot(dx, dy) < 8) return;
      tirage.bouge = true;
      const t = this.cases.getBoundingClientRect().width / 8;
      tirage.el.classList.add('tiree');
      tirage.el.style.transform = `translate(${x(tirage.sq) * t + dx}px, ${y(tirage.sq) * t + dy - t * 0.3}px)`;
    });
    const lacher = ev => {
      if (!tirage) return;
      const t = tirage; tirage = null;
      t.el?.classList.remove('tiree', 'levee');
      if (!t.bouge) {
        if (t.dejaChoisie) { this.choix = null; this.marques(); }
        return;
      }
      const vers = this.sqDe(ev);
      if (vers != null && vers !== t.sq && this.essayer(t.sq, vers) === true) return;
      if (t.el) this.placer(t.el, t.sq);
      this.marques();
    };
    r.addEventListener('pointerup', lacher);
    r.addEventListener('pointercancel', lacher);
  }
}
