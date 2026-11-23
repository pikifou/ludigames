"""Le Chemin du Roi dans le navigateur : python tests/chemin-navigateur.py [rapide]

Joue tout le chemin depuis une sauvegarde vide, comme un enfant (toucher, glisser, indices),
puis une partie avec un ami, hors ligne et dans plusieurs formats. Serveur sur le port 7362 (jamais 8000).
"""
import pathlib
import random
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
RACINE = pathlib.Path(__file__).resolve().parent.parent
PORT = 7362
BASE = f'http://localhost:{PORT}/chemin-du-roi/'
CAPTURES = RACINE / 'tests' / 'captures' / 'chemin-du-roi'
CAPTURES.mkdir(parents=True, exist_ok=True)
echecs = []
random.seed(4)


def verifier(cond, message):
    print(('  ok  ' if cond else '  ÉCHEC  ') + message)
    if not cond:
        echecs.append(message)


def serveur():
    p = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=RACINE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE, timeout=1)
            return p
        except Exception:
            time.sleep(0.1)
    raise RuntimeError('le serveur de test ne démarre pas')


def centre(page, sq):
    r = page.evaluate("(() => { const r = document.querySelector('.cases').getBoundingClientRect(); return [r.left, r.top, r.width]; })()")
    t = r[2] / 8
    return r[0] + (sq % 8 + .5) * t, r[1] + (7 - sq // 8 + .5) * t


def toucher(page, sq):
    x, y = centre(page, sq)
    page.mouse.click(x, y)


def glisser(page, de, vers):
    x0, y0 = centre(page, de)
    x1, y1 = centre(page, vers)
    page.mouse.move(x0, y0)
    page.mouse.down()
    page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, steps=4)
    page.mouse.move(x1, y1, steps=4)
    page.mouse.up()


def bouton(page, texte):
    b = page.locator('.fete .actions button, .bulle .actions button, .jeu .suite', has_text=texte).filter(visible=True)
    return b.first if b.count() else None


PASSANT = []
CONSEILS = []


def attendre_tour(page):
    """Attend que ce soit à Léo (ou la fin). La première prise en passant ouvre une explication : on la lit et on la ferme."""
    page.wait_for_function("['toi', 'fin'].includes(document.querySelector('.plateau').dataset.tour) || !!document.querySelector('.explication, .bulle .refaire')", timeout=30000)
    if page.locator('.bulle .refaire').count() and page.locator('.plateau').get_attribute('data-tour') == 'ami':
        # Un conseil de l'ami (coup risqué ou occasion manquée) : une fois sur deux on reprend son coup.
        CONSEILS.append(page.locator('.bulle .texte').inner_text())
        if len(CONSEILS) % 2:
            page.locator('.bulle .refaire').click(force=True)
        else:
            page.locator('.bulle .actions .petit').last.click(force=True)
        return attendre_tour(page)
    if page.locator('.explication').count():
        PASSANT.append(page.locator('.explication p').inner_text())
        page.locator('.explication button').click(force=True)
        page.wait_for_function("['toi', 'fin'].includes(document.querySelector('.plateau').dataset.tour)", timeout=30000)


def jouer_partie(page, maxi=200):
    """Joue des coups au hasard (mais légaux) jusqu'à la fin de la partie."""
    for _ in range(maxi):
        if bouton(page, 'Continuer'):
            return True
        attendre_tour(page)
        if bouton(page, 'Continuer'):
            return True
        # Une pièce blanche qui a des coups : on la touche, puis une case cible au hasard.
        cases = page.evaluate("""(() => [...document.querySelectorAll('.piece.blanche')].map(e => {
            const m = /translate\\(([\\d.]+)%, ([\\d.]+)%\\)/.exec(e.style.transform); return m ? (7 - Math.round(m[2] / 100)) * 8 + Math.round(m[1] / 100) : -1; }))()""")
        random.shuffle(cases)
        joue = False
        for sq in cases:
            toucher(page, sq)
            cibles = page.evaluate("[...document.querySelectorAll('.case.cible, .case.cible-prise')].map(c => +c.dataset.sq)")
            if cibles:
                prises = page.evaluate("[...document.querySelectorAll('.case.cible-prise')].map(c => +c.dataset.sq)")
                toucher(page, random.choice(prises or cibles))
                joue = True
                break
        if not joue:
            page.wait_for_timeout(300)
            continue
        attendre_tour(page)
        page.wait_for_timeout(250)
    return bool(bouton(page, 'Continuer'))


