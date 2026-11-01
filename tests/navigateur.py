"""Tests dans le navigateur (Playwright) : python tests/navigateur.py [carte|ecrans|appli|corrections|savoirs]

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

    # Toucher à côté d'un petit pays, dans un voisin : la carte zoome au lieu de répondre.
    page, _ = page_carte(nav, 'europe', 1280, 800)
    point = page.evaluate("""() => {
      const r = document.querySelector('svg').getBoundingClientRect(), [x, y] = carte.ancreEcran('LU');
      for (let a = 0; a < 8; a++) { const px = x + 15 * Math.cos(a * Math.PI / 4), py = y + 15 * Math.sin(a * Math.PI / 4);
        const c = carte.paysEn(px - r.left, py - r.top); if (c && c !== 'LU') return [px, py, c]; }
    }""")
    page.evaluate('taps.length = 0')
    page.mouse.click(point[0], point[1])
    page.wait_for_timeout(100)
    verifier(page.evaluate('taps') == [] and page.evaluate('carte.zoom') > 1,
             f"toucher {point[2]} tout près du Luxembourg : la carte zoome au lieu de répondre ({page.evaluate('taps')}, zoom {page.evaluate('carte.zoom')})")
    lu = page.evaluate("carte.ancreEcran('LU')")
    page.mouse.click(lu[0], lu[1])
    page.wait_for_timeout(100)
    verifier(page.evaluate('taps') == ['LU'], f"après le zoom, toucher le Luxembourg donne LU ({page.evaluate('taps')})")
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
    # Comme un enfant : toute la carte d'abord ; si elle zoome (toucher près d'un tout petit pays), on retouche.
    page.evaluate('jeu.carte.vueEntiere()')
    for _ in range(4):
        avant = page.evaluate('jeu.carte.zoom')
        x, y = page.evaluate('c => jeu.carte.ancreEcran(c)', code)
        page.mouse.click(x, y)
        page.wait_for_timeout(60)
        if page.evaluate('jeu.carte.zoom') == avant:
            return


def lancer(page, zone, action='jouer'):
    page.click(f'[data-zone="{zone}"]')
    page.click(f'[data-action="{action}"]')
    page.wait_for_function('window.jeu.carte && window.jeu.carte.zone.id === ' + repr(zone))


def continuer(page):
    """Après une erreur sur un pays qui a ses savoirs, le jeu attend qu'on touche la note « Le savais-tu ? »."""
    page.wait_for_timeout(900)
    if page.locator('.savoir:not([hidden])').count():
        page.click('.savoir')


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
    continuer(page)
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


def jouer_dans_cadre(page, cadre):
    """Finit la manche du jeu ouvert dans le faux Ludiworld (l'iframe couvre toute la page)."""
    derniere = None
    while not cadre.evaluate('jeu.manche.finie'):
        q = cadre.evaluate('jeu.manche.question')
        if q != derniere:
            cadre.evaluate('jeu.carte.vueEntiere()')   # nouvelle question : toute la carte
            derniere = q
        x, y = cadre.evaluate('c => jeu.carte.ancreEcran(c)', q)
        page.mouse.click(x, y)   # après un zoom (petit pays tout près), on retouche le même pays
        page.wait_for_timeout(60)


