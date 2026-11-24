// L'histoire de Nina : le départ (au premier lancement), son arrivée sur chaque continent (le tampon de l'épreuve Facile,
// ADR-005) et le retour (quand le tour du monde est fait).
// Une petite vidéo si elle arrive (en ligne), puis l'image et le texte avec un bouton. « Passer » est toujours là.
// Sans vidéo (hors ligne, mouvement réduit, tests) : directement l'image et le texte.
import { t } from './textes.js';
import { zoneParId } from './zones.js';
import { lireAuto, texteDe } from './lecture.js';

const SCENES = {
  intro: { video: 'cine/intro.mp4', image: 'img/histoire/depart.webp', titre: null, l1: 'histoireIntro1', l2: 'histoireIntro2', go: 'histoireEnRoute', garderFin: true },
  fin: { video: 'cine/fin.mp4', image: 'img/histoire/retour.webp', titre: 'histoireFinTitre', l1: 'histoireFin1', l2: 'histoireFin2', go: 'histoireContinuer' },
  // Une grande image par continent, sans vidéo.
  etape: { video: null, image: z => `img/histoire/etape-${z}.webp`, titre: 'etapeTitre', l1: 'etape1', l2: 'etape2', go: 'etapeContinuer' },
};

export function histoire(nom, { sansVideo = false, zone = null, langue = 'fr' } = {}) {
  const c = SCENES[nom];
  const z = zone && zoneParId(zone), v = { z: z ? z[langue] : '' };
  const mouvementReduit = !!(globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  return new Promise(fini => {
    const box = document.createElement('div');
    box.className = 'cine';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = `<div class="cine-image"><img alt=""><video playsinline muted preload="auto"></video></div>
      <div class="cine-texte">
        ${c.titre ? `<p class="cine-titre craie lisible">${t(c.titre, v)}</p>` : ''}
        <p class="cine-l1 craie lisible">${t(c.l1, v)}</p><p class="cine-l2 lisible">${t(c.l2, v)}</p>
        <button class="bouton-craie plein" data-action="go">${t(c.go)}</button>
      </div>
      <button class="lien-craie cine-passer" data-action="passer">${t('histoirePasser')}</button>`;
    document.body.appendChild(box);
    window.jeu && (window.jeu.histoire = nom);
    const img = box.querySelector('img'), vid = box.querySelector('video');
    img.src = typeof c.image === 'function' ? c.image(zone) : c.image;
    img.onerror = () => { img.onerror = null; img.src = 'img/histoire/depart.webp'; };   // image du continent pas encore là
    // garderFin : la dernière image de la vidéo reste (Nina sur le chemin) ; sinon, on passe en fondu à l'image fixe.
    const texte = fondu => {
      if (box.classList.contains('texte')) return;
      vid.pause(); if (fondu) vid.classList.add('fondu');
      box.classList.add('texte');
      box.querySelector('[data-action="go"]').focus({ preventScroll: true });
      lireAuto([...box.querySelectorAll('.cine-texte .lisible')].map(texteDe).join(' '));
    };
    vid.onended = () => texte(!c.garderFin);
    vid.onerror = () => texte(true);
    if (c.video && !sansVideo && !mouvementReduit) {
      vid.src = c.video;
      box.classList.add('cache-image');   // l'image fixe ne se voit qu'après la vidéo (ou si elle ne vient pas)
      const p = vid.play();
      if (p && p.catch) p.catch(() => texte(true));
      setTimeout(() => { if (!vid.currentTime) texte(true); }, 4000);   // réseau trop lent : l'image et le texte sans attendre
    } else { vid.remove(); texte(true); }
    box.addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.action;
      if (a === 'passer') texte(true);
      if (a === 'go') {
        vid.pause(); vid.removeAttribute('src');
        globalThis.speechSynthesis?.cancel();
        box.remove();
        if (window.jeu) window.jeu.histoire = null;
        fini();
      }
    });
  });
}
