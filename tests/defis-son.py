"""Le son et la musique des Défis de Barnabé : python tests/defis-son.py

Critère de Julien (23 novembre 2026) : la vertical slice a ses sons et sa musique, la production en a partout.
Règle de la plateforme (23 novembre) : un jeu ne démarre jamais muet ; le son se règle dans Ludiworld en trois parties
(musique, bruitages, voix), et le bouton du jeu change le réglage de toute la maison.
Vérifie : tout allumé au départ (même avec une vieille sauvegarde « son coupé ») ; chaque interrupteur du haut-parleur
ne coupe que sa partie ; le réglage de Ludiworld (bonjour, message ludi:son) est suivi et le bouton du jeu le lui
envoie ; une musique sur chaque écran (titre, histoire, carte, chaque lieu, match, fin) ; les bruitages des moments forts (pièce posée, prise, raté, réussi, étoiles,
fin de bouteille, coup du match). Serveur sur le port 7376 (jamais 8000).
"""
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = 7376
BASE = f'http://localhost:{PORT}/defis-de-barnabe/'
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


def centre(page, sq):
    r = page.evaluate("(() => { const r = document.querySelector('.cases').getBoundingClientRect(); return [r.left, r.top, r.width]; })()")
    t = r[2] / 8
    return r[0] + (sq % 8 + .5) * t, r[1] + (7 - sq // 8 + .5) * t


def toucher(page, sq):
    x, y = centre(page, sq)
    page.mouse.click(x, y)


def suivant(page):
    b = page.locator('.jeu .suite, .bulle .actions button', has_text='Suivant').filter(visible=True)
    if b.count():
        b.first.click(force=True)
        page.wait_for_timeout(300)
        return True
    return False


def sons(page):
    return page.evaluate('window.__sonsJoues.splice(0)')


p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=RACINE,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        urllib.request.urlopen(BASE, timeout=1)
        break
    except Exception:
        time.sleep(0.1)
try:
    with sync_playwright() as pw:
        nav = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'])
        page = nav.new_page(viewport={'width': 820, 'height': 1180})
        page.add_init_script("window.__sonsJoues = []; window.__ditsJoues = []; if (window.speechSynthesis) window.speechSynthesis.speak = () => {};")
        erreurs = []
        page.on('pageerror', lambda e: erreurs.append(str(e)))

        print('Le son au départ et ses trois réglages')
        # Une vieille sauvegarde qui avait coupé le son : le jeu ne reste pas muet.
        page.add_init_script("if (!sessionStorage.getItem('vieille')) { sessionStorage.setItem('vieille', 1); localStorage.setItem('defis-de-barnabe.v1', JSON.stringify({ notes: {}, lecons: {}, amis: {}, medailles: {}, voix: false, son: false, histoire: true })); }")
        page.goto(BASE + '?chemin')
        page.mouse.click(3, 3)
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': True, 'voix': True}, 'au départ : musique, bruitages et voix allumés')
        verifier(entendue(page, 'plage'), 'au départ : la musique « plage » sur le chemin, sans rien régler')
        verifier('son' not in (page.evaluate("JSON.parse(localStorage.getItem('defis-de-barnabe.v1'))") or {}), 'la sauvegarde ne garde plus de réglage de son')

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
        page.goto(BASE + '?chemin')
        page.mouse.click(3, 3)
        page.wait_for_timeout(800)
        verifier(page.evaluate('__musique()') is None and page.evaluate('__son().musique') is False, 'le réglage reste en changeant d\'écran')
        interrupteur('musique')
        verifier(entendue(page, 'plage'), 'et l\'interrupteur la remet')
        interrupteur('bruitages')
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': False, 'voix': True}, 'interrupteur Bruitages : seulement les bruitages')
        page.goto(BASE + '?chemin')
        sons_joues()
        toucher_lieu()
        verifier(sons_joues() == [] and entendue(page, 'plage'), 'bruitages coupés : aucun bruitage, la musique continue')
        interrupteur('bruitages')
        interrupteur('voix')
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': True, 'voix': False}, 'interrupteur Voix : seulement la voix')
        page.goto(BASE + '?histoire')
        page.wait_for_timeout(600)
        verifier(page.evaluate('window.__ditsJoues') == [], 'voix coupée : l\'histoire n\'est pas lue')
        page.evaluate("Ludi.reglerSon({ voix: true })")
        page.goto(BASE + '?histoire')
        page.wait_for_timeout(600)
        verifier(len(page.evaluate('window.__ditsJoues')) > 0, 'voix allumée : l\'histoire est lue')
        page.goto(BASE)
        page.wait_for_timeout(500)
        verifier(page.locator('.titre [data-act=son]').count() == 1, 'l\'écran titre a aussi son haut-parleur')
        page.evaluate("localStorage.clear()")

        print('Le réglage de Ludiworld')
        cadre = nav.new_page(viewport={'width': 820, 'height': 1180})
        cadre.add_init_script("window.__sonsJoues = []; window.__ditsJoues = []; if (window.speechSynthesis) window.speechSynthesis.speak = () => {};")
        cadre.goto(f'http://localhost:{PORT}/package.json')
        cadre.set_content(f"""<html><body style="margin:0"><script>window.messages=[];addEventListener('message',e=>{{messages.push(e.data);
          if (e.data && e.data.type === 'ludi:hello') e.source.postMessage({{type: 'ludi:welcome', player: {{name: 'Lou'}}, save: null, son: {{musique: true, bruitages: true, voix: false}}}}, e.origin);}});</script>
          <iframe id="jeu" style="width:820px;height:1180px;border:0" src="{BASE}?chemin"></iframe></body></html>""")
        jeu = None
        for _ in range(60):
            jeu = cadre.frame(url=lambda u: 'defis-de-barnabe' in u)
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
        ecrans = [('', 'plage', 'écran titre'), ('?histoire', 'plage', 'histoire du début'),
                  ('?lecon=plage-1', 'plage', 'la plage'), ('?lecon=port-1', 'plage', 'le port'),
                  ('?lecon=dunes-1', 'plage', 'les dunes'), ('?lecon=rochers-1', 'rochers', 'les rochers'),
                  ('?lecon=cabanes-1', 'rochers', 'les cabanes'), ('?lecon=jetee-1', 'rochers', 'la jetée'),
                  ('?lecon=avant-match', 'phare', 'le phare, avant le match'), ('?amis', 'phare', 'le match'),
                  ('?fin', 'phare', 'histoire de la fin')]
        for q, voulue, nom in ecrans:
            page.goto(BASE + q)
            page.mouse.click(3, 3)
            verifier(entendue(page, voulue), f'{nom} : la musique « {voulue} »')
        page.goto(BASE + '?amis')
        page.mouse.click(3, 3)
        entendue(page, 'phare')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        verifier(entendue(page, None), 'jeu caché (la pause de Ludiworld) : la musique s\'arrête')

        print('Les bruitages')
        page.goto(BASE + '?lecon=plage-1')
        page.wait_for_timeout(800)
        sons(page)
        while suivant(page):
            pass
        verifier('pose' in sons(page), 'les phrases de Barnabé : un petit « toc » à chaque Suivant')
        page.wait_for_selector('.bulle .actions button:has-text("Indice")')
        # Un coup qui rate : une pièce blanche vers une case vide.
        page.locator('.bulle .actions button', has_text='Indice').click()
        de, vers = map(int, page.get_attribute('.plateau', 'data-indice').split('-'))
        toucher(page, de)
        page.wait_for_timeout(100)
        vides = page.evaluate("[...document.querySelectorAll('.case.cible')].map(c => +c.dataset.sq)")
        if vides:
            toucher(page, vides[0])
            page.wait_for_timeout(700)
            s = sons(page)
            verifier('faux' in s, f'un coup qui rate : le son « raté » ({s})')
        else:
            toucher(page, de)
        for n in range(5):
            for _ in range(10):
                if page.locator('.bulle .actions button', has_text='Indice').count() == 0:
                    break
                page.locator('.bulle .actions button', has_text='Indice').click()
                page.wait_for_timeout(150)
                de, vers = map(int, page.get_attribute('.plateau', 'data-indice').split('-'))
                toucher(page, de)
                page.wait_for_timeout(80)
                toucher(page, vers)
                page.wait_for_timeout(900)
                if suivant(page):
                    break
            if n == 0:
                s = sons(page)
                verifier('prise' in s and 'juste' in s, f'défi réussi : la prise et le son « réussi » ({s})')
        page.wait_for_timeout(2500)
        s = sons(page)
        verifier('fin' in s and 'etoile' in s, f'bouteille finie : la fanfare et les étoiles ({s})')

        page.goto(BASE + '?amis')
        page.wait_for_timeout(800)
        page.locator('[data-qui]').first.click(force=True)
        page.wait_for_function("document.querySelector('.plateau')?.dataset.tour === 'toi'", timeout=20000)
        sons(page)
        toucher(page, 12)
        page.wait_for_timeout(100)
        toucher(page, 28)
        page.wait_for_timeout(150)
        verifier('pose' in sons(page), 'le match : un « toc » quand Léo pose sa pièce')
        page.wait_for_function("document.querySelector('.plateau')?.dataset.tour === 'toi'", timeout=20000)
        s = sons(page)
        verifier('pose' in s or 'prise' in s, f'Barnabé joue à son tour : un « toc » aussi ({s})')

        verifier(not erreurs, f'aucune erreur ({erreurs[:3]})')
        nav.close()
finally:
    p.terminate()

print('\nTOUT EST BON' if not echecs else f'\n{len(echecs)} ÉCHEC(S)')
sys.exit(1 if echecs else 0)
