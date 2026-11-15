// Petits sons fabriqués par le navigateur (pas de fichiers) : pièce posée, prise, étoile, raté, victoire.
let ctx = null, actif = true;

export function sonActif(oui) { actif = oui; majMusique(); }

function audio() {
  if (!ctx) {
    const A = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function note(a, freq, debut, duree, volume, type = 'triangle') {
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + debut;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duree);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + duree + 0.05);
}

// Un « toc » de bois : bruit court filtré.
function toc(a, freq, volume) {
  const n = Math.floor(a.sampleRate * 0.06), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
  const g = a.createGain(); g.gain.value = volume;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export function son(nom) {
  if (!actif) return;
  const a = audio();
  if (!a) return;
  try {
    if (nom === 'pose') toc(a, 900, 0.9);
    else if (nom === 'prise') { toc(a, 600, 1); toc(a, 1400, 0.6); }
    else if (nom === 'etoile') { note(a, 880, 0, 0.15, 0.1); note(a, 1320, 0.07, 0.25, 0.08); }
    else if (nom === 'juste') { note(a, 660, 0, 0.18, 0.12); note(a, 990, 0.09, 0.3, 0.1); }
    else if (nom === 'faux') note(a, 196, 0, 0.35, 0.12, 'sine');
    else if (nom === 'echec') { note(a, 520, 0, 0.12, 0.1, 'square'); note(a, 520, 0.15, 0.12, 0.08, 'square'); }
    else if (nom === 'fin') [523, 659, 784, 1047].forEach((f, i) => note(a, f, i * 0.12, 0.4, 0.09));
    else if (nom === 'medaille') { [784, 988, 1175, 1568].forEach((f, i) => note(a, f, i * 0.09, 0.6, 0.08)); [2093, 2637].forEach((f, i) => note(a, f, 0.45 + i * 0.07, 0.5, 0.04, 'sine')); }
    else if (nom === 'debloque') { note(a, 523, 0, 0.12, 0.08); note(a, 784, 0.08, 0.12, 0.08); note(a, 1047, 0.16, 0.3, 0.08); }
    else if (nom === 'clic') toc(a, 1800, 0.35);
    else if (nom === 'pas') toc(a, 420, 0.5);
    else if (nom === 'compte') note(a, 1200 + Math.random() * 200, 0, 0.06, 0.05, 'square');
    else if (nom === 'refus') { note(a, 260, 0, 0.12, 0.08, 'sine'); note(a, 220, 0.1, 0.18, 0.08, 'sine'); }
    else if (nom === 'perdu') [392, 330, 262].forEach((f, i) => note(a, f, i * 0.16, 0.35, 0.08, 'sine'));
  } catch { /* pas de son, tant pis */ }
}

// ---------- La musique des saisons ----------
// Une musique par saison (automne, hiver, printemps, été), qui suit le chemin de Léo.
// Elle tourne en boucle sans couture : la fin du morceau se fond dans son début.
// Elle se coupe avec le haut-parleur, quand le jeu est caché, et pendant la pause de Ludiworld.
const VOLUME_MUSIQUE = 0.55, FONDU = 2.5, RACCORD = 4;
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
  const jouer = actif && !enPause && voulue && !globalThis.document?.hidden;
  if (!jouer) { eteindre(courante); courante = null; return; }
  if (courante?.nom === voulue) return;
  const nom = voulue, a = audio();
  if (!a) return;
  charger(nom).then(buf => {
    if (!buf || voulue !== nom || !actif || enPause || courante?.nom === nom) return;
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

// La saison à entendre : 'automne', 'hiver', 'printemps' ou 'ete'.
export function musique(nom) { voulue = nom; majMusique(); }
export function pauseMusique(oui) { enPause = oui; majMusique(); }
globalThis.document?.addEventListener('visibilitychange', majMusique);
// Le navigateur n'autorise le son qu'après un geste : au premier toucher, on relance.
globalThis.addEventListener?.('pointerdown', () => { if (actif && ctx?.state === 'suspended') ctx.resume(); });
// Pour les tests : la saison qu'on entend en ce moment (ou null).
globalThis.__musique = () => courante?.nom ?? null;
