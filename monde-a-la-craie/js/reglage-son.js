// Le son, réglé par Ludiworld pour toute la maison (kit 0.5) : la musique, les bruitages et la voix qui lit les noms,
// trois réglages séparés, tous allumés au départ. Le jeu ne les garde plus dans sa progression.
// Les interrupteurs du jeu (Réglages de l'accueil, pause d'une manche) changent le réglage de tout Ludiworld
// (ouvert seul, celui de cet appareil).
import { reglerSons, son } from './sons.js';
import { t } from './textes.js';

let reglage = { musique: true, bruitages: true, voix: true };
const Ludi = () => globalThis.Ludi;

export const reglageSon = () => ({ ...reglage });
export const voixActive = () => reglage.voix;

// Le réglage change (Ludiworld, ou un interrupteur du jeu) : on l'applique partout.
function appliquer(s) {
  reglage = { musique: !!s.musique, bruitages: !!s.bruitages, voix: !!s.voix };
  reglerSons(reglage);
  if (!reglage.voix) globalThis.speechSynthesis?.cancel();
  document.documentElement.classList.toggle('sans-voix', !reglage.voix);
  document.querySelectorAll('input[data-son]').forEach(i => { i.checked = reglage[i.dataset.son]; });
}

export function changerSon(k, oui) {
  let fait = null;
  try { fait = Ludi()?.reglerSon({ [k]: oui }); } catch { /* sans kit */ }
  if (!fait) appliquer({ ...reglage, [k]: oui });   // sans le kit : le réglage vit le temps de la page
  if (k === 'bruitages' && oui) son('juste');
}

// Les trois interrupteurs, à mettre dans un panneau. voixOk : faux si l'appareil n'a pas de voix.
export function interrupteursSon(voixOk) {
  const ligne = (k, extra = '') => `<label class="interrupteur${k === 'voix' && !voixOk ? ' grise' : ''}">
    <input type="checkbox" data-son="${k}" ${reglage[k] ? 'checked' : ''} ${k === 'voix' && !voixOk ? 'disabled' : ''}><span>${t(k)}${extra}</span></label>`;
  return ligne('musique') + ligne('bruitages') + ligne('voix', voixOk ? '' : `<small>${t('pasDeVoix')}</small>`);
}

// À appeler une fois, après Ludi.init : le réglage arrive tout de suite, puis à chaque changement.
export function brancherSon() {
  let branche = false;
  try { const L = Ludi(); if (L?.onSon) { L.onSon(appliquer); branche = true; } } catch { /* sans kit */ }
  if (!branche) appliquer(reglage);
  document.addEventListener('change', e => {
    const k = e.target.dataset?.son;
    if (k) changerSon(k, e.target.checked);
  });
  // Pour les tests : le réglage du son en ce moment.
  globalThis.__son = () => ({ ...reglage });
}
