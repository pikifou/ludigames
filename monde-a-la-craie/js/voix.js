// La voix qui lit les noms (le réglage « Voix » de Ludiworld) : seulement les voix installées sur l'appareil (jamais une voix en ligne).
const synth = globalThis.speechSynthesis;
let voix = [];

function chercher() { try { voix = synth ? synth.getVoices().filter(v => v.localService) : []; } catch { voix = []; } }
chercher();
if (synth && 'onvoiceschanged' in synth) synth.addEventListener('voiceschanged', chercher);

function voixPour(langue) { return voix.find(v => v.lang.toLowerCase().startsWith(langue)); }

export function voixDisponible(langue) { return !!(synth && voixPour(langue)); }

export function dire(texte, langue) {
  globalThis.__ditsJoues?.push(texte); // pour les tests : ce que la voix a eu à lire
  const v = voixPour(langue);
  if (!synth || !v) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.voice = v; u.lang = v.lang; u.rate = 0.9;
    synth.speak(u);
  } catch { /* la voix de l'appareil refuse : le jeu continue sans */ }
}
