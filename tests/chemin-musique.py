"""La musique des saisons du Chemin du Roi : python tests/chemin-musique.py

Muette au départ, la bonne saison selon le lieu, coupée par le haut-parleur et quand le jeu est caché (la pause de Ludiworld : chemin-kit.py).
Serveur sur le port 7364 (jamais 8000).
"""
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = 7364
JEU = f'http://localhost:{PORT}/chemin-du-roi/'
echecs = []


def verifier(cond, message):
    print(('  ok  ' if cond else '  ÉCHEC  ') + message)
    if not cond:
        echecs.append(message)


def entendue(page, voulue, attente=6000):
    for _ in range(attente // 100):
        if page.evaluate('__musique()') == voulue:
            return True
        page.wait_for_timeout(100)
    return False


p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=RACINE,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        urllib.request.urlopen(JEU, timeout=1)
        break
    except Exception:
        time.sleep(0.1)
try:
    with sync_playwright() as pw:
        nav = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        page = nav.new_page(viewport={'width': 390, 'height': 844})
        erreurs = []
        page.on('pageerror', lambda e: erreurs.append(str(e)))
        page.goto(JEU + '?chemin')
        page.wait_for_timeout(1500)
        verifier(page.evaluate('__musique()') is None, 'muet au départ : aucune musique')
        page.locator('[data-act=voix]').click(force=True)
        verifier(entendue(page, 'automne'), 'avec le son : la musique d\'automne sur le chemin du début')
        page.locator('[data-act=voix]').click(force=True)
        verifier(entendue(page, None), 'le haut-parleur coupe la musique')
        page.locator('[data-act=voix]').click(force=True)
        verifier(entendue(page, 'automne'), 'et la remet')
        for lecon, saison in [('croquer', 'hiver'), ('donner', 'printemps'), ('tour', 'automne')]:
            page.goto(JEU + '?lecon=' + lecon)
            page.mouse.click(5, 5)
            verifier(entendue(page, saison), f'leçon {lecon} : {saison}')
        page.goto(JEU + '?amis')
        page.mouse.click(5, 5)
        verifier(entendue(page, 'ete'), 'les parties avec les amis : l\'été')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        verifier(entendue(page, None), 'jeu caché : la musique s\'arrête')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        verifier(entendue(page, 'ete'), 'jeu revenu : elle reprend')
        verifier(not erreurs, f'aucune erreur ({erreurs[:3]})')
        nav.close()
finally:
    p.terminate()

print('\n' + ('TOUT EST BON' if not echecs else f'{len(echecs)} ÉCHEC(S)'))
sys.exit(1 if echecs else 0)
