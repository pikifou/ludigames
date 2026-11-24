"""L'épreuve et les médailles du Monde à la craie : python tests/monde-epreuve.py

Décisions du jeu (factory, 24 novembre 2026) : ADR-004, plus d'élimination (un pays déjà trouvé ou estompé touché est une
erreur) ; ADR-005 et ADR-006, l'épreuve d'un continent à un niveau s'ouvre aux trois quarts des pays connus, on y cherche
tous les pays du niveau, l'or sans erreur, l'argent avec une ou deux, le bronze au-delà ; une médaille ne redescend pas ;
l'épreuve Facile donne le tampon de Nina et sa grande image ; une, deux ou trois étoiles distinguent les médailles.
ADR-008, le chemin de Nina : les niveaux d'un continent s'ouvrent un par un ; le choix d'un continent montre son chemin
(Nina, la jauge, le sceau de l'épreuve, un seul gros bouton) ; les étiquettes montrent le prochain tampon ; la jauge avance
en fin de manche ; le moment « l'épreuve est prête » passe quand elle s'ouvre, et au lancement pour une épreuve déjà
ouverte, une seule fois ; l'épreuve a son cadre doré et compte les pays restants.
Serveur sur le port 7379 (jamais 8000).
"""
import json
import os
import pathlib
import sys

os.environ.setdefault('PORT_TEST', '7379')
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import navigateur as N  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

JEU = f'{N.BASE}/monde-a-la-craie/?graine=1&vite=1&sansvideo=1'
verifier = N.verifier
EUROPE = ['FR', 'ES', 'IT', 'DE', 'GB', 'PT', 'BE', 'CH', 'NL', 'GR', 'RU', 'NO', 'SE', 'PL']


def ouvrir(nav, etat=None, q='&sanshistoire=1', w=1280, h=800):
    page = nav.new_page(viewport={'width': w, 'height': h}, locale='fr-FR')
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    if etat is not None:
        etat = {'voyage': {'etapes': [], 'intro': True}, **etat}
        page.add_init_script("if (!sessionStorage.getItem('deja')) { sessionStorage.setItem('deja', 1); localStorage.setItem('monde-a-la-craie.v1', %s); }" % json.dumps(json.dumps(etat)))
    page.goto(JEU + q)
    page.wait_for_function('window.jeu && window.jeu.pret', timeout=15000)
    return page, erreurs


def panneau(page, zone, niveau='facile'):
    page.click(f'[data-zone="{zone}"]')
    page.click(f'.niveau[data-niveau="{niveau}"]')


def toucher_vite(page, code):
    N.toucher(page, code)
    page.wait_for_timeout(60)


def faux(page):
    """Une erreur : un pays de la carte qui n'est pas la question."""
    q = page.evaluate('jeu.manche.question')
    autre = next(c for c in EUROPE if c != q)
    N.toucher(page, autre)
    page.wait_for_timeout(1700)   # le bon pays montré, puis l'épreuve continue


def finir(page, erreurs_voulues):
    for _ in range(erreurs_voulues):
        faux(page)
    while not page.evaluate('jeu.manche.finie'):
        N.toucher(page, page.evaluate('jeu.manche.question'))
        page.wait_for_timeout(750)
    page.wait_for_selector('.fin')
    page.wait_for_timeout(300)


