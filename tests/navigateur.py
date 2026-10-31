"""Tests dans le navigateur (Playwright) : python tests/navigateur.py [carte|ecrans|appli]

Lance un petit serveur sur le port 7360 à la racine de ludigames (jamais 8000).
"""
import pathlib
import re
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


TOUCHER_ANCRES = """(zone) => {
  const r = document.querySelector('svg').getBoundingClientRect();
  return monde.filter(f => f.properties.quiz && (zone === 'monde' || f.properties.zone === zone)).map(f => {
    const c = f.properties.code, [x, y] = carte.ancreEcran(c), obtenu = carte.paysEn(x - r.left, y - r.top);
    return obtenu === c ? null : c + '->' + obtenu;
  }).filter(Boolean);
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
            if w == 1280 and zone != 'monde':   # le monde entier est trop serré : on zoome pour viser
                rates = page.evaluate(TOUCHER_ANCRES, zone)
                verifier(not rates, f"{zone} : toucher chaque pays là où son nom s'écrit donne ce pays {rates}")
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


JEU = f'{BASE}/monde-a-la-craie/?graine=1&vite=1'


def ouvrir_jeu(nav, w=1280, h=800, init=None):
    page = nav.new_page(viewport={'width': w, 'height': h}, locale='fr-FR')
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
    if init:
        page.add_init_script(init)
    page.goto(JEU)
    page.wait_for_function('window.jeu && window.jeu.pret', timeout=15000)
    return page, erreurs


def toucher(page, code):
    x, y = page.evaluate('c => jeu.carte.ancreEcran(c)', code)
    page.mouse.click(x, y)
    page.wait_for_timeout(60)


def lancer(page, zone, action='jouer'):
    page.click(f'[data-zone="{zone}"]')
    page.click(f'[data-action="{action}"]')
    page.wait_for_function('window.jeu.carte && window.jeu.carte.zone.id === ' + repr(zone))


def finir_manche(page):
    vus = []
    while not page.evaluate('jeu.manche.finie'):
        q = page.evaluate('jeu.manche.question')
        vus.append(q)
        toucher(page, q)
    return vus


def test_ecrans(nav):
    print('écrans')
    CAPTURES.mkdir(exist_ok=True)

    page, erreurs = ouvrir_jeu(nav)
    page.screenshot(path=str(CAPTURES / 'accueil-tablette.png'))
    lancer(page, 'europe')
    page.screenshot(path=str(CAPTURES / 'partie-tablette.png'))
    finir_manche(page)
    page.wait_for_selector('.fin', timeout=3000)
    fin = page.inner_text('.fin')
    verifier('12' in fin and re.search(r'\d\s?s', fin) is not None, f'une manche complète finit au tableau ({fin!r})')
    page.screenshot(path=str(CAPTURES / 'fin-tablette.png'))
    verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
    page.close()

    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'europe')
    q = page.evaluate('jeu.manche.question')
    autre = page.evaluate("""q => jeu.app.monde.find(f => f.properties.quiz && f.properties.zone === 'europe'
        && f.properties.code !== q && f.properties.rang < 15).properties.code""", q)
    toucher(page, autre)
    verifier('erreur' in (page.get_attribute(f'path[data-code="{autre}"]', 'class') or ''), f'erreur : croix sur le pays touché ({autre})')
    verifier(page.locator('.croix').count() == 1, 'erreur : une croix dessinée')
    verifier(page.locator('.entoure').count() == 1, 'erreur : le bon pays est entouré')
    page.screenshot(path=str(CAPTURES / 'erreur-tablette.png'))
    avant = page.inner_text('#compteur')
    toucher(page, q)
    verifier(page.inner_text('#compteur') == avant and page.evaluate('jeu.manche.question') != q,
             "un toucher pendant l'animation d'erreur est ignoré")
    page.wait_for_timeout(1600)
    vus = finir_manche(page)
    verifier(q in vus, f'le pays raté revient avant la fin ({q})')
    verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
    page.close()

    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'amerique-nord', 'decouvrir')
    toucher(page, 'GL')
    verifier(page.inner_text('#nom').strip() == 'Groenland (Danemark)', f"Découvrir : {page.inner_text('#nom')!r}")
    page.screenshot(path=str(CAPTURES / 'decouvrir-tablette.png'))
    page.close()

    page, erreurs = ouvrir_jeu(nav, 360, 640)
    page.screenshot(path=str(CAPTURES / 'accueil-portrait.png'))
    lancer(page, 'afrique')
    page.evaluate("jeu.ecrireNom('République démocratique du Congo')")
    page.wait_for_timeout(700)
    boite = page.locator('#nom').bounding_box()
    lignes = page.evaluate("""() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('#nom'));
      return new Set([...r.getClientRects()].map(x => Math.round(x.top))).size; }""")
    v = page.evaluate('jeu.carte.zoneVisible')
    verifier(lignes <= 2, f'portrait : le nom le plus long tient en 2 lignes ({lignes})')
    verifier(boite['y'] + boite['height'] <= v['y0'] + 1, f'portrait : le nom ne couvre pas la carte ({boite} / {v})')
    page.screenshot(path=str(CAPTURES / 'partie-portrait.png'))
    verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
    page.close()

    for (nom, w, h) in [('paysage-telephone', 800, 360), ('ordinateur', 1440, 900)]:
        page, erreurs = ouvrir_jeu(nav, w, h)
        page.screenshot(path=str(CAPTURES / f'accueil-{nom}.png'))
        lancer(page, 'asie')
        page.screenshot(path=str(CAPTURES / f'partie-{nom}.png'))
        verifier(not erreurs, f'{nom} : aucune erreur ({erreurs[:2]})')
        page.close()

    compter = "window.__dits = 0; if (window.speechSynthesis) { const s = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.__dits++; }; }"
    page, erreurs = ouvrir_jeu(nav, init=compter)
    lancer(page, 'europe')
    for _ in range(3):
        toucher(page, page.evaluate('jeu.manche.question'))
    verifier(page.evaluate('window.__dits') == 0, 'voix coupée par défaut : rien n\'est lu')
    page.close()

    bloque = "Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqué'); } });"
    page, erreurs = ouvrir_jeu(nav, init=bloque)
    lancer(page, 'europe')
    finir_manche(page)
    page.wait_for_selector('.fin', timeout=3000)
    verifier(True, 'stockage bloqué : une manche se joue jusqu\'au bout')
    verifier(not erreurs, f'stockage bloqué : aucune erreur ({erreurs[:2]})')
    page.close()


SECTIONS = {'carte': test_carte, 'ecrans': test_ecrans}

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
