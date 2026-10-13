import asyncio, subprocess, sys, time, datetime as dt, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable,'-m','http.server','8773','--bind','127.0.0.1'], cwd='/home/claude/outperf-gh/app/www', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
SH='/home/claude/outperf-gh/app/test/shots/native_'
FAKE_CAP = '''
window.__calls = [];
const rec = (p, m) => (...a) => { window.__calls.push([p, m, JSON.parse(JSON.stringify(a[0] || null))]); return Promise.resolve(window.__ret && window.__ret[p + '.' + m] || {}); };
const store = {};
window.__ret = { 'LocalNotifications.checkPermissions': { display: 'prompt' }, 'LocalNotifications.requestPermissions': { display: 'granted' }, 'Filesystem.writeFile': { uri: 'file:///cache/x.json' } };
const mk = (p, ms) => Object.fromEntries(ms.map(m => [m, rec(p, m)]));
window.Capacitor = { isNativePlatform: () => true, Plugins: {
  Haptics: mk('Haptics', ['impact', 'notification']),
  LocalNotifications: Object.assign(mk('LocalNotifications', ['schedule', 'cancel', 'requestPermissions']), { checkPermissions: () => { window.__calls.push(['LocalNotifications', 'checkPermissions', null]); return Promise.resolve({ display: window.__perm || 'prompt' }); }, requestPermissions: () => { window.__perm = 'granted'; window.__calls.push(['LocalNotifications', 'requestPermissions', null]); return Promise.resolve({ display: 'granted' }); } }),
  KeepAwake: mk('KeepAwake', ['keepAwake', 'allowSleep']),
  Preferences: { get: ({ key }) => Promise.resolve({ value: store[key] || null }), set: ({ key, value }) => { store[key] = value; window.__calls.push(['Preferences', 'set', key]); return Promise.resolve(); }, remove: ({ key }) => { delete store[key]; return Promise.resolve(); } },
  Filesystem: mk('Filesystem', ['writeFile']), Share: mk('Share', ['share']), Browser: mk('Browser', ['open']), StatusBar: mk('StatusBar', ['setStyle']), SplashScreen: mk('SplashScreen', ['hide']),
} };
'''
errors=[]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme='light', timezone_id='Europe/Paris')
        await ctx.add_init_script(FAKE_CAP)
        page = await ctx.new_page()
        page.on('pageerror', lambda e: errors.append(('pageerror', str(e))))
        page.on('console', lambda m: errors.append((m.type, m.text)) if m.type == 'error' else None)
        await page.clock.install(time=dt.datetime(2026,10,13,15,0,0))
        await page.goto('http://localhost:8773/'); await page.wait_for_timeout(600)
        calls = lambda: page.evaluate('window.__calls')
        print('splash hidden:', any(c[0]=='SplashScreen' for c in await calls()), 'statusbar:', [c[2] for c in await calls() if c[0]=='StatusBar'][:1])
        await page.get_by_role('button', name='Commencer').click(); await page.get_by_role('button', name='Continuer').click(); await page.wait_for_timeout(300)
        await page.screenshot(path=SH+'01_onb_reminder.png')
        await page.get_by_role('button', name='Activer le rappel du soir').click(); await page.wait_for_timeout(600)
        print('remind setting:', await page.evaluate('window.__op.S.settings.remind'), '| onboarding gone:', await page.locator('.onb').count() == 0)
        await page.clock.fast_forward(2000); await page.wait_for_timeout(500)
        sched = [c for c in await calls() if c[0]=='LocalNotifications' and c[1]=='schedule']
        print('evening scheduled:', len(sched[-1][2]['notifications']) if sched else 0, 'first:', sched[-1][2]['notifications'][0]['body'] if sched else None)
        # minuteur round -> notification at the end
        await page.locator('#tabs .tab').nth(1).click(); await page.get_by_role('tab', name='Minuteur').click(); await page.get_by_role('button', name='25 min', exact=True).click()
        await page.get_by_role('button', name='Lancer un round de 25 min').click(); await page.wait_for_timeout(600)
        rs = [c for c in await calls() if c[0]=='LocalNotifications' and c[1]=='schedule' and c[2]['notifications'][0]['id']==1001]
        print('round notif:', rs[-1][2]['notifications'][0]['title'] if rs else None, '| keepAwake:', any(c[0]=='KeepAwake' and c[1]=='keepAwake' for c in await calls()), '| haptics:', sum(1 for c in await calls() if c[0]=='Haptics'))
        await page.get_by_role('button', name='Pause').click(); await page.wait_for_timeout(300)
        print('cancel on pause:', any(c[0]=='LocalNotifications' and c[1]=='cancel' and c[2]['notifications'][0]['id']==1001 for c in await calls()))
        await page.get_by_role('button', name='Terminer').click(); await page.wait_for_timeout(300)
        # settings: reminders section, about links, native wording, export via share sheet
        await page.locator('#tabs .tab').nth(4).click(); await page.wait_for_timeout(300)
        await page.screenshot(path=SH+'02_settings.png', full_page=False)
        txt = await page.locator('#app').inner_text()
        print('settings has Rappels:', 'Rappel du soir' in txt, '| no Safari wording:', 'Safari' not in txt, '| à propos:', 'Politique de confidentialité' in txt)
        await page.get_by_role('button', name='Politique de confidentialité').click(); await page.wait_for_timeout(200)
        print('browser open:', [c[2] for c in await calls() if c[0]=='Browser'])
        await page.get_by_role('button', name='Sauvegarder').first.click(); await page.wait_for_timeout(400)
        print('share:', [c[1] for c in await calls() if c[0] in ('Filesystem','Share')])
        print('preferences writes:', sum(1 for c in await calls() if c[0]=='Preferences'))
        # reload: state comes back from Preferences
        n = await page.evaluate('window.__op.S.cats.length')
        await b.close()
asyncio.run(main()); srv.terminate()
print('ERRORS', errors)
