"""Le son du Monde à la craie : python tests/monde-son.py

Règle de la plateforme (23 novembre 2026) : un jeu ne démarre jamais muet ; le son se règle dans Ludiworld en trois parties
(musique, bruitages, voix), et les interrupteurs du jeu changent le réglage de toute la maison.
Vérifie : tout allumé au départ (même avec une vieille sauvegarde « son coupé ») ; une musique sur chaque écran (accueil,
histoire de Nina, manche, découvrir) ; chaque interrupteur (Réglages, pause d'une manche) ne coupe que sa partie ; le
réglage de Ludiworld (message ludi:son) est suivi et les interrupteurs du jeu le lui envoient ; la pause de Ludiworld et le
jeu caché arrêtent la musique ; les bruitages des moments forts (nom écrit à la craie, juste, raté, fin de manche, tampon).
Serveur sur le port 7377 (jamais 8000). L'agent n'entend rien : le test vérifie ce qui joue, pas comment ça sonne.
"""
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = int(os.environ.get('PORT_TEST', 7377))
BASE = f'http://localhost:{PORT}'
JEU = f'{BASE}/monde-a-la-craie/?graine=1&vite=1'
HOOKS = "window.__sonsJoues = []; window.__ditsJoues = []; if (window.speechSynthesis) window.speechSynthesis.speak = () => {};"
TOUT = {'musique': True, 'bruitages': True, 'voix': True}
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


def sons(page):
    return page.evaluate('window.__sonsJoues.splice(0)')