def faire_exercice(page, n):
    """Résout l'exercice affiché avec les indices (toucher ou glisser, en alternance)."""
    for coup in range(30):
        if bouton(page, 'Suivant'):
            return True
        page.locator('.bulle .actions button', has_text='Indice').click()
        page.wait_for_timeout(150)
        de, vers = map(int, page.get_attribute('.plateau', 'data-indice').split('-'))
        if (n + coup) % 2:
            glisser(page, de, vers)
        else:
            toucher(page, de)
            page.wait_for_timeout(80)
            toucher(page, vers)
        page.wait_for_timeout(650)
    return bool(bouton(page, 'Suivant'))


def chemin_complet(nav):
    print('Le chemin entier, depuis une sauvegarde vide (téléphone)')
    page = nav.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, reduced_motion='reduce')  # le bouton Suivant apparaît sans attendre
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.on('console', lambda m: erreurs.append(m.text) if m.type == 'error' else None)
    page.goto(BASE)
    page.evaluate("localStorage.clear()")
    page.goto(BASE)
    page.click('[data-act=jouer]', force=True)
    page.wait_for_selector('.planche')
    verifier(page.locator('.legende p').inner_text().startswith('Voici Léo'), "l'histoire de Léo s'ouvre à la première partie")
    for _ in range(4):
        page.click('[data-act=suite]', force=True)
        page.wait_for_timeout(150)
    page.wait_for_selector('.carte')
    verifier(page.locator('.lieu.ferme').count() == 6, 'au départ, seul le premier lieu est ouvert')
    ex_faits = 0
    lecons = page.evaluate("(async () => (await import('./js/lecons.js')).LECONS.map(l => ({ id: l.id, ch: l.chapitre, parties: !!l.parties })))()")
    for k, l in enumerate(lecons):
        if l['parties']:
            continue
        page.goto(BASE + '?chemin')
        page.wait_for_function(f"!document.querySelector(\".lieu[data-ch='{l['ch']}']\").classList.contains('ferme')", timeout=15000)
        page.click(f".lieu[data-ch='{l['ch']}']", force=True)
        page.wait_for_timeout(600)
        b = page.locator(f".feuille [data-l='{l['id']}']")
        verifier(b.is_enabled(), f"la leçon {l['id']} est ouverte quand vient son tour")
        b.click(force=True)
        page.wait_for_selector('.bulle')
        for _ in range(60):
            page.wait_for_timeout(120)
            if page.locator('.fete').count():
                break
            if page.locator('.bulle .actions button', has_text='Indice').count():
                ex_faits += 1
                verifier(faire_exercice(page, ex_faits), f"{l['id']} : exercice {ex_faits} réussi")
                bouton(page, 'Suivant').click(force=True)
            elif bouton(page, 'Annuler mon coup'):
                verifier(jouer_partie(page), f"{l['id']} : la partie se termine")
                page.wait_for_timeout(1300)
                bouton(page, 'Continuer').click(force=True)
            elif bouton(page, 'Suivant'):
                bouton(page, 'Suivant').click(force=True)
        verifier(page.locator('.fete').count() == 1, f"{l['id']} : la leçon se termine par une fête")
        if k in (0, 6):
            page.screenshot(path=str(CAPTURES / f'fin-{l["id"]}.png'))
    page.goto(BASE + '?chemin')
    page.wait_for_timeout(3500)
    verifier(page.locator('.lieu.ferme').count() == 0, 'à la fin, tous les lieux sont ouverts')
    medailles = page.evaluate("Object.keys(window.__chemin.etat.medailles).length")
    # Les médailles de Lina et Malo demandent de gagner leur partie : le robot joue au hasard et peut les perdre.
    verifier(4 <= medailles <= 6, f'au moins les quatre médailles sans partie ({medailles})')
    total = page.locator('.total:not(.panier)').inner_text()
    print('   étoiles :', total)
    verifier(page.locator('.panier').count() == 1, 'le panier de pommes est sur le chemin : ' + page.locator('.panier').inner_text().strip())
    page.screenshot(path=str(CAPTURES / 'chemin-fini.png'))
    if CONSEILS:
        print(f'   {len(CONSEILS)} conseil(s) des amis pendant les parties, par exemple :', CONSEILS[0][:80])
    if PASSANT:
        print('   la prise en passant a été expliquée pendant une partie :', PASSANT[0][:70], '…')
    verifier(not erreurs, f'aucune erreur dans la console ({erreurs[:3]})')
    page.close()


