"""La lecture à voix haute et la pause du Monde à la craie : python tests/monde-lecture.py

Règles de la plateforme (22 novembre 2026, n° 3 à 5) : l'enfant touche un texte pour l'entendre ; rien n'est lu de soi-même
par défaut ; le réglage « Lecture » (tout, un peu, pas à la voix) dit ce qui se lit de soi-même. Ouvert seul, le jeu part de
« pas à la voix » et offre ce réglage. Et la charte : pas de « reviens demain ». Le kit : la pause de Ludiworld met la manche
en pause.
Serveur sur le port 7378 (jamais 8000). Le navigateur de test reçoit une fausse voix « installée » et ne parle pas :
le test regarde ce que le jeu a donné à lire (window.__ditsJoues), pas ce qu'on entend.
"""
import os
import pathlib
import sys

os.environ.setdefault('PORT_TEST', '7378')
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import navigateur as N  # noqa: E402  (serveur, toucher, lancer, repondre)
from playwright.sync_api import sync_playwright  # noqa: E402

JEU = f'{N.BASE}/monde-a-la-craie/?graine=1&vite=1'
VOIX = ("window.__ditsJoues = []; if (window.speechSynthesis) { speechSynthesis.speak = () => {};"
        " speechSynthesis.getVoices = () => [{ lang: 'fr-FR', localService: true, name: 'Test' }, { lang: 'en-GB', localService: true, name: 'Test en' }]; }")
echecs = N.echecs
verifier = N.verifier


def ouvrir(nav, q='&sanshistoire=1', lecture=None, w=1280, h=800):
    page = nav.new_page(viewport={'width': w, 'height': h}, locale='fr-FR')
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.add_init_script(VOIX)
    if lecture:
        page.add_init_script(f"localStorage.setItem('monde-a-la-craie.lecture', '{lecture}')")
    page.goto(JEU + q)
    page.wait_for_function('window.jeu && window.jeu.pret', timeout=15000)
    return page, erreurs


def dits(page):
    return page.evaluate('window.__ditsJoues.splice(0)')


def net(s):
    """Le texte comme la voix le reçoit : espaces insécables et retours à la ligne en espaces simples."""
    return ' '.join(s.replace(' ', ' ').replace(' ', ' ').split())


def repondre_cadre(page, cadre):
    """Une réponse juste dans le jeu ouvert dans le faux Ludiworld (le cadre couvre toute la page)."""
    code = cadre.evaluate('jeu.manche.question')
    for _ in range(4):
        cadre.evaluate('jeu.carte.vueEntiere()')
        avant = cadre.evaluate('jeu.carte.zoom')
        x, y = cadre.evaluate('c => jeu.carte.ancreEcran(c)', code)
        page.mouse.click(x, y)
        page.wait_for_timeout(60)
        if cadre.evaluate('jeu.carte.zoom') == avant:
            break
    if cadre.locator('.savoir:not([hidden])').count():
        page.wait_for_timeout(900)
        cadre.click('.savoir .astuce')


def premier_avec_savoir(page):
    """Répond juste jusqu'à ce qu'une note « Le savais-tu ? » s'ouvre."""
    for _ in range(12):
        N.toucher(page, page.evaluate('jeu.manche.question'))
        page.wait_for_timeout(200)
        if page.locator('.savoir:not([hidden])').count():
            return True
    return False


