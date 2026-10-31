"""Tests dans le navigateur (Playwright) : python tests/navigateur.py [carte|ecrans|appli]

Lance un petit serveur sur le port 7360 à la racine de ludigames (jamais 8000).
"""
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = 7360
BASE = f'http://localhost:{PORT}'
CAPTURES = RACINE / 'tests' / 'captures'
ZONES = ['europe', 'afrique', 'asie', 'amerique-nord', 'amerique-sud', 'oceanie', 'monde']
echecs = []


def verifier(cond, message):
    print(('  ok  ' if cond else '  ÉCHEC  ') + message)
    if not cond:
        echecs.append(message)


def serveur():
    p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=RACINE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE + '/package.json', timeout=1)
            return p
        except Exception:
            time.sleep(0.1)
    raise RuntimeError('le serveur de test ne démarre pas')


def page_carte(navigateur, zone, w, h):
    page = navigateur.new_page(viewport={'width': w, 'height': h})
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
    page.goto(f'{BASE}/tests/carte.html?zone={zone}')
    page.wait_for_function('window.pret === true', timeout=15000)
    return page, erreurs


# Pour chaque pays interrogé de la zone : son point d'ancre est dans la partie visible de la carte.
ANCRES_HORS_CADRE = """(zone) => {
  const v = carte.zoneVisible;
  return monde.filter(f => f.properties.quiz && (zone === 'monde' || f.properties.zone === zone))
    .filter(f => { const [x, y] = carte.ancreEcran(f.properties.code); return !(x >= v.x0 - 2 && x <= v.x1 + 2 && y >= v.y0 - 2 && y <= v.y1 + 2); })
    .map(f => f.properties.code);
}"""


def test_carte(nav):
    print('carte')
    CAPTURES.mkdir(exist_ok=True)
    for zone in ZONES:
        for (w, h) in [(1280, 800), (360, 640)]:
            page, erreurs = page_carte(nav, zone, w, h)
            hors = page.evaluate(ANCRES_HORS_CADRE, zone)
            verifier(not hors, f'{zone} {w}×{h} : tous les pays de la zone sont visibles {hors if hors else ""}')
            verifier(not erreurs, f'{zone} {w}×{h} : aucune erreur {erreurs[:2] if erreurs else ""}')
            if w == 1280:
                page.screenshot(path=str(CAPTURES / f'carte-{zone}.png'))
            page.close()

    page, _ = page_carte(nav, 'europe', 1280, 800)
    fr = page.evaluate("carte.ancreEcran('FR')")
    page.mouse.click(fr[0], fr[1])
    verifier(page.evaluate('taps') == ['FR'], f"un toucher sur la France donne FR ({page.evaluate('taps')})")

    page.evaluate('taps.length = 0')
    page.mouse.move(fr[0], fr[1])
    page.mouse.down()
    for i in range(1, 8):
        page.mouse.move(fr[0] + i * 10, fr[1] + i * 4)
    page.mouse.up()
    verifier(page.evaluate('taps') == [], "un glisser qui finit sur un pays n'est pas un toucher")

    page.evaluate('carte.vueEntiere(); taps.length = 0')
    k0 = page.evaluate('carte.zoom')
    page.evaluate("""([x, y]) => {
      const svg = document.querySelector('svg');
      const ev = (type, id, px, py) => svg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: px, clientY: py, bubbles: true }));
      ev('pointerdown', 1, x - 20, y); ev('pointerdown', 2, x + 20, y);
      for (let i = 1; i <= 6; i++) { ev('pointermove', 1, x - 20 - i * 10, y); ev('pointermove', 2, x + 20 + i * 10, y); }
      ev('pointerup', 1, x - 80, y); ev('pointerup', 2, x + 80, y);
    }""", fr)
    verifier(page.evaluate('taps') == [], "un pincement n'est pas un toucher")
    verifier(page.evaluate('carte.zoom') > k0 * 1.5, f"un pincement zoome ({k0} → {page.evaluate('carte.zoom')})")

    page.evaluate('carte.vueEntiere(); taps.length = 0')
    page.set_viewport_size({'width': 800, 'height': 1280})
    page.wait_for_timeout(400)
    v = page.evaluate('carte.zoneVisible')
    verifier(v['x1'] <= 800 and v['y1'] > 900, f'après rotation, la carte se recadre ({v})')
    hors = page.evaluate(ANCRES_HORS_CADRE, 'europe')
    verifier(not hors, f'après rotation, tous les pays restent visibles {hors}')
    fr = page.evaluate("carte.ancreEcran('FR')")
    page.mouse.click(fr[0], fr[1])
    verifier(page.evaluate('taps') == ['FR'], f"après rotation, toucher la France donne FR ({page.evaluate('taps')})")

    va = page.evaluate("carte.ancreEcran('VA')")
    page.evaluate('taps.length = 0')
    page.mouse.click(va[0] + 3, va[1])
    verifier(page.evaluate('taps') == ['VA'], f"toucher le rond du Vatican donne VA ({page.evaluate('taps')})")
    page.close()


SECTIONS = {'carte': test_carte}

if __name__ == '__main__':
    voulues = sys.argv[1:] or list(SECTIONS)
    srv = serveur()
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch()
            for s in voulues:
                SECTIONS[s](nav)
            nav.close()
    finally:
        srv.terminate()
    print(f'\n{len(echecs)} échec(s)' if echecs else '\ntout est bon')
    sys.exit(1 if echecs else 0)
