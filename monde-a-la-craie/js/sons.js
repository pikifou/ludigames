// Petits sons de classe, fabriqués par le navigateur (pas de fichiers) : craie qui crisse, juste, raté, effacer, tampon.
// Et la musique du voyage de Nina. La musique et les bruitages se règlent à part (le réglage du son de Ludiworld : js/reglage-son.js).
let ctx = null, bruitages = true, musiqueOui = true;

export function reglerSons(r) { bruitages = !!r.bruitages; musiqueOui = !!r.musique; majMusique(); }

function audio() {
  if (!ctx) {
    const A = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function bruit(a, duree, frequence, volume, glisse = 0) {
  const n = Math.floor(a.sampleRate * duree), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 90));
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(frequence, a.currentTime);
  if (glisse) f.frequency.linearRampToValueAtTime(frequence + glisse, a.currentTime + duree);
  const g = a.createGain();
  g.gain.setValueAtTime(0, a.currentTime);
  g.gain.linearRampToValueAtTime(volume, a.currentTime + 0.02);
  g.gain.linearRampToValueAtTime(0, a.currentTime + duree);
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

function note(a, freq, debut, duree, volume, type = 'triangle') {
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + debut;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duree);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + duree + 0.05);
}

export function son(nom) {
  if (!bruitages) return;
  globalThis.__sonsJoues?.push(nom); // pour les tests : les sons joués
  const a = audio();
  if (!a) return;
  try {
    if (nom === 'craie') bruit(a, 0.28, 3800, 0.05, 900);
    else if (nom === 'juste') { note(a, 660, 0, 0.18, 0.12); note(a, 990, 0.09, 0.3, 0.1); }
    else if (nom === 'faux') note(a, 196, 0, 0.35, 0.12, 'sine');
    else if (nom === 'effacer') bruit(a, 0.7, 900, 0.06, -500);
    else if (nom === 'fin') [523, 659, 784, 1047].forEach((f, i) => note(a, f, i * 0.11, 0.35, 0.09));
    else if (nom === 'tampon') { bruit(a, 0.12, 320, 0.22); note(a, 110, 0, 0.2, 0.2, 'sine'); }   // un tampon frappé dans le carnet
  } catch { /* pas de son : tant pis */ }
}

// ---------- La musique ----------
// Une musique par écran : « voyage » sur la carte du monde et l'histoire de Nina, « manche » pendant une manche,
// « decouvrir » quand on explore. Elle tourne en boucle sans couture : la fin du morceau se fond dans son début.
// Elle se coupe avec le réglage « Musique », quand le jeu est caché, et pendant la pause de Ludiworld.
const VOLUME_MUSIQUE = 0.5, FONDU = 2.5, RACCORD = 4;
let voulue = null, enPause = false, courante = null;
const tampons = new Map();

function charger(nom) {
  if (!tampons.has(nom)) {
    const a = audio();
    tampons.set(nom, fetch(`musique/${nom}.mp3`).then(r => r.arrayBuffer()).then(b => a.decodeAudioData(b)).then(bouclable)
      .catch(() => { tampons.delete(nom); return null; }));
  }
  return tampons.get(nom);
}

// Le morceau sans ses RACCORD premières secondes, et sa fin fondue avec elles : la boucle ne s'entend pas.
function bouclable(buf) {
  const a = audio(), x = Math.min(Math.floor(RACCORD * buf.sampleRate), Math.floor(buf.length / 4));
  const n = buf.length - x, out = a.createBuffer(buf.numberOfChannels, n, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c), dst = out.getChannelData(c);
    dst.set(src.subarray(x));
    for (let i = 0; i < x; i++) {
      const t = i / x, k = n - x + i;
      dst[k] = src[x + k] * Math.cos(t * Math.PI / 2) + src[i] * Math.sin(t * Math.PI / 2);
    }
  }
  return out;
}

function eteindre(m) {
  if (!m) return;
  const a = audio(), t = a.currentTime;
  m.gain.gain.cancelScheduledValues(t);
  m.gain.gain.setValueAtTime(m.gain.gain.value, t);
  m.gain.gain.linearRampToValueAtTime(0, t + FONDU);
  setTimeout(() => { try { m.src.stop(); } catch { /* déjà arrêtée */ } }, FONDU * 1000 + 100);
}

function majMusique() {
  const jouer = musiqueOui && !enPause && voulue && !globalThis.document?.hidden;
  if (!jouer) { eteindre(courante); courante = null; return; }
  if (courante?.nom === voulue) return;
  const nom = voulue, a = audio();
  if (!a) return;
  charger(nom).then(buf => {
    if (!buf || voulue !== nom || !musiqueOui || enPause || courante?.nom === nom) return;
    eteindre(courante);
    const src = a.createBufferSource(), gain = a.createGain();
    src.buffer = buf; src.loop = true;
    gain.gain.setValueAtTime(0, a.currentTime);
    gain.gain.linearRampToValueAtTime(VOLUME_MUSIQUE, a.currentTime + FONDU);
    src.connect(gain).connect(a.destination);
    src.start();
    courante = { nom, src, gain };
  });
}

// La musique à entendre : 'voyage', 'manche' ou 'decouvrir'.
export function musique(nom) { voulue = nom; majMusique(); }
export function pauseMusique(oui) { enPause = oui; majMusique(); }
globalThis.document?.addEventListener('visibilitychange', majMusique);
// Le navigateur n'autorise le son qu'après un geste : au premier toucher, on relance.
globalThis.addEventListener?.('pointerdown', () => { if ((musiqueOui || bruitages) && ctx?.state === 'suspended') ctx.resume(); });
// Pour les tests : la musique qu'on entend en ce moment (ou null).
globalThis.__musique = () => courante?.nom ?? null;