with sync_playwright() as p:
    srv = N.serveur()
    try:
        nav = N.muet(p.chromium.launch(args=['--mute-audio']))

        print('Par défaut : rien ne se lit de soi-même, on touche un texte pour l\'entendre')
        page, erreurs = ouvrir(nav)
        verifier(page.evaluate('__lecture()') == 'none', 'ouvert seul, la lecture part de « pas à la voix »')
        N.lancer(page, 'europe')
        page.wait_for_timeout(300)
        verifier(dits(page) == [], 'le nom à trouver ne se lit pas de lui-même')
        verifier(premier_avec_savoir(page), 'une note « Le savais-tu ? » s\'ouvre')
        verifier(dits(page) == [], 'la note ne se lit pas d\'elle-même')
        fait = page.inner_text('.savoir .fait .lisible')
        page.click('.savoir .fait .lisible')
        verifier(dits(page) == [net(fait)], f'toucher le savoir le lit ({fait[:40]}…)')
        verifier(page.locator('.savoir:not([hidden])').count() == 1, '... sans fermer la note')
        page.click('.savoir .savoir-titre')
        d = dits(page)
        verifier(len(d) == 1 and net(d[0]).startswith('Le savais-tu ? '), f'toucher le titre de la note le lit ({d})')
        page.wait_for_timeout(900)
        page.click('.savoir .astuce')
        page.wait_for_timeout(200)
        verifier(page.locator('.savoir:not([hidden])').count() == 0, 'toucher ailleurs sur la note la ferme, comme avant')
        nom = page.inner_text('#nom')
        page.click('#nom')
        verifier(dits(page) == [nom], f'toucher le nom à trouver le lit ({nom})')
        page.click('[data-action="ecouter"]')
        verifier(dits(page) == [nom], 'le bouton Écouter lit le nom')
        while not page.evaluate('jeu.manche.finie'):
            N.repondre(page, page.evaluate('jeu.manche.question'))
        page.wait_for_selector('.fin')
        dits(page)
        verifier(dits(page) == [], 'la fin de manche ne se lit pas d\'elle-même')
        page.click('.fin .grand')
        d = dits(page)
        verifier(len(d) == 1 and 'pays trouvés' in d[0], f'toucher le résultat le lit ({d})')
        verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
        page.close()

        print('Réglage « Lecture » : tout, de lui-même')
        page, erreurs = ouvrir(nav)
        page.click('[data-action="reglages"]')
        sel = page.locator('select[data-reglage="lecture"]')
        verifier(sel.count() == 1 and sel.input_value() == 'none', 'ouvert seul, les Réglages offrent la lecture (« Quand je touche un texte »)')
        sel.select_option('all')
        verifier(page.evaluate('__lecture()') == 'all', 'choisir « Tout, de lui-même » change le réglage')
        page.reload()
        page.wait_for_function('window.jeu && window.jeu.pret')
        verifier(page.evaluate('__lecture()') == 'all', 'le réglage reste après un rechargement')
        dits(page)
        N.lancer(page, 'europe')
        page.wait_for_timeout(300)
        nom = page.inner_text('#nom')
        verifier(dits(page) == [nom], f'le nom à trouver se lit de lui-même ({nom})')
        verifier(premier_avec_savoir(page), 'une note s\'ouvre')
        d = dits(page)
        verifier(len(d) >= 1 and '. ' in d[-1], f'la note se lit d\'elle-même ({d[-1][:50] if d else d}…)')
        page.close()

        print('Réglage « Lecture » : les longs textes')
        page, erreurs = ouvrir(nav, lecture='some')
        N.lancer(page, 'europe')
        page.wait_for_timeout(300)
        verifier(dits(page) == [], 'le nom à trouver (court) ne se lit pas de lui-même')
        page.close()
        page, erreurs = ouvrir(nav, q='', lecture='some')
        page.wait_for_selector('.cine.texte')
        d = dits(page)
        verifier(len(d) == 1 and 'Nina' in d[0] and len(d[0]) > 120, f'l\'histoire du départ (longue) se lit d\'elle-même ({len(d[0]) if d else 0} signes)')
        page.close()

        print('L\'histoire, le carnet, Découvrir')
        page, erreurs = ouvrir(nav, q='')
        page.wait_for_selector('.cine.texte')
        verifier(dits(page) == [], 'par défaut, l\'histoire ne se lit pas d\'elle-même')
        page.click('.cine-l1')
        d = dits(page)
        verifier(d == [net(page.inner_text('.cine-l1'))], f'toucher la phrase de l\'histoire la lit ({d})')
        page.click('.cine [data-action="go"]')
        page.click('.carnet')
        page.click('.carnet-consigne')
        d = dits(page)
        verifier(len(d) == 1 and 'tampon' in d[0], f'toucher la consigne du carnet la lit ({d})')
        page.click('[data-action="fermer"]')
        N.lancer(page, 'europe', 'decouvrir')
        N.toucher(page, 'IT')
        page.wait_for_timeout(300)
        verifier(dits(page) == [], 'Découvrir : toucher un pays ne lit rien de soi-même')
        page.click('.fiche-pays .fait >> nth=0')
        d = dits(page)
        texte = page.evaluate("jeu.app.fiche('IT').faits[0].texte")
        verifier(d == [net(texte)], f'toucher un savoir le lit, sans son emoji ({d})')
        page.click('.fiche-pays .capitale')
        d = dits(page)
        verifier(len(d) == 1 and 'Rome' in d[0] and '⭐' not in d[0], f'toucher la capitale la lit, sans l\'étoile ({d})')
        verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
        page.close()

        print('Voix coupée : rien ne se lit')
        page, erreurs = ouvrir(nav, lecture='all')
        page.click('[data-action="reglages"]')
        page.locator('input[data-son="voix"]').uncheck()
        page.click('[data-action="fermer"]')
        dits(page)
        N.lancer(page, 'europe')
        page.wait_for_timeout(300)
        page.click('#nom')
        verifier(dits(page) == [], 'voix coupée : ni le nom de lui-même, ni au toucher')
        page.close()

        print('Dans Ludiworld : la pause, et la fin douce')
        page = nav.new_page(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
        page.add_init_script(VOIX)
        page.goto(f'{N.BASE}/tests/lanceur.html')
        page.wait_for_function("document.getElementById('jeu').contentWindow.jeu?.pret", timeout=15000)
        cadre = page.frames[1]
        N.lancer(cadre, 'europe')
        cadre.wait_for_timeout(500)
        page.evaluate("envoyer({ type: 'ludi:pause' })")
        cadre.wait_for_timeout(200)
        verifier(cadre.locator('.voile:not([hidden]) [data-action="reprendre"]').count() == 1, 'la pause de Ludiworld ouvre la pause de la manche')
        avant = cadre.inner_text('#chrono')
        cadre.wait_for_timeout(700)
        verifier(cadre.inner_text('#chrono') == avant, f'le chrono s\'arrête pendant la pause ({avant})')
        cadre.click('[data-action="reprendre"]')
        cadre.wait_for_timeout(500)
        verifier(cadre.inner_text('#chrono') != avant, 'il repart à la reprise')
        page.evaluate("envoyer({ type: 'ludi:wrapup', minutes: 0 })")
        cadre.wait_for_timeout(100)
        while not cadre.evaluate('jeu.manche.finie'):
            repondre_cadre(page, cadre)
        cadre.wait_for_selector('.fin')
        fin = cadre.inner_text('.fin')
        verifier('arrêter' in fin and 'demain' not in fin.lower() and cadre.locator('[data-action="encore"]').count() == 0,
                 f'à la fin douce : on arrête, sans « à demain » ({fin.splitlines()[-2:]})')
        page.close()
        nav.close()
    finally:
        srv.terminate()

print('\nTOUT EST BON' if not echecs else f'\n{len(echecs)} ÉCHEC(S)')
sys.exit(1 if echecs else 0)
