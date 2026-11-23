// Le son, réglé par Ludiworld pour toute la maison (kit 0.5) : la musique, les bruitages et la voix qui lit les textes,
// trois réglages séparés, tous allumés au départ. Le jeu ne garde plus de réglage à lui.
// Le haut-parleur du jeu ouvre un petit panneau à trois interrupteurs : chacun change le réglage de tout Ludiworld
// (ouvert seul, celui de cet appareil). Coupé, un interrupteur est barré et vide : pas seulement une couleur.
import { reglerSons, son } from './sons.js';

let reglage = { musique: true, bruitages: true, voix: true };
const Ludi = () => globalThis.Ludi;

const PARTIES = [
  { k: 'musique', nom: 'Musique', icone: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>' },
  { k: 'bruitages', nom: 'Bruitages', icone: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>' },
  { k: 'voix', nom: 'Voix', icone: '<path d="M4 5h16v11H10l-4 4v-4H4z"/><path d="M8 9h8M8 12.5h5"/>' },
];

const HAUT_PARLEUR = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ondes" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>';
const tousCoupes = () => !reglage.musique && !reglage.bruitages && !reglage.voix;

// Le bouton haut-parleur, à mettre dans le haut de chaque écran.
export const boutonSon = () =>
  `<button class="rond son ${tousCoupes() ? 'coupe' : ''}" data-act="son" aria-label="Le son" aria-expanded="false">${HAUT_PARLEUR}</button>`;

export const voixActive = () => reglage.voix;

// Le réglage change (Ludiworld, ou un interrupteur du jeu) : on l'applique partout.
function appliquer(s) {
  reglage = { musique: !!s.musique, bruitages: !!s.bruitages, voix: !!s.voix };
  reglerSons(reglage);
  if (!reglage.voix) globalThis.speechSynthesis?.cancel();
  document.querySelectorAll('.rond.son').forEach(b => b.classList.toggle('coupe', tousCoupes()));
  document.querySelectorAll('.panneau-son [data-son]').forEach(b => b.setAttribute('aria-pressed', String(reglage[b.dataset.son])));
}

function changer(k) {
  const oui = !reglage[k];
  let fait = null;
  try { fait = Ludi()?.reglerSon({ [k]: oui }); } catch { /* sans kit */ }
  if (!fait) appliquer({ ...reglage, [k]: oui });   // sans le kit : le réglage vit le temps de la page
  if (k === 'bruitages' && oui) son('juste');
}

function fermer() {
  document.querySelectorAll('.panneau-son').forEach(p => p.remove());
  document.querySelectorAll('[data-act=son]').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

function ouvrir(bouton) {
  fermer();
  const p = document.createElement('div');
  p.className = 'panneau-son';
  p.setAttribute('role', 'group');
  p.setAttribute('aria-label', 'Le son');
  p.innerHTML = PARTIES.map(x => `<button class="interrupteur-son" data-son="${x.k}" aria-pressed="${reglage[x.k]}">
    <span class="pastille"><svg viewBox="0 0 24 24" aria-hidden="true">${x.icone}</svg></span><b>${x.nom}</b></button>`).join('');
  bouton.parentElement.appendChild(p);
  bouton.setAttribute('aria-expanded', 'true');
}

// À appeler une fois, après Ludi.init : le réglage arrive tout de suite, puis à chaque changement.
export function brancherSon() {
  let branche = false;
  try { const L = Ludi(); if (L?.onSon) { L.onSon(appliquer); branche = true; } } catch { /* sans kit */ }
  if (!branche) appliquer(reglage);
  document.addEventListener('click', ev => {
    const b = ev.target.closest?.('[data-act=son], .panneau-son [data-son]');
    if (!b) { if (!ev.target.closest?.('.panneau-son')) fermer(); return; }
    if (b.dataset.son) changer(b.dataset.son);
    else if (b.parentElement.querySelector('.panneau-son')) fermer();
    else ouvrir(b);
  });
  // Pour les tests : le réglage du son en ce moment.
  globalThis.__son = () => ({ ...reglage });
}
