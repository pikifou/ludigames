"""Le Chemin du Roi : toucher le plateau pendant une explication appelle le bouton « Suivant ».
python tests/chemin-demo.py"""
import subprocess, sys, time, pathlib
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
PORT = 7373
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=str(pathlib.Path(__file__).parents[1]),
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
ok = True
def verifie(c, txt):
    global ok
    print(('  ok  ' if c else '  ÉCHEC  ') + txt); ok &= bool(c)
try:
    with sync_playwright() as pw:
        nav = pw.chromium.launch(args=['--mute-audio'])
        page = nav.new_page(viewport={'width': 768, 'height': 1024})
        err = []
        page.on('pageerror', lambda e: err.append(str(e)))
        page.goto(f'http://localhost:{PORT}/chemin-du-roi/?lecon=dame')
        page.wait_for_selector('.plateau.demo')
        verifie(page.locator('.plateau.demo').count() == 1, 'une explication : le plateau est en démonstration')
        r = page.locator('.cases').bounding_box()
        page.mouse.click(r['x'] + r['width'] * .45, r['y'] + r['height'] * .3)
        page.wait_for_timeout(300)
        verifie(page.locator('.suite.appelle').count() == 1, 'toucher le plateau appelle « Suivant »')
        verifie('Suivant' in page.locator('.bulle .aide').inner_text(), 'la bulle dit d\'appuyer sur « Suivant »')
        for _ in range(4):  # jusqu'au premier exercice
            if page.locator('.objectif .pot').count(): break
            page.locator('.suite').click(force=True)
            page.wait_for_timeout(900)
        verifie(page.locator('.plateau.demo').count() == 0, 'l\'exercice : le plateau n\'est plus en démonstration')
        verifie(not err, f'aucune erreur ({err})')
        nav.close()
finally:
    srv.terminate()
print('\nTOUT EST BON' if ok else '\nÇA NE VA PAS'); sys.exit(0 if ok else 1)
