"""Le Chemin du Roi dans un cadre, comme dans Ludiworld : python tests/chemin-kit.py

Bonjour au launcher, fin douce (plus de « leçon suivante »), point d'arrêt, progression, notion, pause.
Serveur sur le port 7363 (jamais 8000).
"""
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = 7363
JEU = f'http://localhost:{PORT}/chemin-du-roi/'
echecs = []


def verifier(cond, message):
    print(('  ok  ' if cond else '  ÉCHEC  ') + message)
    if not cond:
        echecs.append(message)


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
        nav = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'])
        page = nav.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page.add_init_script("if (window.speechSynthesis) window.speechSynthesis.speak = () => {};")
        page.goto(f'http://localhost:{PORT}/package.json')
        page.set_content(f'''<html><body style="margin:0"><script>window.messages=[];addEventListener('message',e=>messages.push(e.data));</script>
          <iframe id="jeu" style="width:390px;height:844px;border:0" src="{JEU}?lecon=en-passant"></iframe></body></html>''')
        cadre = page.frame_locator('#jeu')
        cadre.locator('.bulle').wait_for()
        verifier(page.evaluate("messages.some(m => m.type === 'ludi:hello' && m.game === 'chemin-du-roi')"), 'le jeu dit bonjour au launcher')
        page.evaluate("document.getElementById('jeu').contentWindow.postMessage({type: 'ludi:wrapup', minutes: 0}, location.origin)")
        for _ in range(3):
            cadre.locator('.suite').click(force=True)
            page.wait_for_timeout(250)
        # Le coup secret : e5 prend d6 en passant.
        r = cadre.locator('.cases').bounding_box()
        t = r['width'] / 8
        page.mouse.click(r['x'] + 4.5 * t, r['y'] + 3.5 * t)
        page.mouse.click(r['x'] + 3.5 * t, r['y'] + 2.5 * t)
        page.wait_for_timeout(1500)
        cadre.locator('.suite').click(force=True)  # bravo
        page.wait_for_timeout(400)
        cadre.locator('.suite').click(force=True)  # le dernier conseil de Barnabé
        cadre.locator('.fete .actions button').first.wait_for(timeout=15000)
        boutons = cadre.locator('.fete .actions button').all_inner_texts()
        verifier(boutons == ['Le chemin'], f'temps fini : la fête ne propose pas la leçon suivante ({boutons})')
        data = cadre.locator('body').evaluate('() => Ludi.data()')
        evts = data.get('events', [])
        verifier(any(e.get('kind') == 'checkpoint' and e.get('label') == 'fin-de-lecon' for e in evts), 'point d\'arrêt en fin de leçon')
        verifier(data.get('progress', {}).get('lecons', {}).get('value') == 1, 'progression : une leçon finie')
        verifier(any(e.get('kind') == 'skill' and e.get('domain') == 'logique.puzzle' for e in evts), 'une notion enregistrée (logique.puzzle)')
        verifier(page.evaluate("messages.some(m => m.type === 'ludi:event')"), 'les événements partent vers le launcher')
        jeu = page.frame(url=lambda u: 'chemin-du-roi' in u)
        for _ in range(60):
            if jeu.evaluate('__musique()'):
                break
            page.wait_for_timeout(100)
        verifier(jeu.evaluate('__musique()') == 'ete', "sans rien régler, la musique de l'été joue (le coup secret est à la tour)")
        page.evaluate("document.getElementById('jeu').contentWindow.postMessage({type: 'ludi:pause'}, location.origin)")
        page.wait_for_timeout(300)
        verifier(jeu.evaluate('__musique()') is None, 'la pause de Ludiworld arrête la musique')
        verifier(cadre.locator('.voile-pause').is_visible(), 'la pause de Ludiworld couvre le jeu')
        nav.close()
finally:
    p.terminate()

print('\n' + ('TOUT EST BON' if not echecs else f'{len(echecs)} ÉCHEC(S)'))
sys.exit(1 if echecs else 0)