def partie_ami(nav):
    print('Une vraie partie avec Barnabé (tablette), annuler, dangers')
    page = nav.new_page(viewport={'width': 1180, 'height': 820}, has_touch=True, reduced_motion='reduce')
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.goto(BASE + '?amis')
    page.locator('[data-qui=sage]').click(force=True)
    page.wait_for_selector('.piece')
    verifier(page.locator('.piece').count() == 32, '32 pièces au départ')
    glisser(page, 12, 28)  # e2-e4
    page.wait_for_timeout(1500)
    verifier(page.locator('.piece.noire').count() == 16 and page.locator('.case.dernier').count() == 2, "Barnabé a répondu")
    bouton(page, 'Annuler mon coup').click(force=True)
    page.wait_for_timeout(300)
    verifier(page.evaluate("document.querySelector('.case[data-sq=\"12\"]') && [...document.querySelectorAll('.piece.blanche')].length") == 16, 'annuler remet la position')
    bouton(page, 'Voir les dangers').click(force=True)
    page.wait_for_timeout(200)
    page.screenshot(path=str(CAPTURES / 'partie-tablette.png'))
    verifier(jouer_partie(page, 300), 'la partie avec Barnabé va jusqu\'au bout')
    page.screenshot(path=str(CAPTURES / 'partie-fin.png'))
    verifier(not erreurs, f'aucune erreur ({erreurs[:3]})')
    page.close()


def formats(nav):
    print('Formats : rien ne dépasse de l\'écran')
    for w, h in [(360, 640), (390, 844), (844, 390), (768, 1024), (1024, 768), (1366, 1024)]:
        page = nav.new_page(viewport={'width': w, 'height': h})
        for q in ['?lecon=cavalier', '?chemin&tout']:
            page.goto(BASE + q)
            page.wait_for_timeout(500)
            if 'lecon' in q:
                box = page.evaluate("(() => { const r = document.querySelector('.plateau').getBoundingClientRect(); const b = document.querySelector('.bulle').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, b.bottom, b.right, r.width]; })()")
                dedans = box[0] >= 0 and box[1] >= 0 and box[2] <= w + 1 and box[3] <= h + 1
                verifier(dedans and box[6] > min(w, h) * 0.45, f'{w}x{h} : plateau entier et assez grand ({round(box[6])} px)')
                page.screenshot(path=str(CAPTURES / f'lecon-{w}x{h}.png'))
            else:
                # Écran très bas : la carte défile ; on vérifie la largeur et qu'on peut tout atteindre.
                bas = h < 520
                dehors = page.evaluate(f"[...document.querySelectorAll('.lieu')].filter(e => {{ e.scrollIntoView({{block: 'center'}}); const r = e.getBoundingClientRect(); return r.left < 0 || r.right > {w} || r.top < 0 || r.bottom > {h}; }}).length")
                chevauchent = page.evaluate("(() => { const l = [...document.querySelectorAll('.etiquette')].map(e => e.getBoundingClientRect()); let n = 0; l.forEach((a, i) => l.slice(i + 1).forEach(b => { if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) n++; })); return n; })()")
                verifier(dehors == 0 and chevauchent == 0, f'{w}x{h} : les sept lieux du chemin sont visibles et lisibles' + (' (en faisant défiler)' if bas else ''))
                page.evaluate("document.querySelector('.carte-cadre').scrollTop = 0")
                page.screenshot(path=str(CAPTURES / f'chemin-{w}x{h}.png'))
        page.close()


def hors_ligne(nav):
    print('Hors ligne')
    ctx = nav.new_context()
    page = ctx.new_page()
    page.goto(BASE)
    page.evaluate("navigator.serviceWorker.ready")
    page.wait_for_timeout(1500)
    page.reload()
    page.wait_for_timeout(800)
    ctx.set_offline(True)
    page.goto(BASE + '?lecon=pion')
    page.wait_for_timeout(1000)
    ok = page.evaluate("[...document.querySelectorAll('.piece img')].every(i => i.complete && i.naturalWidth > 0)") and page.locator('.bulle').count() == 1
    verifier(ok, 'le jeu et ses images se chargent sans réseau')
    ctx.close()


p = serveur()
try:
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        formats(nav)
        hors_ligne(nav)
        partie_ami(nav)
        chemin_complet(nav)
        nav.close()
finally:
    p.terminate()

print('\n' + ('TOUT EST BON' if not echecs else f'{len(echecs)} ÉCHEC(S)'))
sys.exit(1 if echecs else 0)