with sync_playwright() as p:
    srv = N.serveur()
    try:
        nav = N.muet(p.chromium.launch(args=['--mute-audio']))

        print('Fermée, puis ouverte aux trois quarts')
        page, erreurs = ouvrir(nav, {'connus': EUROPE[:10]})
        panneau(page, 'europe')
        b = page.locator('.bouton-epreuve')
        verifier(b.count() == 1 and b.get_attribute('aria-disabled') == 'true', 'Europe Facile, 10 pays sur 14 : l’épreuve est fermée')
        b.click(force=True)
        verifier('encore 1 pays' in page.inner_text('.epreuve-fermee'), f'toucher l’épreuve fermée dit ce qui manque ({page.inner_text(".epreuve-fermee")})')
        page.click('[data-action="fermer"]')
        page.click('[data-zone="monde"]')
        verifier(page.locator('.bouton-epreuve').count() == 0, 'pas d’épreuve sur le monde entier')
        page.close()

        print('Une manche qui ouvre l’épreuve ; pas d’élimination')
        page, erreurs = ouvrir(nav, {'connus': EUROPE[:10]})
        panneau(page, 'europe')
        page.click('[data-action="jouer"]')
        page.wait_for_timeout(300)
        # le premier pays trouvé, puis retouché plus tard : c'est une erreur
        q = page.evaluate('jeu.manche.question')
        N.repondre(page, q)
        page.wait_for_timeout(800)
        r = page.evaluate(f"(() => {{ const avant = jeu.manche.rates.size; return avant; }})()")
        N.toucher(page, q)
        page.wait_for_timeout(300)
        verifier(page.evaluate('jeu.manche.rates.size') == r + 1, 'toucher un pays déjà trouvé est une erreur (ADR-004)')
        N.continuer(page)
        page.wait_for_timeout(1600)
        while not page.evaluate('jeu.manche.finie'):
            N.repondre(page, page.evaluate('jeu.manche.question'))
            page.wait_for_timeout(750)
        page.wait_for_selector('.fin')
        fin = page.inner_text('.fin')
        verifier('épreuve est ouverte' in fin and page.locator('.fin [data-action="epreuve"]').count() == 1,
                 f'fin de manche : « L’épreuve est ouverte ! » et un bouton pour y aller')
        page.screenshot(path=str(N.CAPTURES / 'epreuve-ouverte.png'))
        page.wait_for_timeout(1100)
        page.click('.fin [data-action="epreuve"]')
        page.wait_for_timeout(300)
        verifier('Épreuve' in page.inner_text('.zone-courante') and page.evaluate('jeu.manche.total') == 14, 'l’épreuve : les 14 pays du Facile, « Épreuve » écrit en bas')
        page.close()

        print('L’épreuve : argent, puis or, puis bronze (la meilleure reste)')
        page, erreurs = ouvrir(nav, {'connus': EUROPE[:11]}, q='')   # avec l'histoire (le départ est déjà vu)
        # une épreuve déjà ouverte, jamais annoncée : le moment passe au lancement
        page.wait_for_selector('.cine.prete.texte', timeout=5000)
        verifier('Europe' in page.inner_text('.cine-texte') and 'tampon' in page.inner_text('.cine-texte'), 'au lancement : « L’épreuve est prête ! » pour l’Europe')
        page.screenshot(path=str(N.CAPTURES / 'chemin-prete.png'))
        page.click('.cine [data-action="go"]')
        page.wait_for_timeout(400)
        verifier(page.evaluate("jeu.ecran") == 'partie' and page.locator('#hud.mode-epreuve').count() == 1, '« Passer l’épreuve » lance l’épreuve, son cadre doré')
        verifier('restants sur 14' in page.inner_text('#compteur'), f'les pays restants ({page.inner_text("#compteur")})')
        verifier(page.evaluate('window.__musique ? __musique() : null') == 'epreuve', f"l'épreuve a sa musique ({page.evaluate('window.__musique ? __musique() : null')})")
        page.screenshot(path=str(N.CAPTURES / 'chemin-epreuve.png'))
        N.toucher(page, page.evaluate('jeu.manche.question'))
        page.wait_for_timeout(400)
        verifier(page.locator('.savoir:not([hidden])').count() == 0, 'pas de note « Le savais-tu ? » pendant l’épreuve')
        page.wait_for_timeout(400)
        finir(page, 2)
        fin = page.inner_text('.fin')
        verifier(page.locator('.fin .medaille.argent').count() == 1 and 'argent' in fin, f'deux erreurs : l’argent ({fin.splitlines()[:2]})')
        verifier(page.locator('.fin .medaille.argent .etoile').count() == 2, 'l’argent a deux étoiles')
        verifier('12 pays sur 14 du premier coup' in fin, 'ce qu’on a trouvé du premier coup')
        verifier('Europe' in page.inner_text('.nouveau-tampon'), 'le tampon d’Europe est gagné')
        verifier('Moyen est ouvert' in fin, 'le niveau Moyen s’ouvre avec le tampon')
        page.screenshot(path=str(N.CAPTURES / 'epreuve-argent.png'))
        page.wait_for_function("jeu.histoire === 'etape'", timeout=5000)
        page.wait_for_selector('.cine.texte')
        verifier('Nina arrive en Europe' in page.inner_text('.cine-texte') and 'Merci' in page.inner_text('.cine-texte'), 'Nina arrive en Europe, et on la remercie')
        page.screenshot(path=str(N.CAPTURES / 'epreuve-etape-europe.png'))
        page.click('.cine [data-action="go"]')
        page.wait_for_timeout(1100)
        page.click('[data-action="encore"]')
        page.wait_for_timeout(300)
        finir(page, 0)
        verifier(page.locator('.fin .medaille.or').count() == 1 and page.locator('.fin .medaille.or .etoile').count() == 3, 'sans erreur : l’or, trois étoiles')
        verifier('Mieux que la dernière fois' in page.inner_text('.fin'), '« Mieux que la dernière fois ! »')
        verifier(page.locator('.nouveau-tampon').count() == 0, 'pas un deuxième tampon')
        page.wait_for_timeout(1100)
        page.click('[data-action="encore"]')
        page.wait_for_timeout(300)
        finir(page, 3)
        verifier(page.locator('.fin .medaille.bronze .etoile').count() == 1, 'trois erreurs : le bronze, une étoile')
        verifier('meilleure médaille reste l’or' in page.inner_text('.fin'), '« Ta meilleure médaille reste l’or. »')
        verifier(page.evaluate("jeu.app.etat.medailles['europe-facile']") == 'or', 'la médaille gardée reste l’or')
        page.wait_for_timeout(1100)
        page.click('[data-action="changer"]')
        page.click('.carnet')
        verifier(page.locator('.carnet-liste li').first.locator('.medaille.or').count() == 1, 'le carnet montre l’or d’Europe en Facile')
        page.screenshot(path=str(N.CAPTURES / 'epreuve-carnet.png'))
        page.click('[data-action="fermer"]')
        panneau(page, 'europe')
        verifier(page.locator('.bouton-epreuve .medaille.or').count() == 1, 'le sceau de l’épreuve montre la médaille')
        verifier(page.locator('.niveau[data-niveau="moyen"]:not(.ferme)').count() == 1 and page.locator('.niveau[data-niveau="difficile"].ferme').count() == 1,
                 'Moyen ouvert, Difficile encore fermé')
        verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
        page.close()

        print('Une médaille en Moyen ne donne pas le tampon')
        moyen_europe = EUROPE + ['IE', 'DK', 'AT', 'FI', 'IS', 'UA', 'CZ', 'HU', 'RO', 'HR', 'BG', 'LU', 'BY', 'RS', 'MD']
        page, erreurs = ouvrir(nav, {'connus': moyen_europe, 'niveaux': {'europe': 'moyen'}, 'medailles': {'europe-facile': 'bronze'}})
        panneau(page, 'europe', 'moyen')
        page.click('.bouton-epreuve')
        page.wait_for_timeout(300)
        verifier(page.evaluate('jeu.manche.total') == 29, 'Europe Moyen : 29 pays')
        finir(page, 0)
        verifier(page.locator('.fin .medaille.or').count() == 1 and page.locator('.nouveau-tampon').count() == 0, 'l’or en Moyen, sans tampon')
        page.close()

        print('Le chemin : niveaux un par un, jauge, moment quand l’épreuve s’ouvre, « Plus tard »')
        page, erreurs = ouvrir(nav, {'connus': EUROPE[:9], 'niveaux': {'europe': 'moyen'}}, q='')
        etiq = page.inner_text('[data-zone="europe"]')
        verifier('9 pays sur 11' in etiq, f'l’étiquette de l’Europe montre le prochain tampon ({etiq!r})')
        verifier(page.locator('[data-zone="europe"] .jauge i.ok').count() == 9, 'neuf ronds remplis sur l’étiquette')
        page.click('[data-zone="europe"]')
        verifier(page.locator('.page-chemin').count() == 1 and 'Encore 2 pays' in page.inner_text('.page-chemin .bulle'), 'le chemin : Nina dit ce qui manque')
        verifier(page.locator('.page-chemin .niveau[data-niveau="moyen"].ferme').count() == 1, 'Moyen fermé sans le tampon Facile, même choisi avant')
        page.click('.page-chemin .niveau[data-niveau="moyen"]', force=True)
        verifier('médaille Facile' in page.inner_text('.niveau-ferme'), 'toucher Moyen dit comment l’ouvrir')
        verifier(page.locator('.page-chemin .sceau.ferme').count() == 1, 'le sceau de l’épreuve est fermé')
        page.screenshot(path=str(N.CAPTURES / 'chemin-continent.png'))
        page.click('.page-chemin [data-action="jouer"]')
        page.wait_for_timeout(300)
        # répondre juste jusqu'à ouvrir l'épreuve
        while not page.evaluate('jeu.manche.finie'):
            N.repondre(page, page.evaluate('jeu.manche.question'))
            page.wait_for_timeout(750)
        page.wait_for_selector('.fin')
        page.wait_for_timeout(400)
        verifier(page.locator('.fin .jauge i.neuf').count() >= 2 and '+' in page.inner_text('.fin-jauge'), 'fin de manche : les ronds gagnés s’allument, « +n »')
        page.screenshot(path=str(N.CAPTURES / 'chemin-fin-manche.png'))
        page.wait_for_selector('.cine.prete.texte', timeout=5000)
        verifier(True, 'puis le moment « l’épreuve est prête »')
        page.click('.cine [data-action="plustard"]')
        page.wait_for_timeout(300)
        verifier(page.locator('.cine').count() == 0 and page.evaluate("jeu.ecran") == 'partie', '« Plus tard » laisse la fin de manche')
        page.reload(); page.wait_for_function('window.jeu && window.jeu.pret'); page.wait_for_timeout(800)
        verifier(page.locator('.cine').count() == 0, 'le moment ne revient pas au lancement suivant')
        verifier('Épreuve prête' in page.inner_text('[data-zone="europe"]'), 'l’étiquette dit « Épreuve prête ! »')
        page.click('[data-zone="europe"]')
        verifier(page.locator('.page-chemin .sceau.pret').count() == 1 and page.locator('.page-chemin [data-action="epreuve"].or').count() == 1,
                 'le chemin : sceau prêt, « Passer l’épreuve » en gros bouton doré')
        page.screenshot(path=str(N.CAPTURES / 'chemin-continent-pret.png'))
        verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')
        page.close()

        print('Téléphone en paysage')
        page, erreurs = ouvrir(nav, {'connus': EUROPE[:11]}, w=844, h=390)
        panneau(page, 'europe')
        page.screenshot(path=str(N.CAPTURES / 'epreuve-panneau-tel.png'))
        page.click('.bouton-epreuve')
        page.wait_for_timeout(300)
        finir(page, 1)
        page.screenshot(path=str(N.CAPTURES / 'epreuve-fin-tel.png'))
        voile = page.evaluate("(() => { const b = document.querySelector('.note-tableau.fin'); return [b.scrollHeight, b.clientHeight]; })()")
        verifier(voile[0] <= voile[1] + 1, f'la fin d’épreuve tient sur un téléphone ({voile})')
        page.close()
        nav.close()
    finally:
        srv.terminate()

print('\nTOUT EST BON' if not N.echecs else f'\n{len(N.echecs)} ÉCHEC(S)')
sys.exit(1 if N.echecs else 0)
