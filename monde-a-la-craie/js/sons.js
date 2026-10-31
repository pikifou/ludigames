// Petits sons de classe, fabriqués par le navigateur (pas de fichiers) : craie qui crisse, juste, raté, effacer.
let ctx = null, actif = true;

export function sonActif(oui) { actif = oui; }

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
  if (!actif) return;
  const a = audio();
  if (!a) return;
  try {
    if (nom === 'craie') bruit(a, 0.28, 3800, 0.05, 900);
    else if (nom === 'juste') { note(a, 660, 0, 0.18, 0.12); note(a, 990, 0.09, 0.3, 0.1); }
    else if (nom === 'faux') note(a, 196, 0, 0.35, 0.12, 'sine');
    else if (nom === 'effacer') bruit(a, 0.7, 900, 0.06, -500);
    else if (nom === 'fin') [523, 659, 784, 1047].forEach((f, i) => note(a, f, i * 0.11, 0.35, 0.09));
  } catch { /* pas de son : tant pis */ }
}
