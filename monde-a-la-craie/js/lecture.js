// La lecture à voix haute (décisions de Ludiworld du 22 novembre) : l'enfant touche un texte (classe « lisible ») pour l'entendre.
// Le réglage « Lecture » dit si des textes se lisent aussi d'eux-mêmes : tous (all), les longs seulement, plus de 120 signes (some),
// aucun (none). Dans Ludiworld, il vient du kit (Ludi.reading) ; ouvert seul, ou tant que le kit ne l'a pas, celui du jeu,
// « none » au départ. La voix coupée (réglage « Voix ») fait taire toute lecture.
import { dire, voixDisponible } from './voix.js';
import { voixActive } from './reglage-son.js';
import { langue } from './textes.js';

const CLE = 'monde-a-la-craie.lecture';
export const NIVEAUX_LECTURE = ['none', 'some', 'all'];
const LONG = 120;
const Ludi = () => globalThis.Ludi;

// Ludiworld donne le réglage : le jeu n'a pas à le proposer.
export function lectureParLudiworld() {
  try { const L = Ludi(); return !!(L?.inLauncher?.() && typeof L.reading === 'function' && NIVEAUX_LECTURE.includes(L.reading())); } catch { return false; }
}

export function niveauLecture() {
  if (lectureParLudiworld()) return Ludi().reading();
  try { const l = localStorage.getItem(CLE); if (NIVEAUX_LECTURE.includes(l)) return l; } catch { /* stockage bloqué */ }
  return 'none';
}

export function choisirLecture(l) {
  if (!NIVEAUX_LECTURE.includes(l)) return;
  try { localStorage.setItem(CLE, l); } catch { /* stockage bloqué : le réglage ne tient pas */ }
}

const propre = s => (s || '').replace(/\s+/g, ' ').trim();

// Le texte d'un élément, sans ce qui ne se lit pas (emojis et dessins marqués aria-hidden).
export function texteDe(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('[aria-hidden="true"]').forEach(x => x.remove());
  return propre(c.textContent);
}

// Lire un texte maintenant (l'enfant l'a demandé).
export function lire(texte) {
  texte = propre(texte);
  if (texte && voixActive() && voixDisponible(langue)) dire(texte, langue);
}

// Un texte qui arrive à l'écran : lu de lui-même seulement si le réglage le veut.
export function lireAuto(texte) {
  texte = propre(texte);
  const n = niveauLecture();
  if (n === 'all' || (n === 'some' && texte.length > LONG)) lire(texte);
}

// À appeler une fois : un toucher sur un texte « lisible » le lit (data-lire : un autre texte à lire que celui affiché).
export function brancherLecture() {
  document.addEventListener('click', e => {
    const el = e.target.closest?.('.lisible');
    if (el) lire(el.dataset.lire || texteDe(el));
  });
  globalThis.__lecture = niveauLecture;   // pour les tests
}
