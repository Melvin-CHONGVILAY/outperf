"""App Store screenshots, 6.9 inch iPhone (1320 x 2868): real app screens with example data, framed with a headline."""
import asyncio, subprocess, sys, time, datetime as dt, base64, pathlib
from playwright.async_api import async_playwright
OUT = pathlib.Path('/home/claude/outperf-gh/app/store/screenshots'); RAW = OUT / 'raw'; RAW.mkdir(parents=True, exist_ok=True)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8772', '--bind', '127.0.0.1'], cwd='/home/claude/outperf-gh', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SHOTS = [
  ('01-aujourdhui', 'Bats ton toi\nd\'hier.', 'Chaque jour comparé à la veille, en direct.'),
  ('02-chrono', 'Chaque heure\ncompte.', 'Chrono ou rounds, le temps va dans la bonne catégorie.'),
  ('03-stats', 'Tes stats,\nsans filtre.', 'Jour, semaine, mois. Glisse pour comparer.'),
  ('04-regularite', 'La discipline\nse voit.', 'Un calendrier qui ne ment pas.'),
  ('05-journal', 'Ta note,\nchaque jour.', 'De S à D, selon ton objectif atteint.'),
]
FRAME = '''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:440px;height:956px;background:#0B0F17;overflow:hidden}
body{display:flex;flex-direction:column;align-items:center;font-family:"Inter Display","Inter",sans-serif}
h1{color:#F2F4F8;font-weight:800;font-size:40px;line-height:1.04;letter-spacing:-.025em;text-align:center;margin:44px 24px 10px;white-space:pre-line}
p{color:#9AA3B5;font-family:"Inter",sans-serif;font-size:15.5px;line-height:1.35;text-align:center;margin:0 36px 22px}
.ph{width:352px;height:765px;border-radius:44px;overflow:hidden;box-shadow:0 0 0 7px #1C2230,0 0 0 8px #2E3648,0 30px 60px rgba(0,0,0,.5);flex:none}
.ph img{width:100%;display:block}
em{color:#FFB21E;font-style:normal}
</style></head><body><h1>__H__</h1><p>__P__</p><div class="ph"><img src="data:image/png;base64,__IMG__"></div></body></html>'''
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={'width': 440, 'height': 956}, device_scale_factor=3, is_mobile=True, has_touch=True, color_scheme='dark', timezone_id='Europe/Paris', locale='fr-FR')
        page = await ctx.new_page()
        await page.clock.install(time=dt.datetime(2026, 10, 13, 16, 20, 0))
        await page.goto('http://localhost:8772/'); await page.wait_for_timeout(400)
        await page.add_style_tag(content=':root{--sat:54px!important;--sab:34px!important}')
        await page.evaluate("window.__op.loadDemo(true); const S = window.__op.S; S.demo = false; S.settings.lastBackup = Date.now(); const y = window.__op.addDays(window.__op.today(), -1); S.entries.filter(e => e.d === y).forEach(e => { e.m = Math.round(e.m * 0.38); }); window.__op.replaceState(S); document.querySelector('.onb')?.remove(); document.getElementById('toast')?.remove()")
        await page.wait_for_timeout(300)
        async def shot(name):
            await page.evaluate("document.getElementById('toast')?.classList.remove('in'); document.querySelector('.tip')?.classList.remove('in')")
            await page.wait_for_timeout(250)
            await page.screenshot(path=str(RAW / f'{name}.png'))
        # 1 today with a live session
        await page.locator('#tabs .tab').nth(0).click(); await page.wait_for_timeout(200)
        await page.evaluate("(() => { const S = window.__op.S; const c = S.cats.find(x => x.name === 'Travail projets'); S.timer = { mode: 'chrono', c: c.id, segs: [], runStart: Date.now() - (47 * 60 + 12) * 1000, dur: 0, started: Date.now() }; window.__op.replaceState(S); })()")
        await page.wait_for_timeout(1200)
        await page.locator('#tabs .tab').nth(0).click(); await page.wait_for_timeout(500)
        await shot('01-aujourdhui')
        await page.locator('#tabs .tab').nth(1).click(); await page.wait_for_timeout(1200)
        await shot('02-chrono')
        await page.locator('#tabs .tab').nth(2).click(); await page.wait_for_timeout(700)
        await shot('03-stats')
        y = await page.evaluate("(() => { const h = [...document.querySelectorAll('.chart-card h2')].find(x => x.textContent === 'Régularité'); return h.closest('section').offsetTop - 10; })()")
        await page.evaluate(f"document.getElementById('app').scrollTop = {y}"); await page.wait_for_timeout(400)
        await shot('04-regularite')
        await page.locator('#tabs .tab').nth(3).click(); await page.wait_for_timeout(500)
        await page.locator('.day-h').nth(1).click(); await page.wait_for_timeout(300)
        await shot('05-journal')
        # frame
        fctx = await b.new_context(viewport={'width': 440, 'height': 956}, device_scale_factor=3)
        fp = await fctx.new_page()
        for name, head, sub in SHOTS:
            img = base64.b64encode((RAW / f'{name}.png').read_bytes()).decode()
            hh = head.replace("\n", "\n")
            await fp.set_content(FRAME.replace('__H__', hh).replace('__P__', sub).replace('__IMG__', img))
            await fp.wait_for_timeout(200)
            await fp.screenshot(path=str(OUT / f'{name}.png'))
        await b.close()
asyncio.run(main()); srv.terminate()
from PIL import Image
for p in sorted(OUT.glob('*.png')): print(p.name, Image.open(p).size)
