"""Tests dans le navigateur (Playwright) : python tests/navigateur.py [carte|ecrans|appli|corrections|savoirs]

Lance un petit serveur sur le port 7360 à la racine de ludigames (jamais 8000).
"""
import pathlib
import json
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

    # Le bon pays entouré : sa terre et ses îles proches, pas les îles lointaines (Açores, Galápagos, Hawaï…).
    for zone, code, loin, terre in [('europe', 'PT', [-28, 38.5], (-9.5, -6.2, 39.5)), ('europe', 'ES', [-15.5, 28.1], (-9.3, 3.3, 40)),
                                    ('europe', 'NL', None, (3.4, 7.2, 52.3)), ('amerique-sud', 'EC', [-90.5, -0.7], (-81, -75.2, -1.5)),
                                    ('amerique-nord', 'US', [-157, 21], (-124.5, -67, 40))]:
        page, _ = page_carte(nav, zone, 1280, 800)
        page.evaluate(f"carte.etat('{code}', 'montre')")
        e = page.evaluate("(() => { const e = document.querySelector('.entoure'); return ['cx', 'cy', 'rx', 'ry'].map(a => +e.getAttribute(a)); })()")
        x0, x1 = page.evaluate(f"[carte.ecranDe([{terre[0]}, {terre[2]}])[0], carte.ecranDe([{terre[1]}, {terre[2]}])[0]]")
        verifier(2 * e[2] <= 2 * abs(x1 - x0) + 40, f'{code} : l’ellipse reste à la taille du pays ({2 * e[2]:.0f} px pour {abs(x1 - x0):.0f} px de terre)')
        if loin:
            lx, ly = page.evaluate(f'carte.ecranDe({loin})')
            verifier(((lx - e[0]) / e[2]) ** 2 + ((ly - e[1]) / e[3]) ** 2 > 1, f'{code} : les îles lointaines ne sont pas entourées')
        page.close()

    page, _ = page_carte(nav, 'europe', 1280, 800)
    # La mer : une craie bleutée sous les pays, partout où il n'y a pas de terre (les lacs des pays restent des terres),
    # plus claire le long des côtes (pour bien voir les littoraux), avec un grain de craie.
    page.wait_for_function("carte.toileMer && carte.toileMer.isConnected")
    pixel = """(lonlat) => { const t = carte.toileMer, r = document.querySelector('svg').getBoundingClientRect(), [x, y] = carte.ecranDe(lonlat);
      const s = t.width / r.width, n = 5, d = t.getContext('2d').getImageData(Math.round((x - r.left) * s) - 2, Math.round((y - r.top) * s) - 2, n, n).data;
      let a = 0, b = 0, rr = 0, lum = 0; const fond = [43, 63, 55];   // l'ardoise sous la mer
      for (let i = 0; i < d.length; i += 4) { const al = d[i + 3] / 255; a += d[i + 3]; b += d[i + 2] * d[i + 3]; rr += d[i] * d[i + 3];
        lum += [0, 1, 2].reduce((s, c) => s + al * d[i + c] + (1 - al) * fond[c], 0) / 3; }
      return { alpha: a / (n * n), bleu: b > rr, clarte: lum / (n * n) }; }"""
    mer = [page.evaluate(pixel, pt)['alpha'] > 0 for pt in ([3, 56], [-20, 45], [18, 35], [2.5, 47], [10, 51], [-4, 40])]
    verifier(mer == [True, True, True, False, False, False], f'la mer est bleutée, pas les terres (mer du Nord, Atlantique, Méditerranée / France, Allemagne, Espagne : {mer})')
    # Depuis la terre (un point de terre et un point du large), on cherche la côte, puis on mesure la clarté à quelques pixels.
    littoral = """([terre, mer]) => { const t = carte.toileMer, c = t.getContext('2d'), r = document.querySelector('svg').getBoundingClientRect(), s = t.width / r.width;
      const fond = [43, 63, 55], [ax, ay] = carte.ecranDe(terre), [bx, by] = carte.ecranDe(mer), n = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / n, uy = (by - ay) / n;
      const clarte = q => { const d = c.getImageData(Math.round((ax + ux * q - r.left) * s), Math.round((ay + uy * q - r.top) * s), 1, 1).data, a = d[3] / 255;
        return { a: d[3], l: [0, 1, 2].reduce((v, i) => v + a * d[i] + (1 - a) * fond[i], 0) / 3 }; };
      let q = 0; while (q < n && clarte(q).a === 0) q++;
      const moy = (de, a) => { let v = 0; for (let i = de; i <= a; i++) v += clarte(q + i).l; return v / (a - de + 1); };
      return { bord: moy(1, 3), cote: moy(8, 14), large: moy(80, 90) }; }"""
    bord_cote = page.evaluate(littoral, [[-8, 39.5], [-20, 39.5]])
    bord, cote, large = {'clarte': bord_cote['bord']}, {'clarte': bord_cote['cote']}, page.evaluate(pixel, [-20, 45])
    verifier(large['bleu'], f'la mer est en craie bleue ({large})')
    verifier(cote['clarte'] < large['clarte'] - 4, f'près des côtes, la mer est plus foncée : elle s’enfonce ({cote["clarte"]:.0f} contre {large["clarte"]:.0f} au large)')
    verifier(bord['clarte'] > cote['clarte'] + 4, f'contre la côte, un liseré clair ({bord["clarte"]:.0f} contre {cote["clarte"]:.0f} un peu plus loin)')
    grain = page.evaluate("""() => { const t = carte.toileMer, r = document.querySelector('svg').getBoundingClientRect(), [x, y] = carte.ecranDe([-22, 47]);
      const s = t.width / r.width, d = t.getContext('2d').getImageData(Math.round((x - r.left) * s), Math.round((y - r.top) * s), 40, 40).data;
      const v = []; for (let i = 3; i < d.length; i += 4) v.push(d[i]); const m = v.reduce((a, b) => a + b) / v.length;
      return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); }""")
    verifier(grain > 3, f'la mer a un grain de craie (écart {grain:.1f})')
    # Après un zoom, la mer est repeinte à la nouvelle échelle : le grain garde sa taille, la côte reste nette.
    bx, by = page.evaluate('carte.ecranDe([-4.5, 48.3])')
    for _ in range(9):
        page.mouse.move(bx, by); page.mouse.wheel(0, -100); page.wait_for_timeout(20)
    page.wait_for_timeout(600)
    verifier(page.evaluate('carte.zoom') > 5 and page.evaluate('carte.toileMer.style.transform') in ('translate(0px, 0px) scale(1)', 'none', ''),
             f"après un zoom, la mer est repeinte à la nouvelle échelle ({page.evaluate('carte.toileMer.style.transform')})")
    z = page.evaluate(littoral, [[-3.5, 48.2], [-7, 48.2]])
    verifier(z['cote'] < z['large'] - 4 and z['bord'] > z['cote'] + 4,
             f"zoomé : liseré clair puis mer plus foncée le long de la Bretagne ({z['bord']:.0f} / {z['cote']:.0f} / {z['large']:.0f})")
    page.evaluate('carte.vueEntiere()')
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


