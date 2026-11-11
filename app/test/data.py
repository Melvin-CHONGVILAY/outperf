"""Backup, restore, CSV export and table import, end to end (web build and native build with fake plugins)."""
import asyncio, subprocess, sys, time, datetime as dt, json, pathlib, tempfile
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent / 'build'
web = subprocess.Popen([sys.executable, '-m', 'http.server', '8781', '--bind', '127.0.0.1'], cwd=ROOT / 'web', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
nat = subprocess.Popen([sys.executable, '-m', 'http.server', '8782', '--bind', '127.0.0.1'], cwd=ROOT / 'native', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
TMP = pathlib.Path(tempfile.mkdtemp())
errors = []
def check(cond, label):
    print(('ok   ' if cond else 'FAIL ') + label)
    if not cond: errors.append(label)

FAKE_CAP = '''
window.__calls = []; window.__files = {};
const store = {};
window.Capacitor = { isNativePlatform: () => true, Plugins: {
  Preferences: { get: ({ key }) => Promise.resolve({ value: store[key] || null }), set: ({ key, value }) => { store[key] = value; return Promise.resolve(); } },
  Filesystem: { writeFile: o => { window.__calls.push(['writeFile', o.path, o.directory, o.encoding]); window.__files[o.path] = o.data; return new Promise(r => setTimeout(() => r({ uri: 'file:///cache/' + o.path }), 50)); } },
  Share: { share: o => { window.__calls.push(['share', o.files]); return window.__shareMode === 'cancel' ? Promise.reject(new Error('Share canceled')) : window.__shareMode === 'fail' ? Promise.reject(new Error('boom')) : new Promise(r => setTimeout(() => r({}), 300)); } },
  Haptics: { impact: () => Promise.resolve(), notification: () => Promise.resolve() },
  LocalNotifications: { checkPermissions: () => Promise.resolve({ display: 'denied' }), cancel: () => { window.__calls.push(['cancelNotif']); return Promise.resolve(); }, schedule: () => Promise.resolve() },
  KeepAwake: { keepAwake: () => Promise.resolve(), allowSleep: () => { window.__calls.push(['allowSleep']); return Promise.resolve(); } },
  SplashScreen: { hide: () => Promise.resolve() }, StatusBar: { setStyle: () => Promise.resolve() },
} };
'''

async def settings_row(page, title):
    await page.evaluate("window.__op.go('settings')"); await page.wait_for_timeout(200)
    await page.get_by_role('button', name=title).first.click()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # ---------- native build: share sheet path
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, timezone_id='Europe/Paris')
        await ctx.add_init_script(FAKE_CAP)
        page = await ctx.new_page()
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        await page.clock.install(time=dt.datetime(2026, 11, 11, 9, 30, 0))
        await page.goto('http://localhost:8782/'); await page.wait_for_timeout(500)
        await page.evaluate("window.__op.loadDemo(true); document.querySelectorAll('.onb').forEach(e=>e.remove())")
        await settings_row(page, 'Sauvegarder')
        await page.get_by_role('button', name='Sauvegarder').first.click()  # double tap while the sheet is open
        await page.wait_for_timeout(600)
        calls = await page.evaluate('window.__calls')
        check(sum(1 for c in calls if c[0] == 'share') == 1, 'native: one share sheet even on double tap')
        check(any(c[0] == 'writeFile' and c[2] == 'CACHE' and c[3] == 'utf8' for c in calls), 'native: file written to cache as utf8')
        check(await page.evaluate('window.__op.S.settings.lastBackup > 0'), 'native: backup date recorded')
        name = [c for c in calls if c[0] == 'writeFile'][0][1]
        backup = await page.evaluate(f'window.__files[{json.dumps(name)}]')
        check(json.loads(backup)['data']['entries'] and name.endswith('.json'), 'native: backup file content')
        await page.evaluate("window.__shareMode='cancel'; window.__op.S.settings.lastBackup=0")
        await settings_row(page, 'Sauvegarder'); await page.wait_for_timeout(500)
        check(await page.evaluate('window.__op.S.settings.lastBackup') == 0 and 'Réessaie' not in (await page.locator('#toast').inner_text()), 'native: cancel is silent')
        await page.evaluate("window.__shareMode='fail'")
        await settings_row(page, 'Exporter pour Excel'); await page.wait_for_timeout(500)
        check('Réessaie' in await page.locator('#toast').inner_text(), 'native: failure shows a message')
        csv_name = [c for c in await page.evaluate('window.__calls') if c[0] == 'writeFile'][-1][1]
        csv = await page.evaluate(f'window.__files[{json.dumps(csv_name)}]')
        check(csv_name.endswith('.csv') and csv.startswith('﻿Date;Jour;'), 'native: CSV with BOM and header')
        # a running round must stop cleanly when the data is replaced
        await page.evaluate("window.__calls=[]")
        await page.evaluate("window.__op.go('chrono')"); await page.wait_for_timeout(200)
        await page.get_by_role('tab', name='Minuteur').click(); await page.get_by_role('button', name='25 min', exact=True).click()
        await page.get_by_role('button', name='Lancer un round de 25 min').click(); await page.wait_for_timeout(200)
        await settings_row(page, 'Tout effacer'); await page.wait_for_timeout(300)
        await page.locator('.sheet').get_by_role('button', name='Tout effacer').click(); await page.wait_for_timeout(400)
        calls = await page.evaluate('window.__calls')
        check(any(c[0] == 'cancelNotif' for c in calls) and any(c[0] == 'allowSleep' for c in calls), 'native: erase stops the round notification and keep awake')
        await ctx.close()

        # ---------- web build: restore from a file, CSV round trip, pasted backup
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, timezone_id='Europe/Paris', accept_downloads=True)
        page = await ctx.new_page()
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        await page.clock.install(time=dt.datetime(2026, 11, 11, 9, 30, 0))
        await page.goto('http://localhost:8781/'); await page.wait_for_timeout(400)
        await page.evaluate("window.__op.loadDemo(true); document.querySelectorAll('.onb').forEach(e=>e.remove())")
        ref = await page.evaluate("({n: window.__op.S.entries.length, tot: window.__op.S.entries.reduce((s,e)=>s+e.m,0), cats: window.__op.S.cats.map(c=>c.name)})")
        # export JSON (download fallback in a desktop-like browser)
        await page.evaluate("window.__op.go('settings')")
        async with page.expect_download() as dl:
            await page.get_by_role('button', name='Sauvegarder').first.click()
        f = TMP / (await dl.value).suggested_filename; await (await dl.value).save_as(f)
        check(f.suffix == '.json' and json.loads(f.read_text())['app'] == 'outperf', 'web: backup downloaded')
        # wipe, then restore through the file picker
        await page.evaluate("window.__op.replaceState(Object.assign({}, window.__op.S, {cats:[], entries:[], timer:null}))")
        await page.evaluate("window.__op.go('settings')")
        async with page.expect_file_chooser() as fc:
            await page.get_by_role('button', name='Restaurer une sauvegarde').click()
        await (await fc.value).set_files(str(f)); await page.wait_for_timeout(400)
        txt = await page.locator('.sheet').inner_text()
        check('Restaurer cette sauvegarde' in txt and f"{ref['n']} sessions" in txt, 'web: restore asks with counts')
        await page.locator('.sheet').get_by_role('button', name='Restaurer').click(); await page.wait_for_timeout(400)
        got = await page.evaluate("({n: window.__op.S.entries.length, tot: window.__op.S.entries.reduce((s,e)=>s+e.m,0), cats: window.__op.S.cats.map(c=>c.name)})")
        check(got == ref, 'web: restore gives back the same data')
        check(await page.locator('input[type=file]').count() == 0, 'web: no file input left behind')
        # restoring the same file twice in a row still works (picker reset)
        async with page.expect_file_chooser() as fc:
            await page.get_by_role('button', name='Restaurer une sauvegarde').click()
        await (await fc.value).set_files(str(f)); await page.wait_for_timeout(400)
        check(await page.locator('.sheet').count() > 0, 'web: second restore opens the confirmation again')
        await page.locator('.sheet').get_by_role('button', name='Annuler').click(); await page.wait_for_timeout(300)
        # broken or foreign files
        bad = TMP / 'bad.json'; bad.write_text('{"hello": 1}')
        async with page.expect_file_chooser() as fc:
            await page.get_by_role('button', name='Restaurer une sauvegarde').click()
        await (await fc.value).set_files(str(bad)); await page.wait_for_timeout(300)
        check("pas une sauvegarde" in await page.locator('#toast').inner_text(), 'web: foreign file refused')
        # values stored as strings are repaired on restore
        d = json.loads(f.read_text()); d['data']['entries'][0]['m'] = str(d['data']['entries'][0]['m']); d['data']['cats'][0]['color'] = 'x'
        weird = TMP / 'weird.json'; weird.write_text(json.dumps(d))
        async with page.expect_file_chooser() as fc:
            await page.get_by_role('button', name='Restaurer une sauvegarde').click()
        await (await fc.value).set_files(str(weird)); await page.wait_for_timeout(300)
        await page.locator('.sheet').get_by_role('button', name='Restaurer').click(); await page.wait_for_timeout(300)
        check(await page.evaluate("typeof window.__op.S.entries[0].m === 'number' && Number.isInteger(window.__op.S.cats[0].color)"), 'web: restored numbers are numbers')
        # CSV export then import with replace: totals unchanged, no doubles
        async with page.expect_download() as dl:
            await page.get_by_role('button', name='Exporter pour Excel').click()
        c = TMP / 'x.csv'; await (await dl.value).save_as(c)
        before = await page.evaluate("window.__op.metrics ? window.__op.S.entries.reduce((s,e)=>s+e.m,0) : 0")
        await page.get_by_role('button', name='Importer depuis Notes ou Excel').click(); await page.wait_for_timeout(300)
        await page.locator('.sheet textarea').fill(c.read_text(encoding='utf-8'))
        prev = await page.locator('.sheet .note').inner_text()
        check('catégories' in prev and 'Nouvelles' not in prev, 'web: CSV recognised, same categories: ' + prev[:80])
        await page.locator('.sheet').get_by_role('button', name='Importer', exact=True).click(); await page.wait_for_timeout(300)
        after = await page.evaluate("window.__op.S.entries.reduce((s,e)=>s+e.m,0)")
        check(abs(after - before) < 0.02 * before, f'web: CSV round trip keeps totals ({before:.0f} vs {after:.0f} min)')
        # quoted names, title line above the header, BOM
        t = await page.evaluate("""window.__op.parseTable('\\ufeffMon suivi novembre\\nDate;"Révision; cours";Sport\\n05/11/2026;"2,5";1h\\n06/11/2026;1:30;')""")
        check(t and not t.get('error') and t['cols'][0]['name'] == 'Révision; cours' and t['rows'][0]['m'] == 150, 'web: quoted CSV and title line')
        # pasting a backup into the table import restores it
        await page.evaluate("window.__op.replaceState(Object.assign({}, window.__op.S, {cats:[], entries:[], timer:null})); window.__op.go('settings')")
        await page.get_by_role('button', name='Importer depuis Notes ou Excel').click(); await page.wait_for_timeout(300)
        await page.locator('.sheet textarea').fill(f.read_text())
        check('Sauvegarde Outperf reconnue' in await page.locator('.sheet .note').inner_text(), 'web: pasted backup recognised')
        await page.locator('.sheet').get_by_role('button', name='Importer', exact=True).click(); await page.wait_for_timeout(400)
        await page.locator('.sheet').last.get_by_role('button', name='Restaurer').click(); await page.wait_for_timeout(400)
        check(await page.evaluate("window.__op.S.entries.length") == ref['n'], 'web: pasted backup restored')
        await ctx.close()

        # ---------- installed web app on iPhone: no download link, copy sheet instead
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, timezone_id='Europe/Paris',
                                  user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148')
        await ctx.add_init_script("Object.defineProperty(navigator, 'standalone', { get: () => true });")
        page = await ctx.new_page()
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        await page.goto('http://localhost:8781/'); await page.wait_for_timeout(400)
        await page.evaluate("window.__op.loadDemo(true); document.querySelectorAll('.onb').forEach(e=>e.remove()); window.__op.go('settings')")
        url = page.url
        await page.get_by_role('button', name='Sauvegarder').first.click(); await page.wait_for_timeout(400)
        check(page.url == url and await page.locator('.sheet textarea').count() == 1, 'iPhone web app: copy sheet, app not replaced by the file')
        await ctx.close()
        await b.close()

asyncio.run(main())
web.terminate(); nat.terminate()
print('ERRORS', errors)