def test_appli(nav):
    print('appli')
    # Hors ligne : après une première visite, le jeu recharge et se joue sans réseau.
    ctx = nav.new_context(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
    page = ctx.new_page()
    page.goto(JEU)
    page.wait_for_function('window.jeu && jeu.pret', timeout=15000)
    page.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller || (navigator.serviceWorker.ready.then(() => window.__swPret = true), window.__swPret)', timeout=15000)
    page.reload()
    page.wait_for_function('window.jeu && jeu.pret && navigator.serviceWorker.controller', timeout=15000)
    ctx.set_offline(True)
    page.reload()
    page.wait_for_function('window.jeu && jeu.pret', timeout=15000)
    lancer(page, 'europe')
    finir_manche(page)
    page.wait_for_selector('.fin', timeout=3000)
    verifier(True, 'hors ligne : la page recharge et une manche se joue')
    ctx.close()

    # Ouvert seul : le plein écran est proposé dans les réglages.
    page, erreurs = ouvrir_jeu(nav)
    page.click('[data-action="reglages"]')
    verifier(page.locator('[data-action="plein-ecran"]').count() == 1, 'seul : bouton plein écran dans les réglages')
    page.close()

    # Dans Ludiworld (faux lanceur qui répond au kit).
    page = nav.new_page(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
    erreurs = []
    page.on('pageerror', lambda e: erreurs.append(str(e)))
    page.goto(f'{BASE}/tests/lanceur.html')
    page.wait_for_function("document.getElementById('jeu').contentWindow.jeu?.pret", timeout=15000)
    cadre = page.frames[1]
    verifier(cadre.evaluate('Ludi.inLauncher()'), 'dans Ludiworld : le kit le sait')
    verifier(cadre.evaluate('jeu.app.joueur') == 'Joshua', f"dans Ludiworld : le prénom vient de Ludiworld ({cadre.evaluate('jeu.app.joueur')})")
    cadre.click('[data-action="reglages"]')
    verifier(cadre.locator('[data-action="plein-ecran"], [data-action="installer"]').count() == 0, "dans Ludiworld : ni plein écran ni installation")
    cadre.click('[data-action="fermer"]')
    cadre.click('[data-zone="europe"]')
    cadre.click('[data-action="jouer"]')
    cadre.wait_for_function("jeu.carte && jeu.carte.zone.id === 'europe'")
    occupe = cadre.evaluate("""() => [...document.querySelectorAll('.hud *')].filter(e => {
        const r = e.getBoundingClientRect(); return r.width && r.height && r.left < 120 && r.top < 44 && e.children.length === 0 && e.textContent.trim(); })
        .map(e => e.className || e.tagName)""")
    verifier(not occupe, f'dans Ludiworld : le coin en haut à gauche reste libre {occupe}')
    jouer_dans_cadre(page, cadre)
    cadre.wait_for_selector('.fin', timeout=3000)
    page.wait_for_timeout(300)
    evenements = [m['event'] for m in page.evaluate('recus') if m.get('type') == 'ludi:event']
    sortes = [e['kind'] for e in evenements]
    verifier('checkpoint' in sortes, f'dans Ludiworld : un point d\'arrêt en fin de manche ({sorted(set(sortes))})')
    competences = [e for e in evenements if e['kind'] == 'skill']
    verifier(len(competences) == 12 and all(e['domain'] == 'geographie.pays' for e in competences),
             f'dans Ludiworld : une notion par question ({len(competences)})')
    verifier(any(e['item'] == 'Suède' for e in competences), 'dans Ludiworld : la notion porte le nom du pays')
    verifier(cadre.evaluate("localStorage.getItem('monde-a-la-craie.v1.Joshua') !== null"), 'dans Ludiworld : progression rangée sous le prénom')
    page.evaluate("envoyer({ type: 'ludi:wrapup', minutes: 0 })")
    page.wait_for_timeout(100)
    cadre.click('[data-action="changer"]')
    cadre.click('[data-zone="europe"]')
    cadre.click('[data-action="jouer"]')
    finir = cadre.evaluate('jeu.manche.question')
    jouer_dans_cadre(page, cadre)
    cadre.wait_for_selector('.fin', timeout=3000)
    verifier(cadre.locator('[data-action="encore"]').count() == 0, "temps écoulé : plus de « Encore une manche »")
    verifier(not erreurs, f'dans Ludiworld : aucune erreur ({erreurs[:2]})')
    page.close()

    # Dans Ludiworld, téléphone en paysage, nom long : le compteur reste sur une ligne, hors du coin réservé.
    page = nav.new_page(viewport={'width': 800, 'height': 360}, locale='fr-FR')
    page.goto(f'{BASE}/tests/lanceur.html')
    page.wait_for_function("document.getElementById('jeu').contentWindow.jeu?.pret", timeout=15000)
    cadre = page.frames[1]
    cadre.click('[data-zone="afrique"]')
    cadre.click('[data-action="jouer"]')
    cadre.wait_for_function("jeu.carte && jeu.carte.zone.id === 'afrique'")
    cadre.evaluate("jeu.ecrireNom('République démocratique du Congo')")
    page.wait_for_timeout(300)
    c = cadre.locator('#compteur').bounding_box()
    verifier(c['width'] > 40 and c['height'] < 45, f'dans Ludiworld en paysage : le compteur tient sur une ligne ({c})')
    verifier(c['x'] >= 120 or c['y'] >= 44, f'dans Ludiworld en paysage : le compteur laisse le coin libre ({c})')
    page.close()


AUTRE_PAYS = """(z) => { const q = jeu.manche.question;
  return jeu.app.monde.find(f => f.properties.quiz && f.properties.zone === z && f.properties.code !== q
    && !jeu.manche.trouvesSet.has(f.properties.code) && f.properties.rang < 20).properties.code; }"""


def test_corrections(nav):
    print('corrections de la relecture')
    # Pause pendant la dernière erreur : la manche suivante doit se jouer normalement.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'europe')
    while page.evaluate('jeu.manche.faites') < 11:
        toucher(page, page.evaluate('jeu.manche.question'))
    toucher(page, page.evaluate(AUTRE_PAYS, 'europe'))
    continuer(page)
    toucher(page, page.evaluate(AUTRE_PAYS, 'europe'))
    page.click('[data-action="pause"]')
    page.wait_for_timeout(1700)
    verifier(page.locator('.fin').count() == 0, "pause pendant l'erreur : la fin attend la reprise")
    page.click('[data-action="reprendre"]')
    continuer(page)
    page.wait_for_selector('.fin', timeout=3000)
    page.click('[data-action="encore"]')
    page.wait_for_timeout(300)
    toucher(page, page.evaluate('jeu.manche.question'))
    verifier(page.inner_text('#compteur').strip() == '1 / 12', f"après une pause pendant l'erreur, la manche suivante se joue ({page.inner_text('#compteur')!r})")
    page.close()

    # Découvrir sur téléphone en paysage : un nom long ne recouvre pas la carte.
    page, erreurs = ouvrir_jeu(nav, 800, 360)
    lancer(page, 'afrique', 'decouvrir')
    toucher(page, 'CD')
    page.wait_for_timeout(300)
    boite = page.locator('#nom').bounding_box()
    v = page.evaluate('jeu.carte.zoneVisible')
    verifier(boite['y'] + boite['height'] <= v['y0'] + 1, f'Découvrir : un nom long ne recouvre pas la carte ({boite} / {v})')
    page.close()

    # Téléphone en paysage : la carte garde une taille utile.
    page, erreurs = ouvrir_jeu(nav, 800, 360)
    lancer(page, 'afrique')
    v = page.evaluate('jeu.carte.zoneVisible')
    verifier(v['y1'] - v['y0'] >= 220, f"téléphone en paysage : la carte fait au moins 220 px de haut ({v['y1'] - v['y0']})")
    page.close()

    # Accueil : la carte du monde ne zoome pas (les continents écrits restent à leur place).
    page, erreurs = ouvrir_jeu(nav)
    page.mouse.move(640, 400)
    page.mouse.wheel(0, -400)
    page.wait_for_timeout(200)
    verifier(page.evaluate('jeu.carte.zoom') == 1, "accueil : la carte du monde ne zoome pas")
    # Langue : on peut la choisir dans les réglages.
    page.click('[data-action="reglages"]')
    page.select_option('[data-reglage="langue"]', 'en')
    page.wait_for_timeout(300)
    verifier(page.inner_text('.titre').strip() == 'The World in Chalk', f"réglages : la langue passe en anglais ({page.inner_text('.titre')!r})")
    page.reload()
    page.wait_for_function('window.jeu && jeu.pret')
    verifier(page.inner_text('.titre').strip() == 'The World in Chalk', 'la langue choisie est gardée')
    page.close()


def test_savoirs(nav):
    print('savoirs')
    CAPTURES.mkdir(exist_ok=True)
    # Découvrir l'Europe : à côté de la carte, une fiche avec la capitale et trois savoirs, qui ne cache jamais la carte.
    for (nom, w, h) in [('tablette', 1280, 800), ('portrait', 390, 844), ('paysage-telephone', 800, 360)]:
        page, erreurs = ouvrir_jeu(nav, w, h)
        lancer(page, 'europe', 'decouvrir')
        verifier(page.locator('.fiche-pays').is_visible(), f'{nom} : Découvrir l’Europe montre la fiche')
        toucher(page, 'ES')
        page.wait_for_timeout(300)
        texte = page.inner_text('.fiche-pays')
        verifier('Madrid' in texte and page.locator('.fiche-pays .fait').count() == 3, f'{nom} : la fiche de l’Espagne ({texte[:60]!r})')
        b = page.locator('.fiche-pays').bounding_box()
        v = page.evaluate('jeu.carte.zoneVisible')
        verifier(v['x1'] <= b['x'] + 1 or v['y1'] <= b['y'] + 1, f'{nom} : la fiche ne couvre pas la carte ({b} / {v})')
        verifier(b['y'] + b['height'] <= h - 60, f'{nom} : la fiche laisse les boutons du bas libres ({b})')
        page.screenshot(path=str(CAPTURES / f'savoirs-decouvrir-{nom}.png'))
        verifier(not erreurs, f'{nom} : aucune erreur ({erreurs[:2]})')
        page.close()

    # Ailleurs (pas encore de savoirs) : pas de fiche, la carte garde toute la place.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'afrique', 'decouvrir')
    verifier(page.locator('.fiche-pays').count() == 0, 'Découvrir l’Afrique : pas de fiche vide')
    page.close()

    # Une erreur en Europe : une note « Le savais-tu ? » sur le bon pays, le chrono s'arrête, on touche pour continuer.
    for (nom, w, h) in [('tablette', 1280, 800), ('portrait', 390, 844)]:
        page, erreurs = ouvrir_jeu(nav, w, h)
        lancer(page, 'europe')
        q = page.evaluate('jeu.manche.question')
        toucher(page, page.evaluate(AUTRE_PAYS, 'europe'))
        page.wait_for_timeout(200)
        verifier(page.locator('.savoir').is_visible(), f'{nom} : après une erreur, la note « Le savais-tu ? »')
        nomPays = page.evaluate('c => jeu.app.nom(c)', q)
        verifier(nomPays in page.inner_text('.savoir'), f'{nom} : la note parle du pays à trouver ({nomPays})')
        b = page.locator('.savoir').bounding_box()
        x, y = page.evaluate('c => jeu.carte.ancreEcran(c)', q)
        verifier(not (b['x'] <= x <= b['x'] + b['width'] and b['y'] <= y <= b['y'] + b['height']), f'{nom} : la note ne cache pas le pays entouré')
        page.screenshot(path=str(CAPTURES / f'savoirs-erreur-{nom}.png'))
        chrono = page.inner_text('#chrono')
        page.click('.savoir')
        verifier(page.locator('.savoir').is_visible(), f'{nom} : un toucher trop rapide ne fait pas passer la note')
        page.wait_for_timeout(1800)
        verifier(page.locator('.savoir').is_visible() and page.inner_text('#nom').strip() == nomPays, f'{nom} : la manche attend qu’on ait lu')
        verifier(page.inner_text('#chrono') == chrono, f'{nom} : le chrono s’arrête pendant la lecture ({chrono} / {page.inner_text("#chrono")})')
        page.click('.savoir')
        page.wait_for_timeout(200)
        verifier(page.locator('.savoir').is_hidden() and page.inner_text('#nom').strip() != nomPays, f'{nom} : toucher la note fait continuer')
        page.wait_for_timeout(1200)
        verifier(page.inner_text('#chrono') != chrono, f'{nom} : le chrono repart')
        verifier(not erreurs, f'{nom} : aucune erreur ({erreurs[:2]})')
        page.close()

    # Une erreur hors d'Europe : comme avant, on continue tout seul.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'afrique')
    q = page.evaluate('jeu.manche.question')
    toucher(page, page.evaluate(AUTRE_PAYS, 'afrique'))
    page.wait_for_timeout(1800)
    verifier(page.locator('.savoir:not([hidden])').count() == 0 and page.evaluate('jeu.manche.question') != q, 'hors d’Europe : on continue tout seul')
    page.close()

    # En anglais : la capitale aussi.
    page, erreurs = ouvrir_jeu(nav, init="localStorage.setItem('monde-a-la-craie.v1', JSON.stringify({ langue: 'en' }))")
    lancer(page, 'europe', 'decouvrir')
    toucher(page, 'GB')
    texte = page.inner_text('.fiche-pays')
    verifier('Capital' in texte and 'London' in texte, f'en anglais : {texte[:50]!r}')
    page.close()


SECTIONS = {'carte': test_carte, 'ecrans': test_ecrans, 'appli': test_appli, 'corrections': test_corrections, 'savoirs': test_savoirs}

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