def repondre(page, code):
    """Toucher un pays, puis passer la note « Le savais-tu ? » si elle s'ouvre (après une bonne réponse aussi)."""
    toucher(page, code)
    if page.locator('.savoir:not([hidden])').count():
        continuer(page)


def finir_manche(page):
    vus = []
    while not page.evaluate('jeu.manche.finie'):
        q = page.evaluate('jeu.manche.question')
        vus.append(q)
        repondre(page, q)
    return vus


def encore(page):
    """« Encore une manche » : les boutons de fin ne répondent qu'après un court instant."""
    page.wait_for_timeout(1100)
    page.click('[data-action="encore"]')
    page.wait_for_timeout(300)


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

    # En Difficile : le nom le plus long d'Afrique peut être demandé.
    page, erreurs = ouvrir_jeu(nav, 360, 640, init="localStorage.setItem('monde-a-la-craie.v1', JSON.stringify({ niveaux: { afrique: 'difficile' } }))")
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
        repondre(page, page.evaluate('jeu.manche.question'))
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
        page.mouse.click(x, y)   # après un zoom (petit pays tout près), on retouche le même pays ; une note ouverte se passe
        page.wait_for_timeout(60)
    page.wait_for_timeout(900)   # la note « Le savais-tu ? » du dernier pays
    if cadre.locator('.savoir:not([hidden])').count():
        cadre.click('.savoir')


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
    page.wait_for_timeout(1100)   # les boutons de fin ne répondent qu'après une seconde
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
    # Le dernier pays trouvé, l'enfant touche encore : la fin apparaît sous son doigt, la manche ne doit pas repartir.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'asie')
    finir_manche(page)
    page.wait_for_selector('.fin', timeout=3000)
    page.click('[data-action="encore"]')
    page.wait_for_timeout(200)
    verifier(page.locator('.fin').count() == 1 and page.evaluate('jeu.manche.finie'),
             'un toucher juste quand la fin apparaît ne relance pas la manche')
    encore(page)
    verifier(page.inner_text('#compteur').strip() == '0 / 12' and page.locator('.voile:not([hidden])').count() == 0,
             f"un peu après, « Encore une manche » relance la manche ({page.inner_text('#compteur')!r})")
    verifier(not erreurs, f'fin de manche : aucune erreur ({erreurs[:2]})')
    page.close()

    # Bonne réponse : la note « Le savais-tu ? » s'ouvre aussi, le chrono attend qu'on l'ait lue.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'europe')
    q = page.evaluate('jeu.manche.question')
    toucher(page, q)
    nom_q = page.evaluate('c => jeu.app.nom(c)', q)
    verifier(page.locator('.savoir:not([hidden])').count() == 1 and nom_q in page.inner_text('.savoir'),
             f'bonne réponse : la note « Le savais-tu ? » parle du pays trouvé ({nom_q})')
    c1 = page.inner_text('#chrono'); page.wait_for_timeout(1000); c2 = page.inner_text('#chrono')
    verifier(c1 == c2, f'bonne réponse : le chrono attend pendant la note ({c1} → {c2})')
    verifier('trouve' in (page.get_attribute(f'path[data-code="{q}"]', 'class') or ''), 'bonne réponse : le pays reste colorié')
    page.click('.savoir')
    page.wait_for_timeout(300)
    suivant = page.evaluate('c => jeu.app.nom(c)', page.evaluate('jeu.manche.question'))
    verifier(page.locator('.savoir:not([hidden])').count() == 0 and page.inner_text('#nom').strip() == suivant,
             f'bonne réponse : toucher la note passe au pays suivant ({suivant})')
    verifier(not erreurs, f'bonne réponse : aucune erreur ({erreurs[:2]})')
    page.close()

    # Un pays raté deux fois : montré, puis plus entouré quand on passe la note (sinon on croit qu'il faut encore le chercher).
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'europe')
    cible = page.evaluate('jeu.manche.question')
    for _ in range(30):
        q = page.evaluate('jeu.manche.question')
        if q is None:
            break
        if q != cible:
            repondre(page, q)
            continue
        toucher(page, page.evaluate(AUTRE_PAYS, 'europe'))
        verifier(page.locator('.entoure').count() == 1, 'raté : le bon pays est entouré')
        continuer(page)
        page.wait_for_timeout(200)
        verifier(page.locator('.entoure').count() == 0, f'raté : quand on passe la note, le pays n’est plus entouré ({cible})')
    verifier(page.evaluate('jeu.manche.finie'), 'raté deux fois : la manche va au bout')
    page.close()

    # Pause pendant la dernière erreur : la manche suivante doit se jouer normalement.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'europe')
    while page.evaluate('jeu.manche.faites') < 11:
        repondre(page, page.evaluate('jeu.manche.question'))
    toucher(page, page.evaluate(AUTRE_PAYS, 'europe'))
    continuer(page)
    toucher(page, page.evaluate(AUTRE_PAYS, 'europe'))
    page.click('[data-action="pause"]')
    page.wait_for_timeout(1700)
    verifier(page.locator('.fin').count() == 0, "pause pendant l'erreur : la fin attend la reprise")
    page.click('[data-action="reprendre"]')
    continuer(page)
    page.wait_for_selector('.fin', timeout=3000)
    encore(page)
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

    # Tous les continents ont leurs savoirs ; Israël et la Palestine, sans capitale (elle est disputée).
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'afrique', 'decouvrir')
    toucher(page, 'KE')
    page.wait_for_timeout(300)
    verifier('Nairobi' in page.inner_text('.fiche-pays') and page.locator('.fiche-pays .fait').count() == 3, 'Découvrir l’Afrique : la fiche du Kenya')
    page.close()
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'asie', 'decouvrir')
    toucher(page, 'IL')
    page.wait_for_timeout(300)
    verifier('Capitale' not in page.inner_text('.fiche-pays') and page.locator('.fiche-pays .fait').count() == 3, 'Israël : trois savoirs, pas de capitale')
    verifier(not erreurs, f'asie : aucune erreur ({erreurs[:2]})')
    page.close()

    # Sans le fichier des savoirs : pas de fiche, la carte garde toute la place.
    page = nav.new_page(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
    page.route('**/savoirs.json', lambda r: r.abort())
    page.goto(JEU)
    page.wait_for_function('window.jeu && window.jeu.pret', timeout=15000)
    lancer(page, 'europe', 'decouvrir')
    verifier(page.locator('.fiche-pays').count() == 0, 'sans savoirs : pas de fiche vide')
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

    # La bande « Le savais-tu ? » : elle vient du côté, avec le drapeau, les couleurs du pays et une image (France, Espagne,
    # Italie, Allemagne, Royaume-Uni pour l'instant) ; elle ne cache ni le pays montré, ni le pays touché par erreur.
    AVEC_IMAGES = {'FR', 'ES', 'IT', 'DE', 'GB'}
    for (nom, w, h) in [('tablette', 1280, 800), ('portrait', 390, 844), ('paysage-telephone', 800, 360)]:
        page, erreurs = ouvrir_jeu(nav, w, h)
        lancer(page, 'europe')
        vus = 0
        for _ in range(40):
            q = page.evaluate('jeu.manche.question')
            if q is None or vus == 2:
                break
            if q not in AVEC_IMAGES:
                repondre(page, q)
                continue
            # La première fois, la bonne réponse ; la seconde, une erreur (la bande parle alors du bon pays).
            touche = q if vus == 0 else page.evaluate(AUTRE_PAYS, 'europe')
            toucher(page, touche)
            page.wait_for_timeout(500)
            bande = page.locator('.savoir')
            verifier(bande.is_visible(), f'{nom} : la bande s’ouvre ({q})')
            drapeau = page.get_attribute('.savoir .drapeau', 'src') or ''
            verifier(drapeau.endswith(f'drapeaux/{q.lower()}.svg'), f'{nom} : le drapeau du pays ({drapeau})')
            verifier(q.lower() + '.svg' in (page.evaluate("getComputedStyle(document.querySelector('.savoir')).getPropertyValue('--drapeau')") or ''),
                     f'{nom} : la bande prend les couleurs du drapeau')
            photo = page.locator('.savoir .photo img')
            verifier(photo.count() == 1 and page.evaluate("document.querySelector('.savoir .photo img').naturalWidth") > 0,
                     f'{nom} : une image illustre le savoir')
            verifier(re.search(r'(domaine public|CC0|CC BY)', page.inner_text('.savoir .credit'), re.I) is not None, f'{nom} : le crédit de l’image ({page.inner_text(".savoir .credit")!r})')
            b = bande.bounding_box()
            if w > h:
                verifier(b['x'] <= 20 or b['x'] + b['width'] >= w - 20, f'{nom} : la bande est sur le côté ({b})')
                verifier(b['width'] <= w * 0.45, f'{nom} : la bande reste étroite ({b["width"]:.0f} px)')
            for c in {q, touche}:
                x, y = page.evaluate('c => jeu.carte.ancreEcran(c)', c)
                verifier(not (b['x'] <= x <= b['x'] + b['width'] and b['y'] <= y <= b['y'] + b['height']), f'{nom} : la bande ne cache pas {c}')
            page.screenshot(path=str(CAPTURES / f'savoirs-bande-{nom}-{vus + 1}.png'))
            vus += 1
            continuer(page)
        verifier(vus == 2, f'{nom} : deux bandes vues ({vus})')
        verifier(not erreurs, f'{nom} : aucune erreur ({erreurs[:2]})')
        page.close()

    # Sans le fichier des savoirs : après une erreur, on continue tout seul, comme avant.
    page = nav.new_page(viewport={'width': 1280, 'height': 800}, locale='fr-FR')
    page.route('**/savoirs.json', lambda r: r.abort())
    page.goto(JEU)
    page.wait_for_function('window.jeu && window.jeu.pret', timeout=15000)
    lancer(page, 'afrique')
    q = page.evaluate('jeu.manche.question')
    toucher(page, page.evaluate(AUTRE_PAYS, 'afrique'))
    page.wait_for_timeout(1800)
    verifier(page.locator('.savoir:not([hidden])').count() == 0 and page.evaluate('jeu.manche.question') != q, 'sans savoirs : on continue tout seul')
    page.close()

    # Une erreur en Afrique : la note « Le savais-tu ? » aussi.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'afrique')
    toucher(page, page.evaluate(AUTRE_PAYS, 'afrique'))
    page.wait_for_timeout(300)
    verifier(page.locator('.savoir').is_visible(), 'erreur en Afrique : la note s’ouvre')
    page.screenshot(path=str(CAPTURES / 'savoirs-erreur-afrique.png'))
    page.close()

    # En anglais : la capitale aussi.
    page, erreurs = ouvrir_jeu(nav, init="localStorage.setItem('monde-a-la-craie.v1', JSON.stringify({ langue: 'en' }))")
    lancer(page, 'europe', 'decouvrir')
    toucher(page, 'GB')
    texte = page.inner_text('.fiche-pays')
    verifier('Capital' in texte and 'London' in texte, f'en anglais : {texte[:50]!r}')
    page.close()


FACILES = "import('./js/niveaux.js').then(m => m.LISTES.facile)"


def test_niveaux(nav):
    print('niveaux')
    CAPTURES.mkdir(exist_ok=True)
    # Par défaut, Facile : 14 pays d'Europe, les autres estompés, sans rond pour le Vatican.
    for (nom, w, h) in [('tablette', 1280, 800), ('portrait', 390, 844)]:
        page, erreurs = ouvrir_jeu(nav, w, h)
        page.click('[data-zone="europe"]')
        verifier(page.get_attribute('[data-niveau="facile"]', 'aria-pressed') == 'true', f'{nom} : Facile choisi par défaut')
        verifier('14 pays' in page.inner_text('[data-niveau="facile"]') and '46 pays' in page.inner_text('[data-niveau="difficile"]'),
                 f'{nom} : chaque niveau dit son nombre de pays')
        page.screenshot(path=str(CAPTURES / f'niveaux-{nom}.png'))
        page.close()

    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'europe')
    faciles = page.evaluate(FACILES)
    verifier('Facile' in page.inner_text('.zone-courante'), 'le niveau est écrit en bas de la carte')
    verifier('estompe' in (page.get_attribute('path[data-code="MD"]', 'class') or ''), 'Facile : la Moldavie est estompée')
    verifier('estompe' not in (page.get_attribute('path[data-code="FR"]', 'class') or ''), 'Facile : la France ne l’est pas')
    verifier(page.locator('.rond[data-code="VA"]').count() == 0, 'Facile : pas de rond pour le Vatican')
    page.screenshot(path=str(CAPTURES / 'niveau-facile-tablette.png'))
    # Toucher un pays estompé : une erreur comme une autre, son nom s'écrit.
    toucher(page, 'MD')
    verifier('erreur' in (page.get_attribute('path[data-code="MD"]', 'class') or ''), 'un pays estompé touché compte comme une erreur')
    continuer(page)
    vus = finir_manche(page)
    page.wait_for_selector('.fin', timeout=3000)
    verifier(all(c in faciles for c in vus), f'Facile : seulement des pays faciles ({[c for c in vus if c not in faciles]})')
    verifier(not erreurs, f'aucune erreur ({erreurs[:2]})')

    # Difficile : rien d'estompé, et le choix est gardé.
    page.wait_for_timeout(1100)   # les boutons de fin ne répondent qu'après une seconde
    page.click('[data-action="changer"]')
    page.click('[data-zone="europe"]')
    page.click('[data-niveau="difficile"]')
    page.click('[data-action="jouer"]')
    page.wait_for_function('window.jeu.manche')
    verifier(page.locator('path.estompe').count() == 0, 'Difficile : aucun pays estompé')
    page.reload()
    page.wait_for_function('window.jeu && window.jeu.pret')
    page.click('[data-zone="europe"]')
    verifier(page.get_attribute('[data-niveau="difficile"]', 'aria-pressed') == 'true', 'le niveau choisi est gardé pour l’Europe')
    page.click('[data-action="fermer"]')
    page.click('[data-zone="afrique"]')
    verifier(page.get_attribute('[data-niveau="facile"]', 'aria-pressed') == 'true', '… et seulement pour l’Europe')
    page.close()

    # L'Océanie en Facile : une manche courte, de 4 pays.
    page, erreurs = ouvrir_jeu(nav)
    lancer(page, 'oceanie')
    verifier(page.inner_text('#compteur').strip() == '0 / 4', f"Océanie facile : {page.inner_text('#compteur')!r}")
    finir_manche(page)
    page.wait_for_selector('.fin', timeout=3000)
    verifier('4 pays' in page.inner_text('.fin'), 'Océanie facile : la manche finit après 4 pays')
    page.close()

    # Le monde entier : ouvert en Facile quand les pays faciles sont connus ; Moyen reste fermé.
    page, erreurs = ouvrir_jeu(nav)
    faciles = page.evaluate(FACILES)
    page.close()
    init = "localStorage.setItem('monde-a-la-craie.v1', JSON.stringify({ connus: %s }))" % json.dumps(faciles)
    page, erreurs = ouvrir_jeu(nav, init=init)
    page.click('[data-zone="monde"]')
    verifier(page.locator('[data-niveau="moyen"][aria-disabled="true"]').count() == 1, 'monde : Moyen fermé')
    page.click('[data-niveau="moyen"]', force=True)
    verifier(page.locator('.niveau-ferme').is_visible() and page.get_attribute('[data-niveau="facile"]', 'aria-pressed') == 'true',
             'monde : toucher Moyen explique comment l’ouvrir, Facile reste choisi')
    page.screenshot(path=str(CAPTURES / 'niveaux-monde.png'))
    page.click('[data-action="jouer"]')
    page.wait_for_function('window.jeu.manche')
    verifier(page.evaluate('jeu.manche.file').__len__() == 12 and all(c in faciles for c in page.evaluate('jeu.manche.file')), 'monde facile : 12 pays faciles')
    verifier(not erreurs, f'monde : aucune erreur ({erreurs[:2]})')
    page.close()


SECTIONS = {'carte': test_carte, 'ecrans': test_ecrans, 'appli': test_appli, 'corrections': test_corrections, 'savoirs': test_savoirs, 'niveaux': test_niveaux}

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