def ouvrir(nav, q='&sanshistoire=1', init=None):
    page = nav.new_page(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.add_init_script(HOOKS)
    if init:
        page.add_init_script(init)
    page.goto(JEU + q)
    page.wait_for_function('window.jeu && window.jeu.pret', timeout=15000)

    return page, erreurs


def toucher(page, code):
    # Comme un enfant : toute la carte d'abord ; si elle zoome (toucher près d'un tout petit pays), on retouche.
    page.evaluate('jeu.carte.vueEntiere()')
    for _ in range(4):
        avant = page.evaluate('jeu.carte.zoom')
        x, y = page.evaluate('c => jeu.carte.ancreEcran(c)', code)
        page.mouse.click(x, y)
        page.wait_for_timeout(60)
        if page.evaluate('jeu.carte.zoom') == avant:
            return


def repondre(page, code):
    toucher(page, code)
    page.wait_for_timeout(900)
    if page.locator('.savoir:not([hidden])').count():
        page.click('.savoir .astuce')


def interrupteur(page, nom, oui):
    case = page.locator(f'input[data-son={nom}]')
    if case.is_checked() != oui:
        case.evaluate('c => c.click()')
    page.wait_for_timeout(150)


p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=RACINE,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        urllib.request.urlopen(BASE + '/package.json', timeout=1)
        break
    except Exception:
        time.sleep(0.1)
try:
    with sync_playwright() as pw:
        nav = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'])

        print('Au départ')
        vieille = ("localStorage.setItem('monde-a-la-craie.v1', JSON.stringify({ connus: ['FR'], meilleurs: {}, niveaux: {}, voix: false, son: false,"
                   " voyage: { etapes: [], intro: true, fini: false } }));")
        page, erreurs = ouvrir(nav, '', init="if (!sessionStorage.getItem('vu')) { sessionStorage.setItem('vu', 1); " + vieille + " }")
        verifier(page.evaluate('__son()') == TOUT, 'une vieille sauvegarde « son et voix coupés » : musique, bruitages et voix allumés')
        verifier(entendue(page, 'voyage'), 'l\'accueil : la musique du voyage, sans rien régler')

        print('Les Réglages')
        page.click('[data-action="reglages"]')
        cases = page.evaluate("[...document.querySelectorAll('input[data-son]')].map(c => [c.dataset.son, c.checked])")
        verifier(cases == [['musique', True], ['bruitages', True], ['voix', page.evaluate("!document.querySelector('input[data-son=voix]').disabled")]],
                 f'trois interrupteurs : Musique, Bruitages, Voix ({cases})')
        interrupteur(page, 'musique', False)
        verifier(entendue(page, None), 'Musique coupée : la musique s\'arrête')
        verifier(page.evaluate('__son()') == {'musique': False, 'bruitages': True, 'voix': True}, '... et seulement elle')
        page.reload()
        page.wait_for_function('window.jeu && window.jeu.pret')

        page.wait_for_timeout(600)
        verifier(page.evaluate('__musique()') is None and page.evaluate('__son().musique') is False, 'le réglage reste après un rechargement')
        verifier('son' not in page.evaluate("JSON.parse(localStorage.getItem('monde-a-la-craie.v1'))"), 'la progression ne garde plus de réglage de son')
        page.click('[data-action="reglages"]')
        interrupteur(page, 'musique', True)
        verifier(entendue(page, 'voyage'), 'Musique rallumée : elle revient')
        interrupteur(page, 'bruitages', False)
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': False, 'voix': True}, 'Bruitages coupés : seulement eux')
        page.click('[data-action="fermer"]')
        page.click('[data-zone="europe"]')
        page.click('[data-action="jouer"]')
        page.wait_for_function("jeu.carte && jeu.carte.zone.id === 'europe'")
        verifier(entendue(page, 'manche'), 'une manche : sa musique')
        sons(page)
        repondre(page, page.evaluate('jeu.manche.question'))
        verifier(sons(page) == [], 'bruitages coupés : la manche n\'en joue aucun')

        print('La pause d\'une manche')
        page.click('[data-action="pause"]')
        verifier(page.locator('.voile input[data-son]').count() == 3, 'la pause a les trois interrupteurs')
        interrupteur(page, 'bruitages', True)
        interrupteur(page, 'voix', False)
        verifier(page.evaluate('__son()') == {'musique': True, 'bruitages': True, 'voix': False}, 'Voix coupée : seulement elle')
        verifier(page.evaluate("document.documentElement.classList.contains('sans-voix')"), 'voix coupée : le bouton Écouter se cache')
        page.click('[data-action="reprendre"]')
        sons(page)
        page.evaluate('window.__ditsJoues = []')
        q = page.evaluate('jeu.manche.question')
        voisin = page.evaluate(f"jeu.app.paysDeZone('europe').map(p => p.code).find(c => c !== '{q}')")
        toucher(page, voisin)
        page.wait_for_timeout(300)
        s = sons(page)
        verifier('faux' in s, f'un pays raté : le son « raté » ({s})')
        verifier(page.evaluate('window.__ditsJoues') == [], 'voix coupée : rien n\'est lu')
        page.wait_for_timeout(2600)
        if page.locator('.savoir:not([hidden])').count():
            page.click('.savoir .astuce')
        while not page.evaluate('jeu.manche.finie'):
            repondre(page, page.evaluate('jeu.manche.question'))
        page.wait_for_timeout(500)
        s = sons(page)
        verifier('juste' in s and 'craie' in s and 'fin' in s, f'les bons pays, le nom écrit à la craie, la fin de manche ({sorted(set(s))})')
        verifier(entendue(page, 'manche'), 'la fin de manche garde sa musique')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        verifier(entendue(page, None), 'jeu caché : la musique s\'arrête')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        verifier(entendue(page, 'manche'), 'jeu revenu : elle reprend')
        page.wait_for_timeout(1100)
        # la manche a ouvert l'épreuve d'Europe : le moment « l'épreuve est prête » (ADR-008), « Plus tard »
        if page.locator('.cine.prete').count():
            page.click('.cine [data-action="plustard"]')
        page.click('[data-action="changer"]')
        verifier(entendue(page, 'voyage'), 'retour à l\'accueil : la musique du voyage')
        page.click('[data-zone="afrique"]')
        page.click('[data-action="decouvrir"]')
        verifier(entendue(page, 'decouvrir'), 'Découvrir : sa musique')
        verifier(not erreurs, f'aucune erreur ({erreurs[:3]})')
        page.close()

        print('L\'histoire de Nina et les tampons')
        page, erreurs = ouvrir(nav, '')
        page.wait_for_selector('.cine')
        verifier(entendue(page, 'voyage'), 'l\'histoire du départ : la musique du voyage')
        page.close()
        # le tampon vient de la médaille de l'épreuve Facile (ADR-006), ici venue d'un autre appareil
        tout_facile = ("localStorage.setItem('monde-a-la-craie.v1', JSON.stringify({ connus: %s, meilleurs: {}, niveaux: {},"
                       " medailles: { 'europe-facile': 'bronze' }, voyage: { etapes: [], intro: true, fini: false } }));")
        page, erreurs = ouvrir(nav)
        faciles = page.evaluate("jeu.app.paysDeZone('europe', 'facile').map(p => p.code)")
        page.close()
        page, erreurs = ouvrir(nav, init="if (!sessionStorage.getItem('vu')) { sessionStorage.setItem('vu', 1); " + (tout_facile % json.dumps(faciles)) + " }")
        page.wait_for_timeout(1200)
        verifier('tampon' in sons(page), 'un tampon neuf dans le carnet : on l\'entend frapper')
        page.close()

        print('Dans Ludiworld')
        page = nav.new_page(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
        page.add_init_script(HOOKS)
        page.goto(f'{BASE}/tests/lanceur.html')
        page.wait_for_function("document.getElementById('jeu').contentWindow.jeu?.pret", timeout=15000)
        cadre = page.frames[1]

        verifier(cadre.evaluate('__son()') == TOUT and entendue(cadre, 'voyage'), 'dans Ludiworld : tout allumé, la musique du voyage')
        page.evaluate("envoyer({ type: 'ludi:son', son: { musique: false, bruitages: true, voix: true } })")
        page.wait_for_timeout(300)
        verifier(cadre.evaluate('__son().musique') is False and entendue(cadre, None), 'Ludiworld coupe la musique (message ludi:son) : le jeu la coupe')
        cadre.click('[data-action="reglages"]')
        verifier(not cadre.locator('input[data-son=musique]').is_checked(), 'les Réglages du jeu montrent le réglage de Ludiworld')
        interrupteur(cadre, 'bruitages', False)
        envoye = page.evaluate("recus.filter(m => m.type === 'ludi:son').pop()")
        verifier(bool(envoye) and envoye.get('son') == {'musique': False, 'bruitages': False, 'voix': True},
                 f'l\'interrupteur du jeu envoie le réglage à Ludiworld pour toute la maison ({envoye})')
        interrupteur(cadre, 'musique', True)
        verifier(entendue(cadre, 'voyage'), 'rallumée depuis le jeu : la musique revient')
        page.evaluate("envoyer({ type: 'ludi:pause' })")
        verifier(entendue(cadre, None), 'la pause de Ludiworld arrête la musique')
        page.close()
        nav.close()
finally:
    p.terminate()

print('\nTOUT EST BON' if not echecs else f'\n{len(echecs)} ÉCHEC(S)')
sys.exit(1 if echecs else 0)
