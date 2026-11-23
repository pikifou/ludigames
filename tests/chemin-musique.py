"""Le son du Chemin du Roi : python tests/chemin-musique.py

Règle de la plateforme (23 novembre) : un jeu ne démarre jamais muet ; le son se règle dans Ludiworld en trois parties
(musique, bruitages, voix), et le bouton du jeu change le réglage de toute la maison.
Vérifie : tout allumé au départ (même avec une vieille sauvegarde « son coupé ») ; chaque interrupteur du haut-parleur
ne coupe que sa partie ; le réglage de Ludiworld (bonjour, message ludi:son) est suivi et le bouton du jeu le lui
envoie ; la bonne saison selon le lieu ; coupée quand le jeu est caché (la pause de Ludiworld : chemin-kit.py).
Serveur sur le port 7364 (jamais 8000).
"""
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = int(os.environ.get('PORT_TEST', 7364))  # PORT_TEST : un autre port si celui-ci est pris
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
        nav = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'])
        page = nav.new_page(viewport={'width': 390, 'height': 844})
        page.add_init_script("window.__sonsJoues = []; window.__ditsJoues = []; if (window.speechSynthesis) window.speechSynthesis.speak = () => {};")
        erreurs = []
        page.on('pageerror', lambda e: erreurs.append(str(e)))
        print('Le son au départ et ses trois réglages')
        # Une vieille sauvegarde qui avait coupé le son : le jeu ne reste pas muet.
        page.add_init_script("if (!sessionStorage.getItem('vieille')) { sessionStorage.setItem('vieille', 1); localStorage.setItem('chemin-du-roi.v1', JSON.stringify({ notes: {}, lecons: {}, amis: {}, medailles: {}, voix: false, son: false, histoire: true })); }")
        page.goto(JEU + '?chemin')
        page.mouse.click(3, 3)
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': True, 'voix': True}, 'au départ : musique, bruitages et voix allumés')
        verifier(entendue(page, 'automne'), 'au départ : la musique « automne » sur le chemin, sans rien régler')
        verifier('son' not in (page.evaluate("JSON.parse(localStorage.getItem('chemin-du-roi.v1'))") or {}), 'la sauvegarde ne garde plus de réglage de son')

        def interrupteur(nom):
            if not page.locator('.panneau-son').count():
                page.locator('[data-act=son]').first.evaluate('b => b.click()')
            page.locator(f'.panneau-son [data-son={nom}]').evaluate('b => b.click()')
            page.wait_for_timeout(150)

        def sons_joues():
            return page.evaluate('window.__sonsJoues.splice(0)')

        def toucher_lieu():
            page.mouse.click(3, 3)
            page.evaluate("document.querySelector('.lieu').click()")
            page.wait_for_timeout(300)

        interrupteur('musique')
        verifier(entendue(page, None), 'interrupteur Musique : la musique s\'arrête')
        verifier(page.evaluate('__son()') == {'musique': False, 'bruitages': True, 'voix': True}, '... et seulement elle')
        verifier(page.get_attribute('.panneau-son [data-son=musique]', 'aria-pressed') == 'false', '... l\'interrupteur se montre coupé')
        sons_joues()
        toucher_lieu()
        verifier(len(sons_joues()) > 0, 'musique coupée : les bruitages jouent toujours')
        page.goto(JEU + '?chemin')
        page.mouse.click(3, 3)
        page.wait_for_timeout(800)
        verifier(page.evaluate('__musique()') is None and page.evaluate('__son().musique') is False, 'le réglage reste en changeant d\'écran')
        interrupteur('musique')
        verifier(entendue(page, 'automne'), 'et l\'interrupteur la remet')
        interrupteur('bruitages')
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': False, 'voix': True}, 'interrupteur Bruitages : seulement les bruitages')
        page.goto(JEU + '?chemin')
        sons_joues()
        toucher_lieu()
        verifier(sons_joues() == [] and entendue(page, 'automne'), 'bruitages coupés : aucun bruitage, la musique continue')
        interrupteur('bruitages')
        interrupteur('voix')
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': True, 'voix': False}, 'interrupteur Voix : seulement la voix')
        page.goto(JEU + '?histoire')
        page.wait_for_timeout(600)
        verifier(page.evaluate('window.__ditsJoues') == [], 'voix coupée : l\'histoire n\'est pas lue')
        page.evaluate("Ludi.reglerSon({ voix: true })")
        page.goto(JEU + '?histoire')
        page.wait_for_timeout(600)
        verifier(len(page.evaluate('window.__ditsJoues')) > 0, 'voix allumée : l\'histoire est lue')
        page.goto(JEU)
        page.wait_for_timeout(500)
        verifier(page.locator('.titre [data-act=son]').count() == 1, 'l\'écran titre a aussi son haut-parleur')
        page.evaluate("localStorage.clear()")

        print('Le réglage de Ludiworld')
        cadre = nav.new_page(viewport={'width': 390, 'height': 844})
        cadre.add_init_script("window.__sonsJoues = []; window.__ditsJoues = []; if (window.speechSynthesis) window.speechSynthesis.speak = () => {};")
        cadre.goto(f'http://localhost:{PORT}/package.json')
        cadre.set_content(f"""<html><body style="margin:0"><script>window.messages=[];addEventListener('message',e=>{{messages.push(e.data);
          if (e.data && e.data.type === 'ludi:hello') e.source.postMessage({{type: 'ludi:welcome', player: {{name: 'Lou'}}, save: null, son: {{musique: true, bruitages: true, voix: false}}}}, e.origin);}});</script>
          <iframe id="jeu" style="width:390px;height:844px;border:0" src="{JEU}?chemin"></iframe></body></html>""")
        jeu = None
        for _ in range(60):
            jeu = cadre.frame(url=lambda u: 'chemin-du-roi' in u)
            if jeu and jeu.evaluate('typeof __son === "function"'):
                break
            cadre.wait_for_timeout(100)
        cadre.wait_for_timeout(500)
        verifier(jeu.evaluate('__son()') == {'musique': True, 'bruitages': True, 'voix': False}, 'le réglage de la maison arrive avec le bonjour de Ludiworld')
        cadre.evaluate("document.getElementById('jeu').contentWindow.postMessage({type: 'ludi:son', son: {musique: false, bruitages: true, voix: false}}, location.origin)")
        cadre.wait_for_timeout(300)
        verifier(jeu.evaluate('__son().musique') is False and jeu.evaluate('__musique()') is None, 'Ludiworld coupe la musique (message ludi:son) : le jeu la coupe')
        jeu.locator('[data-act=son]').first.click(force=True)
        jeu.locator('.panneau-son [data-son=musique]').click(force=True)
        cadre.wait_for_timeout(300)
        envoye = cadre.evaluate("messages.filter(m => m.type === 'ludi:son').pop()")
        verifier(bool(envoye) and envoye.get('son') == {'musique': True, 'bruitages': True, 'voix': False}, f'le bouton du jeu envoie le réglage à Ludiworld pour toute la maison ({envoye})')
        verifier(jeu.evaluate('__son().musique') is True, '... et rallume la musique dans le jeu')
        cadre.close()

        print('La musique sur chaque écran')
        for q, saison, nom in [('', 'automne', 'écran titre'), ('?histoire', 'automne', 'histoire du début'), ('?chemin', 'automne', 'le chemin'),
                               ('?fin', 'ete', 'histoire de la fin')]:
            page.goto(JEU + q)
            page.mouse.click(5, 5)
            verifier(entendue(page, saison), f'{nom} : {saison}')
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
